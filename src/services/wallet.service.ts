import { v4 as uuidv4 } from "uuid";
import { join } from "path";
import { readFile, unlink } from "fs/promises";
import sharp from "sharp";
import db from "../db/index.js";
import { systemWallet, userWallet } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { config } from "../config/index.js";

export type Currency = "BTC" | "ETH" | "USDT" | "SOL" | "BNB" | "LTC";

export class WalletService {
  private static instance: WalletService;
  private constructor() {}

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  // System Wallet Methods
  async uploadSystemWallet(
    currency: Currency,
    address: string,
    qrCodeFile: File
  ) {
    if (!qrCodeFile.type.startsWith("image/")) {
      throw new Error("QR code must be an image");
    }
    if (qrCodeFile.size > config.upload.maxFileSize) {
      throw new Error("QR code must be under 5MB");
    }

    const existingWallet = await db
      .select()
      .from(systemWallet)
      .where(
        and(
          eq(systemWallet.currency, currency),
          eq(systemWallet.isActive, true)
        )
      );

    if (existingWallet.length > 0) {
      throw new Error(`Active system wallet already exists for ${currency}`);
    }

    const filename = `${uuidv4()}-${qrCodeFile.name}`;
    const filepath = join(config.storage.walletImages, filename);

    const arrayBuffer = await qrCodeFile.arrayBuffer();
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

    const walletId = uuidv4();
    await db.insert(systemWallet).values({
      id: walletId,
      currency,
      address,
      qrCode: filename,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      id: walletId,
      currency,
      address,
      createdAt: new Date(),
    };
  }

  async getSystemWalletQRCode(filename: string) {
    const walletRecord = await db
      .select()
      .from(systemWallet)
      .where(eq(systemWallet.qrCode, filename))
      .limit(1);

    if (!walletRecord.length) {
      throw new Error("System wallet not found");
    }

    const filepath = join(config.storage.walletImages, filename);
    return await readFile(filepath);
  }

  async getSystemWalletInfo(currency: Currency) {
    const walletRecord = await db
      .select()
      .from(systemWallet)
      .where(
        and(
          eq(systemWallet.currency, currency),
          eq(systemWallet.isActive, true)
        )
      )
      .limit(1);

    if (!walletRecord.length) {
      return null;
    }

    return {
      id: walletRecord[0].id,
      currency: walletRecord[0].currency,
      address: walletRecord[0].address,
      createdAt: walletRecord[0].createdAt,
      updatedAt: walletRecord[0].updatedAt,
      qrCode: `${process.env.BASE_URL}/api/wallet/system/qr/${walletRecord[0].qrCode}`,
    };
  }

  async getAllSystemWallets() {
    const walletRecords = await db
      .select()
      .from(systemWallet)
      .where(eq(systemWallet.isActive, true))
      .orderBy(systemWallet.currency);

    return walletRecords.map(record => ({
      id: record.id,
      currency: record.currency,
      address: record.address,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      qrCode: `${process.env.BASE_URL}/api/wallet/system/qr/${record.qrCode}`,
    }));
  }

  async updateSystemWallet(
    walletId: string,
    currency: Currency,
    address: string,
    qrCodeFile?: File
  ) {
    const existingWallet = await db
      .select()
      .from(systemWallet)
      .where(eq(systemWallet.id, walletId))
      .limit(1);

    if (!existingWallet.length) {
      throw new Error("System wallet not found");
    }

    let qrCodeFilename = existingWallet[0].qrCode;

    if (qrCodeFile) {
      if (!qrCodeFile.type.startsWith("image/")) {
        throw new Error("QR code must be an image");
      }
      if (qrCodeFile.size > config.upload.maxFileSize) {
        throw new Error("QR code must be under 5MB");
      }

      // Delete old QR code file
      const oldFilepath = join(config.storage.walletImages, qrCodeFilename);
      try {
        await unlink(oldFilepath);
      } catch (error) {
        console.error("Error deleting old QR code:", error);
      }

      // Save new QR code file
      qrCodeFilename = `${uuidv4()}-${qrCodeFile.name}`;
      const newFilepath = join(config.storage.walletImages, qrCodeFilename);

      const arrayBuffer = await qrCodeFile.arrayBuffer();
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
        .toFile(newFilepath);
    }

    await db
      .update(systemWallet)
      .set({
        currency,
        address,
        qrCode: qrCodeFilename,
        updatedAt: new Date(),
      })
      .where(eq(systemWallet.id, walletId));

    return {
      id: walletId,
      currency,
      address,
      updatedAt: new Date(),
    };
  }

  async deleteSystemWallet(walletId: string) {
    const existingWallet = await db
      .select()
      .from(systemWallet)
      .where(eq(systemWallet.id, walletId))
      .limit(1);

    if (!existingWallet.length) {
      throw new Error("System wallet not found");
    }

    // Delete QR code file
    const filepath = join(config.storage.walletImages, existingWallet[0].qrCode);
    try {
      await unlink(filepath);
    } catch (error) {
      console.error("Error deleting QR code:", error);
    }

    await db
      .delete(systemWallet)
      .where(eq(systemWallet.id, walletId));

    return { success: true };
  }

  // User Wallet Methods
  async createUserWallet(
    userId: string,
    currency: Currency,
    address: string
  ) {
    // Check if user already has a wallet with this currency
    const existingWallet = await db
      .select()
      .from(userWallet)
      .where(
        and(
          eq(userWallet.userId, userId),
          eq(userWallet.currency, currency)
        )
      );

    if (existingWallet.length > 0) {
      throw new Error(`You already have a ${currency} wallet registered`);
    }

    const walletId = uuidv4();
    await db.insert(userWallet).values({
      id: walletId,
      userId,
      currency,
      address,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      id: walletId,
      userId,
      currency,
      address,
      createdAt: new Date(),
    };
  }

  async getUserWalletInfo(userId: string) {
    const walletRecords = await db
      .select()
      .from(userWallet)
      .where(eq(userWallet.userId, userId));

    if (!walletRecords.length) {
      return [];
    }

    return walletRecords.map(record => ({
      id: record.id,
      userId: record.userId,
      currency: record.currency,
      address: record.address,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }

  async deleteUserWallet(walletId: string, userId: string, isAdmin: boolean) {
    const existingWallet = await db
      .select()
      .from(userWallet)
      .where(eq(userWallet.id, walletId))
      .limit(1);

    if (!existingWallet.length) {
      throw new Error("User wallet not found");
    }

    // Only allow deletion if user is admin or owns the wallet
    if (!isAdmin && existingWallet[0].userId !== userId) {
      throw new Error("Unauthorized: You can only delete your own wallet");
    }

    await db
      .delete(userWallet)
      .where(eq(userWallet.id, walletId));

    return { success: true };
  }
}
