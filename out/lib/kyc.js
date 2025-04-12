import { v4 as uuidv4 } from "uuid";
import { join } from "path";
import { readFile } from "fs/promises";
import sharp from "sharp";
import db from "../db/index.js";
import { kyc, user } from "../db/schema.js";
import { eq, and, or } from "drizzle-orm";
// REM Define storage path (directory exists and is not publicly accessible) storage/kyc-images
const KYC_STORAGE_PATH = join(process.cwd(), "storage", "kyc-images");
export async function uploadKYCImage(c) {
    try {
        const user = c.get("user");
        if (!user) {
            return c.json({ error: "Unauthorized: No user found" }, 401);
        }
        const formData = await c.req.formData();
        const frontFile = formData.get("front");
        const backFile = formData.get("back");
        const selfieFile = formData.get("selfie");
        const documentType = formData.get("documentType");
        const userId = formData.get("userId");
        if (!frontFile || !backFile || !selfieFile || !documentType || !userId) {
            return c.json({
                error: "Missing required fields: front, back, selfie images, documentType, and userId are required",
            }, 400);
        }
        if (userId !== user.id) {
            return c.json({ error: "Unauthorized: User ID mismatch" }, 401);
        }
        const existingKYC = await db
            .select()
            .from(kyc)
            .where(and(eq(kyc.userId, userId), eq(kyc.status, "PENDING")));
        if (existingKYC.length > 0) {
            return c.json({ error: "You already have a pending KYC verification" }, 400);
        }
        const files = [
            { file: frontFile, type: "front" },
            { file: backFile, type: "back" },
            { file: selfieFile, type: "selfie" },
        ];
        for (const { file } of files) {
            if (!file.type.startsWith("image/")) {
                return c.json({ error: "All files must be images" }, 400);
            }
            if (file.size > 5 * 1024 * 1024) {
                return c.json({ error: "All files must be under 5MB" }, 400);
            }
        }
        const processedImages = {};
        for (const { file, type } of files) {
            const filename = `${uuidv4()}-${file.name}`;
            const filepath = join(KYC_STORAGE_PATH, filename);
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await sharp(buffer)
                .resize(800, 800, { fit: "inside" })
                .jpeg({ quality: 80 })
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
        return c.json({
            success: true,
            kyc: {
                id: kycId,
                userId,
                documentType,
                status: "PENDING",
                createdAt: new Date(),
            },
        }, 201);
    }
    catch (error) {
        console.error("Error uploading KYC images:", error);
        return c.json({ error: "Failed to upload images" }, 500);
    }
}
export async function serveKYCImage(c) {
    try {
        const filename = c.req.param("filename");
        const user = c.get("user");
        const userId = user === null || user === void 0 ? void 0 : user.id;
        if (!userId) {
            return c.json({ error: "Unauthorized: No user ID found" }, 401);
        }
        const kycRecord = await db
            .select()
            .from(kyc)
            .where(and(
        // eq(kyc.userId, userId),
        or(eq(kyc.frontImage, filename), eq(kyc.backImage, filename), eq(kyc.selfieImage, filename))))
            .limit(1);
        if (kycRecord[0].userId !== userId && user.role !== "ADMIN") {
            return new Response("Unauthorized or file not found", { status: 401 });
        }
        const filepath = join(KYC_STORAGE_PATH, filename);
        const fileBuffer = await readFile(filepath);
        return new Response(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": "image/jpeg",
            },
        });
    }
    catch (error) {
        console.error("Error serving KYC image:", error);
        return new Response("File not found", { status: 404 });
    }
}
export async function checkKYCStatus(c) {
    console.log("Checking KYC status");
    try {
        const user = c.get("user");
        if (!user) {
            return c.json({ error: "Unauthorized: No user found" }, 401);
        }
        const kycRecord = await db
            .select()
            .from(kyc)
            .where(eq(kyc.userId, user.id))
            .orderBy(kyc.createdAt)
            .limit(1);
        if (!kycRecord.length) {
            return c.json({ status: "NOT_SUBMITTED" }, 200);
        }
        return c.json({ status: kycRecord[0].status }, 200);
    }
    catch (error) {
        console.error("Error checking KYC status:", error);
        return c.json({ error: "Failed to check KYC status" }, 500);
    }
}
export async function updateKYCStatus(c) {
    try {
        const userInfo = c.get("user");
        if (!userInfo) {
            return c.json({ error: "Unauthorized: No user found" }, 401);
        }
        if (userInfo.role !== "ADMIN") {
            return c.json({ error: "Unauthorized: Admin access required" }, 403);
        }
        const { kycId, status, rejectionReason } = await c.req.json();
        if (!kycId || !status) {
            return c.json({ error: "Missing required fields: kycId and status are required" }, 400);
        }
        if (!["APPROVED", "REJECTED"].includes(status)) {
            return c.json({ error: "Invalid status. Must be APPROVED or REJECTED" }, 400);
        }
        if (status === "REJECTED" && !rejectionReason) {
            return c.json({ error: "Rejection reason is required when rejecting KYC" }, 400);
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
                .where(eq(user.id, user.id));
        }
        return c.json({ success: true, status }, 200);
    }
    catch (error) {
        console.error("Error updating KYC status:", error);
        return c.json({ error: "Failed to update KYC status" }, 500);
    }
}
export async function getKYCInfo(c) {
    try {
        const user = c.get("user");
        if (!user) {
            return c.json({ error: "Unauthorized: No user found" }, 401);
        }
        const kycRecord = await db
            .select()
            .from(kyc)
            .where(eq(kyc.userId, user.id))
            .orderBy(kyc.createdAt)
            .limit(1);
        if (!kycRecord.length) {
            return c.json({
                status: "NOT_SUBMITTED",
                message: "No KYC submission found",
            }, 200);
        }
        const record = kycRecord[0];
        return c.json({
            id: record.id,
            documentType: record.documentType,
            status: record.status,
            rejectionReason: record.rejectionReason,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            images: {
                front: `${process.env.BASE_URL}/api/kyc/images/${record.frontImage}`,
                back: `${process.env.BASE_URL}/api/kyc/images/${record.backImage}`,
                selfie: `${process.env.BASE_URL}/api/kyc/images/${record.selfieImage}`,
            },
        }, 200);
    }
    catch (error) {
        console.error("Error getting KYC info:", error);
        return c.json({ error: "Failed to get KYC information" }, 500);
    }
}
export const getAllKYC = async (c) => {
    try {
        const userInfo = c.get("user");
        if (!userInfo) {
            return c.json({ error: "Unauthorized: No user found" }, 401);
        }
        if (userInfo.role !== "ADMIN") {
            return c.json({ error: "Unauthorized: Admin access required" }, 403);
        }
        const kycRecords = await db
            .select()
            .from(kyc)
            .orderBy(kyc.createdAt)
            .leftJoin(user, eq(kyc.userId, user.id));
        return c.json({
            success: true,
            data: kycRecords,
        });
    }
    catch (error) {
        console.error("Error fetching KYC records:", error);
        return c.json({
            success: false,
            error: "Failed to fetch KYC records",
        }, 500);
    }
};
