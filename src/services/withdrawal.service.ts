import { eq, desc, sql, and } from "drizzle-orm";
import db from "../db/index.js";
import { withdrawal, user } from "../db/schema.js";
import type { Currency } from "./wallet.service.js";
import { BalanceService } from "./balance.service.js";
import { mailService } from "./mail.service.js";

const balanceService = BalanceService.getInstance();

export class WithdrawalService {
  private static instance: WithdrawalService;
  private constructor() {}

  public static getInstance(): WithdrawalService {
    if (!WithdrawalService.instance) {
      WithdrawalService.instance = new WithdrawalService();
    }
    return WithdrawalService.instance;
  }

  async getAllWithdrawals() {
    return await db
      .select({
        id: withdrawal.id,
        userId: withdrawal.userId,
        currency: withdrawal.currency,
        amount: withdrawal.amount,
        status: withdrawal.status,
        destinationAddress: withdrawal.destinationAddress,
        rejectionReason: withdrawal.rejectionReason,
        approvedAt: withdrawal.approvedAt,
        rejectedAt: withdrawal.rejectedAt,
        createdAt: withdrawal.createdAt,
        updatedAt: withdrawal.updatedAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(withdrawal)
      .leftJoin(user, eq(withdrawal.userId, user.id))
      .orderBy(desc(withdrawal.createdAt));
  }

  async getUserWithdrawals(userId: string) {
    return await db
      .select()
      .from(withdrawal)
      .where(eq(withdrawal.userId, userId))
      .orderBy(desc(withdrawal.createdAt));
  }

  async getWithdrawalById(withdrawalId: string) {
    const withdrawalRecord = await db
      .select()
      .from(withdrawal)
      .where(eq(withdrawal.id, withdrawalId))
      .limit(1);

    return withdrawalRecord[0] || null;
  }

  async createWithdrawal(
    userId: string,
    currency: Currency,
    amount: string,
    destinationAddress: string
  ) {
    // Check if user has sufficient balance in any currency
    const userBalance = await balanceService.getUserBalance(userId, currency);
    console.log(userBalance);
    const balanceAmount = userBalance ? BigInt(userBalance.amount) : BigInt(0);

    if (balanceAmount < BigInt(amount)) {
      throw new Error("Insufficient balance");
    }

    // Create withdrawal record
    const result = await db.insert(withdrawal).values({
      userId,
      currency,
      amount,
      destinationAddress,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Send email notification
    const userRecord = await this.getUserById(userId);
    if (userRecord && userRecord.email) {
      await mailService.sendWithdrawalNotification(
        userRecord.email,
        amount,
        currency,
        "PENDING"
      );
    }

    return result;
  }

  async approveWithdrawal(withdrawalId: string) {
    const withdrawalRecord = await this.getWithdrawalById(withdrawalId);
    if (!withdrawalRecord) {
      throw new Error("Withdrawal not found");
    }

    if (withdrawalRecord.status !== "PENDING") {
      throw new Error(
        `Cannot approve withdrawal with status: ${withdrawalRecord.status}`
      );
    }

    // Start a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Update withdrawal status
      await tx
        .update(withdrawal)
        .set({
          status: "APPROVED",
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(withdrawal.id, withdrawalId));

      // Decrement user balance
      await balanceService.decrementBalance(
        withdrawalRecord.userId,
        withdrawalRecord.currency,
        withdrawalRecord.amount
      );

      return { success: true };
    });

    // Send email notification
    const userRecord = await this.getUserById(withdrawalRecord.userId);
    if (userRecord && userRecord.email) {
      await mailService.sendWithdrawalNotification(
        userRecord.email,
        withdrawalRecord.amount,
        withdrawalRecord.currency,
        "APPROVED"
      );
    }

    return result;
  }

  async rejectWithdrawal(withdrawalId: string, rejectionReason: string) {
    const withdrawalRecord = await this.getWithdrawalById(withdrawalId);
    if (!withdrawalRecord) {
      throw new Error("Withdrawal not found");
    }

    if (withdrawalRecord.status !== "PENDING") {
      throw new Error(
        `Cannot reject withdrawal with status: ${withdrawalRecord.status}`
      );
    }

    const result = await db
      .update(withdrawal)
      .set({
        status: "REJECTED",
        rejectionReason,
        rejectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(withdrawal.id, withdrawalId));

    // Send email notification
    const userRecord = await this.getUserById(withdrawalRecord.userId);
    if (userRecord && userRecord.email) {
      await mailService.sendWithdrawalNotification(
        userRecord.email,
        withdrawalRecord.amount,
        withdrawalRecord.currency,
        "REJECTED",
        rejectionReason
      );
    }

    return result;
  }

  async getTotalWithdrawalsCount() {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(withdrawal);
    return result[0].count;
  }

  async getPendingWithdrawalsCount() {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(withdrawal)
      .where(eq(withdrawal.status, "PENDING"));
    return result[0].count;
  }

  async getApprovedWithdrawalsAmount() {
    const result = await db
      .select({
        currency: withdrawal.currency,
        totalAmount: sql<string>`SUM(${withdrawal.amount}::NUMERIC)`,
      })
      .from(withdrawal)
      .where(eq(withdrawal.status, "APPROVED"))
      .groupBy(withdrawal.currency);
    return result;
  }

  async getRecentWithdrawals(limit: number = 5) {
    return await db
      .select({
        id: withdrawal.id,
        userId: withdrawal.userId,
        currency: withdrawal.currency,
        amount: withdrawal.amount,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt,
        updatedAt: withdrawal.updatedAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(withdrawal)
      .leftJoin(user, eq(withdrawal.userId, user.id))
      .orderBy(desc(withdrawal.createdAt))
      .limit(limit);
  }

  async getUserApprovedWithdrawalsAmount(userId: string) {
    const result = await db
      .select({
        currency: withdrawal.currency,
        totalAmount: sql<string>`SUM(${withdrawal.amount}::NUMERIC)`,
      })
      .from(withdrawal)
      .where(
        and(eq(withdrawal.userId, userId), eq(withdrawal.status, "APPROVED"))
      )
      .groupBy(withdrawal.currency);
    return result;
  }

  // Helper method to get user by ID
  private async getUserById(userId: string) {
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return userRecord[0] || null;
  }
}
