import type { Context } from "hono";
import { DepositService } from "../services/deposit.service.js";
import type { Currency } from "../services/wallet.service.js";

const depositService = DepositService.getInstance();

export class DepositController {
  static async getAllDeposits(c: Context) {
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const deposits = await depositService.getAllDeposits();
      return c.json({ data: deposits }, 200);
    } catch (error) {
      console.error("Error getting all deposits:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to get deposits",
        },
        500
      );
    }
  }

  static async createDeposit(c: Context) {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized: No user found" }, 401);
      }

      const { systemWalletId, currency, amount } = await c.req.json();

      if (!systemWalletId || !currency || !amount) {
        return c.json(
          {
            error:
              "Missing required fields: systemWalletId, currency, and amount are required",
          },
          400
        );
      }

      const result = await depositService.createDeposit(
        user.id,
        systemWalletId,
        currency,
        amount,
      );

      return c.json({ success: true, deposit: result }, 201);
    } catch (error) {
      console.error("Error creating deposit:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to create deposit",
        },
        500
      );
    }
  }

  static async getUserDeposits(c: Context) {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized: No user found" }, 401);
      }

      const deposits = await depositService.getUserDeposits(user.id);
      return c.json({ data: deposits }, 200);
    } catch (error) {
      console.error("Error getting user deposits:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to get deposits",
        },
        500
      );
    }
  }

  static async approveDeposit(c: Context) {
    console.log("approveDeposit");
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const depositId = c.req.param("id");
      const result = await depositService.approveDeposit(depositId);
      return c.json(result, 200);
    } catch (error) {
      console.error("Error approving deposit:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to approve deposit",
        },
        500
      );
    }
  }

  static async rejectDeposit(c: Context) {
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }
      console.log("rejectDeposit");
      const depositId = c.req.param("id");
      console.log("depositId", depositId);
      const { rejectionReason } = await c.req.json();
      console.log("rejectionReason", rejectionReason);

      if (!rejectionReason) {
        return c.json(
          { error: "Rejection reason is required" },
          400
        );
      }

      const result = await depositService.rejectDeposit(depositId, rejectionReason);
      return c.json({ success: true, deposit: result }, 200);
    } catch (error) {
      console.error("Error rejecting deposit:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to reject deposit",
        },
        500
      );
    }
  }

  static async markDepositAsFailed(c: Context) {
    console.log("markDepositAsFailed");
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const depositId = c.req.param("id");
      const { reason } = await c.req.json();

      if (!reason) {
        return c.json(
          { error: "Failure reason is required" },
          400
        );
      }

      const result = await depositService.markDepositAsFailed(depositId, reason);
      return c.json({ success: true, deposit: result }, 200);
    } catch (error) {
      console.error("Error marking deposit as failed:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to mark deposit as failed",
        },
        500
      );
    }
  }
} 