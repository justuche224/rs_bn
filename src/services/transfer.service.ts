import { eq, desc, and, sql } from "drizzle-orm";
import db from "../db/index.js";
import { transfer, user } from "../db/schema.js";
import type { Currency } from "./wallet.service.js";
import { BalanceService } from "./balance.service.js";

const balanceService = BalanceService.getInstance();

export class TransferService {
  private static instance: TransferService;
  private constructor() {}

  public static getInstance(): TransferService {
    if (!TransferService.instance) {
      TransferService.instance = new TransferService();
    }
    return TransferService.instance;
  }

  async getAllTransfers() {
    return await db
      .select({
        id: transfer.id,
        senderId: transfer.senderId,
        recipientId: transfer.recipientId,
        fromCurrency: transfer.fromCurrency,
        toCurrency: transfer.toCurrency,
        amount: transfer.amount,
        type: transfer.type,
        status: transfer.status,
        rejectionReason: transfer.rejectionReason,
        approvedAt: transfer.approvedAt,
        rejectedAt: transfer.rejectedAt,
        createdAt: transfer.createdAt,
        updatedAt: transfer.updatedAt,
        sender: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(transfer)
      .leftJoin(user, eq(transfer.senderId, user.id))
      .orderBy(desc(transfer.createdAt));
  }

  async getUserTransfers(userId: string) {
    return await db
      .select()
      .from(transfer)
      .where(
        and(
          eq(transfer.senderId, userId),
          eq(transfer.status, "APPROVED")
        )
      )
      .orderBy(desc(transfer.createdAt));
  }

  async getTransferById(transferId: string) {
    const transferRecord = await db
      .select()
      .from(transfer)
      .where(eq(transfer.id, transferId))
      .limit(1);

    return transferRecord[0] || null;
  }

  async createInternalTransfer(
    userId: string,
    fromCurrency: Currency,
    toCurrency: Currency,
    amount: string,
  ) {
    // Check if user has sufficient balance
    const userBalance = await balanceService.getUserBalance(userId, fromCurrency);
    if (!userBalance || BigInt(userBalance.amount) < BigInt(amount)) {
      throw new Error("Insufficient balance");
    }

    // Create transfer record
    return await db.insert(transfer).values({
      senderId: userId,
      recipientId: userId,
      fromCurrency,
      toCurrency,
      amount,
      type: "INTERNAL",
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async createInterUserTransfer(
    senderId: string,
    recipientEmail: string,
    currency: Currency,
    amount: string,
  ) {
    // Check if user has sufficient balance
    const senderBalance = await balanceService.getUserBalance(senderId, currency);
    if (!senderBalance || BigInt(senderBalance.amount) < BigInt(amount)) {
      throw new Error("Insufficient balance");
    }

    // Find recipient by email
    const recipientRecord = await db
      .select()
      .from(user)
      .where(eq(user.email, recipientEmail))
      .limit(1);

    const recipient = recipientRecord[0];
    if (!recipient) {
      throw new Error("Recipient not found");
    }

    // Create transfer record
    return await db.insert(transfer).values({
      senderId,
      recipientId: recipient.id,
      fromCurrency: currency,
      toCurrency: currency,
      amount,
      type: "INTER_USER",
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async approveTransfer(transferId: string) {
    const transferRecord = await this.getTransferById(transferId);
    if (!transferRecord) {
      throw new Error("Transfer not found");
    }

    if (transferRecord.status !== "PENDING") {
      throw new Error(`Cannot approve transfer with status: ${transferRecord.status}`);
    }

    // Start a transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Update transfer status
      await tx
        .update(transfer)
        .set({
          status: "APPROVED",
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(transfer.id, transferId));

      // Decrement sender balance
      await balanceService.decrementBalance(
        transferRecord.senderId,
        transferRecord.fromCurrency,
        transferRecord.amount
      );

      // Increment recipient balance
      await balanceService.incrementBalance(
        transferRecord.recipientId,
        transferRecord.toCurrency,
        transferRecord.amount
      );

      return { success: true };
    });
  }

  async rejectTransfer(transferId: string, rejectionReason: string) {
    const transferRecord = await this.getTransferById(transferId);
    if (!transferRecord) {
      throw new Error("Transfer not found");
    }

    if (transferRecord.status !== "PENDING") {
      throw new Error(`Cannot reject transfer with status: ${transferRecord.status}`);
    }

    return await db
      .update(transfer)
      .set({
        status: "REJECTED",
        rejectionReason,
        rejectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transfer.id, transferId));
  }

  async getPendingTransfersCount() {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transfer)
      .where(eq(transfer.status, "PENDING"));
    return result[0].count;
  }

  async getRecentTransfers(limit: number = 5) {
    return await db
      .select({
        id: transfer.id,
        senderId: transfer.senderId,
        recipientId: transfer.recipientId,
        fromCurrency: transfer.fromCurrency,
        toCurrency: transfer.toCurrency,
        amount: transfer.amount,
        type: transfer.type,
        status: transfer.status,
        createdAt: transfer.createdAt,
        sender: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(transfer)
      .leftJoin(user, eq(transfer.senderId, user.id))
      .orderBy(desc(transfer.createdAt))
      .limit(limit);
  }
} 