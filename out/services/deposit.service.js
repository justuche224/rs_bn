import { eq, desc, sql } from "drizzle-orm";
import db from "../db/index.js";
import { deposit, user } from "../db/schema.js";
import { BalanceService } from "./balance.service.js";
import { mailService } from "./mail.service.js";
const balanceService = BalanceService.getInstance();
export class DepositService {
    constructor() { }
    static getInstance() {
        if (!DepositService.instance) {
            DepositService.instance = new DepositService();
        }
        return DepositService.instance;
    }
    async getAllDeposits() {
        return await db
            .select({
            id: deposit.id,
            userId: deposit.userId,
            systemWalletId: deposit.systemWalletId,
            currency: deposit.currency,
            amount: deposit.amount,
            status: deposit.status,
            rejectionReason: deposit.rejectionReason,
            approvedAt: deposit.approvedAt,
            rejectedAt: deposit.rejectedAt,
            createdAt: deposit.createdAt,
            updatedAt: deposit.updatedAt,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        })
            .from(deposit)
            .leftJoin(user, eq(deposit.userId, user.id))
            .orderBy(desc(deposit.createdAt));
    }
    async createDeposit(userId, systemWalletId, currency, amount) {
        const result = await db.insert(deposit).values({
            userId,
            systemWalletId,
            currency,
            amount,
            status: "PENDING",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        // Get user email for notification
        const userRecord = await this.getUserById(userId);
        if (userRecord && userRecord.email) {
            await mailService.sendDepositNotification(userRecord.email, amount, currency, "PENDING");
        }
        return result;
    }
    async getUserDeposits(userId) {
        return await db
            .select()
            .from(deposit)
            .where(eq(deposit.userId, userId))
            .orderBy(desc(deposit.createdAt));
    }
    async getDepositById(depositId) {
        const depositRecord = await db
            .select()
            .from(deposit)
            .where(eq(deposit.id, depositId))
            .limit(1);
        return depositRecord[0] || null;
    }
    async approveDeposit(depositId) {
        const depositRecord = await this.getDepositById(depositId);
        if (!depositRecord) {
            throw new Error("Deposit not found");
        }
        if (depositRecord.status !== "PENDING") {
            throw new Error(`Cannot approve deposit with status: ${depositRecord.status}`);
        }
        // Start a transaction to ensure atomicity
        const result = await db.transaction(async (tx) => {
            // Update deposit status
            await tx
                .update(deposit)
                .set({
                status: "APPROVED",
                approvedAt: new Date(),
                updatedAt: new Date(),
            })
                .where(eq(deposit.id, depositId));
            // Increment user balance
            await balanceService.incrementBalance(depositRecord.userId, depositRecord.currency, depositRecord.amount);
            return { success: true };
        });
        // Send email notification
        const userRecord = await this.getUserById(depositRecord.userId);
        if (userRecord && userRecord.email) {
            await mailService.sendDepositNotification(userRecord.email, depositRecord.amount, depositRecord.currency, "APPROVED");
        }
        return result;
    }
    async rejectDeposit(depositId, rejectionReason) {
        const depositRecord = await this.getDepositById(depositId);
        if (!depositRecord) {
            throw new Error("Deposit not found");
        }
        if (depositRecord.status !== "PENDING") {
            throw new Error(`Cannot reject deposit with status: ${depositRecord.status}`);
        }
        const result = await db
            .update(deposit)
            .set({
            status: "REJECTED",
            rejectionReason,
            rejectedAt: new Date(),
            updatedAt: new Date(),
        })
            .where(eq(deposit.id, depositId));
        // Send email notification
        const userRecord = await this.getUserById(depositRecord.userId);
        if (userRecord && userRecord.email) {
            await mailService.sendDepositNotification(userRecord.email, depositRecord.amount, depositRecord.currency, "REJECTED");
        }
        return result;
    }
    async markDepositAsFailed(depositId, reason) {
        const depositRecord = await this.getDepositById(depositId);
        if (!depositRecord) {
            throw new Error("Deposit not found");
        }
        if (depositRecord.status !== "PENDING") {
            throw new Error(`Cannot mark as failed deposit with status: ${depositRecord.status}`);
        }
        const result = await db
            .update(deposit)
            .set({
            status: "FAILED",
            rejectionReason: reason,
            rejectedAt: new Date(),
            updatedAt: new Date(),
        })
            .where(eq(deposit.id, depositId));
        // Send email notification
        const userRecord = await this.getUserById(depositRecord.userId);
        if (userRecord && userRecord.email) {
            await mailService.sendDepositNotification(userRecord.email, depositRecord.amount, depositRecord.currency, "FAILED");
        }
        return result;
    }
    async getTotalDepositsCount() {
        const result = await db
            .select({ count: sql `count(*)` })
            .from(deposit);
        return result[0].count;
    }
    async getPendingDepositsCount() {
        const result = await db
            .select({ count: sql `count(*)` })
            .from(deposit)
            .where(eq(deposit.status, "PENDING"));
        return result[0].count;
    }
    async getApprovedDepositsAmount() {
        const result = await db
            .select({
            currency: deposit.currency,
            totalAmount: sql `SUM(${deposit.amount})`,
        })
            .from(deposit)
            .where(eq(deposit.status, "APPROVED"))
            .groupBy(deposit.currency);
        return result;
    }
    async getRecentDeposits(limit = 5) {
        return await db
            .select({
            id: deposit.id,
            userId: deposit.userId,
            currency: deposit.currency,
            amount: deposit.amount,
            status: deposit.status,
            createdAt: deposit.createdAt,
            updatedAt: deposit.updatedAt,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        })
            .from(deposit)
            .leftJoin(user, eq(deposit.userId, user.id))
            .orderBy(desc(deposit.createdAt))
            .limit(limit);
    }
    // Helper method to get user by ID
    async getUserById(userId) {
        const userRecord = await db
            .select()
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);
        return userRecord[0] || null;
    }
}
