import { v4 as uuidv4 } from "uuid";
import { join } from "path";
import { readFile } from "fs/promises";
import sharp from "sharp";
import db from "../db/index.js";
import { kyc, user } from "../db/schema.js";
import { eq, and, or } from "drizzle-orm";
import { config } from "../config/index.js";

export class KYCService {
  private static instance: KYCService;
  private constructor() {}

  public static getInstance(): KYCService {
    if (!KYCService.instance) {
      KYCService.instance = new KYCService();
    }
    return KYCService.instance;
  }

  async uploadKYCImages(
    userId: string,
    frontFile: File,
    backFile: File,
    selfieFile: File,
    documentType: "ID_CARD" | "DRIVERS_LICENSE" | "PASSPORT" | "OTHER"
  ) {
    const files = [
      { file: frontFile, type: "front" },
      { file: backFile, type: "back" },
      { file: selfieFile, type: "selfie" },
    ];

    for (const { file } of files) {
      if (!file.type.startsWith("image/")) {
        throw new Error("All files must be images");
      }
      if (file.size > config.upload.maxFileSize) {
        throw new Error("All files must be under 5MB");
      }
    }

    const existingKYC = await db
      .select()
      .from(kyc)
      .where(and(eq(kyc.userId, userId), eq(kyc.status, "PENDING")));

    if (existingKYC.length > 0) {
      throw new Error("You already have a pending KYC verification");
    }

    const processedImages: Record<string, string> = {};

    for (const { file, type } of files) {
      const filename = `${uuidv4()}-${file.name}`;
      const filepath = join(config.storage.kycImages, filename);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await sharp(buffer)
        .resize(
          config.upload.imageProcessing.maxWidth,
          config.upload.imageProcessing.maxHeight,
          {
            fit: "inside",
          }
        )
        .jpeg({ quality: config.upload.imageProcessing.quality })
        .toFile(filepath);

      processedImages[`${type}Image`] = filename;
    }

    const kycId = uuidv4();
    await db.insert(kyc).values({
      id: kycId,
      userId,
      documentType,
      frontImage: processedImages.frontImage,
      backImage: processedImages.backImage,
      selfieImage: processedImages.selfieImage,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      id: kycId,
      userId,
      documentType,
      status: "PENDING",
      createdAt: new Date(),
    };
  }

  async getKYCImage(filename: string, userId: string, isAdmin: boolean) {
    const kycRecord = await db
      .select()
      .from(kyc)
      .where(
        and(
          or(
            eq(kyc.frontImage, filename),
            eq(kyc.backImage, filename),
            eq(kyc.selfieImage, filename)
          )
        )
      )
      .limit(1);

    if (!kycRecord.length || (kycRecord[0].userId !== userId && !isAdmin)) {
      throw new Error("Unauthorized or file not found");
    }

    const filepath = join(config.storage.kycImages, filename);
    return await readFile(filepath);
  }

  async checkKYCStatus(userId: string) {
    const kycRecord = await db
      .select()
      .from(kyc)
      .where(eq(kyc.userId, userId))
      .orderBy(kyc.createdAt)
      .limit(1);

    return kycRecord.length ? kycRecord[0].status : "NOT_SUBMITTED";
  }

  async updateKYCStatus(
    kycId: string,
    status: "APPROVED" | "REJECTED",
    rejectionReason?: string
  ) {
    if (!["APPROVED", "REJECTED"].includes(status)) {
      throw new Error("Invalid status. Must be APPROVED or REJECTED");
    }

    if (status === "REJECTED" && !rejectionReason) {
      throw new Error("Rejection reason is required when rejecting KYC");
    }

    const kycRecord = await db
      .select()
      .from(kyc)
      .where(eq(kyc.id, kycId))
      .limit(1);

    if (!kycRecord.length) {
      throw new Error("KYC record not found");
    }

    await db
      .update(kyc)
      .set({
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
        updatedAt: new Date(),
      })
      .where(eq(kyc.id, kycId));

    if (status === "APPROVED") {
      await db
        .update(user)
        .set({
          kycVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(user.id, kycRecord[0].userId));
    }

    return { success: true, status };
  }

  async getKYCInfo(userId: string) {
    const kycRecord = await db
      .select()
      .from(kyc)
      .where(eq(kyc.userId, userId))
      .orderBy(kyc.createdAt)
      .limit(1);

    if (!kycRecord.length) {
      return null;
    }

    return {
      id: kycRecord[0].id,
      documentType: kycRecord[0].documentType,
      status: kycRecord[0].status,
      rejectionReason: kycRecord[0].rejectionReason,
      createdAt: kycRecord[0].createdAt,
      updatedAt: kycRecord[0].updatedAt,
      images: {
        front: `${process.env.BASE_URL}/api/kyc/images/${kycRecord[0].frontImage}`,
        back: `${process.env.BASE_URL}/api/kyc/images/${kycRecord[0].backImage}`,
        selfie: `${process.env.BASE_URL}/api/kyc/images/${kycRecord[0].selfieImage}`,
      },
    };
  }

  async getAllKYC() {
    const kycRecords = await db
      .select()
      .from(kyc)
      .orderBy(kyc.createdAt)
      .leftJoin(user, eq(kyc.userId, user.id));

    return kycRecords;
  }
}
