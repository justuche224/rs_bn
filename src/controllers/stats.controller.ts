import type { Context } from "hono";
import { DepositService } from "../services/deposit.service.js";
import { WithdrawalService } from "../services/withdrawal.service.js";
import { UserService } from "../services/user.service.js";
import { ProductService } from "../services/product.service.js";
import { InvestmentService } from "../services/investment.service.js";
import { ReferralService } from "../services/referral.service.js";

const depositService = DepositService.getInstance();
const withdrawalService = WithdrawalService.getInstance();
const userService = UserService.getInstance();
const productService = ProductService.getInstance();
const investmentService = InvestmentService.getInstance();
const referralService = ReferralService.getInstance();

export class StatsController {
  static getInvestmentStats(arg0: string, getInvestmentStats: any) {
    throw new Error("Method not implemented.");
  }
  static async getTransactionStats(c: Context) {
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const [
        totalDeposits,
        pendingDeposits,
        approvedDepositsAmount,
        totalWithdrawals,
        pendingWithdrawals,
        approvedWithdrawalsAmount,
      ] = await Promise.all([
        depositService.getTotalDepositsCount(),
        depositService.getPendingDepositsCount(),
        depositService.getApprovedDepositsAmount(),
        withdrawalService.getTotalWithdrawalsCount(),
        withdrawalService.getPendingWithdrawalsCount(),
        withdrawalService.getApprovedWithdrawalsAmount(),
      ]);

      return c.json(
        {
          deposits: {
            total: totalDeposits,
            pending: pendingDeposits,
            approvedAmounts: approvedDepositsAmount,
          },
          withdrawals: {
            total: totalWithdrawals,
            pending: pendingWithdrawals,
            approvedAmounts: approvedWithdrawalsAmount,
          },
        },
        200
      );
    } catch (error) {
      console.error("Error getting transaction stats:", error);
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to get transaction stats",
        },
        500
      );
    }
  }

  static async getUserStats(c: Context) {
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const stats = await userService.getUserStats();
      return c.json(stats, 200);
    } catch (error) {
      console.error("Error getting user stats:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to get user stats",
        },
        500
      );
    }
  }

  static async getProductStats(c: Context) {
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const stats = await productService.getProductStats();
      return c.json(stats, 200);
    } catch (error) {
      console.error("Error getting product stats:", error);
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to get product stats",
        },
        500
      );
    }
  }

  static async getTransactionHistory(c: Context) {
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const [recentDeposits, recentWithdrawals] = await Promise.all([
        depositService.getRecentDeposits(5),
        withdrawalService.getRecentWithdrawals(5),
      ]);

      // Combine and format transactions
      const transactions = [
        ...recentDeposits.map((d) => ({
          id: d.id,
          type: "deposit" as const,
          userId: d.userId,
          currency: d.currency,
          amount: d.amount,
          status: d.status,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          user: d.user,
        })),
        ...recentWithdrawals.map((w) => ({
          id: w.id,
          type: "withdrawal" as const,
          userId: w.userId,
          currency: w.currency,
          amount: w.amount,
          status: w.status,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
          user: w.user,
        })),
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return c.json(
        {
          transactions,
          total: transactions.length,
        },
        200
      );
    } catch (error) {
      console.error("Error getting transaction history:", error);
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to get transaction history",
        },
        500
      );
    }
  }

  static async getUserTransactionHistory(c: Context) {
    try {
      const user = c.get("user");
      const { userId } = c.req.param();

      // Check if user is authorized to view these transactions
      if (!user || (user.id !== userId && user.role !== "ADMIN")) {
        return c.json(
          {
            error:
              "Unauthorized: Can only view your own transactions or must be admin",
          },
          403
        );
      }

      const [userDeposits, userWithdrawals, userInvestments] =
        await Promise.all([
          depositService.getUserDeposits(userId),
          withdrawalService.getUserWithdrawals(userId),
          investmentService.getUserInvestments(userId),
        ]);

      // Combine and format transactions
      const transactions = [
        ...userDeposits.map((d) => ({
          id: d.id,
          type: "deposit" as const,
          userId: d.userId,
          currency: d.currency,
          amount: d.amount,
          status: d.status,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })),
        ...userWithdrawals.map((w) => ({
          id: w.id,
          type: "withdrawal" as const,
          userId: w.userId,
          currency: w.currency,
          amount: w.amount,
          status: w.status,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
        })),
        ...userInvestments.map((i) => ({
          id: i.id,
          type: "investment" as const,
          userId: i.userId,
          currency: i.currency,
          amount: i.amount,
          status: i.status,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
          planId: i.planId,
          currentProfit: i.currentProfit,
          targetProfit: i.targetProfit,
        })),
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return c.json(
        {
          transactions,
          total: transactions.length,
        },
        200
      );
    } catch (error) {
      console.error("Error getting user transaction history:", error);
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to get user transaction history",
        },
        500
      );
    }
  }

  static async getUserReferralStats(c: Context) {
    try {
      const user = c.get("user");
      const { userId } = c.req.param();

      // Check if user is authorized to view these stats
      if (!user || (user.id !== userId && user.role !== "ADMIN")) {
        return c.json(
          {
            error:
              "Unauthorized: Can only view your own referral stats or must be admin",
          },
          403
        );
      }

      const stats = await referralService.getReferralStats(userId);
      return c.json(stats, 200);
    } catch (error) {
      console.error("Error getting user referral stats:", error);
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to get user referral stats",
        },
        500
      );
    }
  }

  // User-specific simple investment stats (only count and total amount)
  static async getUserSimpleInvestmentStats(c: Context) {
    try {
      const user = c.get("user");
      const { userId } = c.req.param();

      // Check if user is authorized to view these stats
      if (!user || (user.id !== userId && user.role !== "ADMIN")) {
        return c.json(
          {
            error:
              "Unauthorized: Can only view your own investment stats or must be admin",
          },
          403
        );
      }

      const stats = await investmentService.getUserSimpleInvestmentStats(
        userId
      );
      return c.json(stats, 200);
    } catch (error) {
      console.error("Error getting user simple investment stats:", error);
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to get user investment stats",
        },
        500
      );
    }
  }
}
