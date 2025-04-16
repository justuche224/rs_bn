import type { Context } from "hono";
import { BalanceService } from "../services/balance.service.js";
import { eq } from "drizzle-orm";
import type { Currency } from "../services/wallet.service.js";

const balanceService = BalanceService.getInstance();

export class BalanceController {
  static async getUserBalance(c: Context) {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized: No user found" }, 401);
      }

      const currency = c.req.query("currency") as
        | "BTC"
        | "ETH"
        | "USDT"
        | "SOL"
        | "BNB"
        | "LTC";
      if (!currency) {
        return c.json({ error: "Currency parameter is required" }, 400);
      }

      const balance = await balanceService.getUserBalance(user.id, currency);
      if (!balance) {
        return c.json({ error: "Balance not found" }, 404);
      }

      return c.json(balance, 200);
    } catch (error) {
      console.error("Error getting user balance:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to get balance",
        },
        500
      );
    }
  }

  static async getAllUserBalances(c: Context) {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized: No user found" }, 401);
      }

      const balances = await balanceService.getAllUserBalances(user.id);
      return c.json({ data: balances }, 200);
    } catch (error) {
      console.error("Error getting user balances:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to get balances",
        },
        500
      );
    }
  }

  static async getTotalSystemBalance(c: Context) {
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const totalBalances = await balanceService.getTotalSystemBalance();
      return c.json({ data: totalBalances }, 200);
    } catch (error) {
      console.error("Error getting total system balance:", error);
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to get total system balance",
        },
        500
      );
    }
  }

  static async getUserTotalBalance(c: Context) {
    try {
      const requestingUser = c.get("user");
      if (!requestingUser) {
        return c.json({ error: "Unauthorized: No user found" }, 401);
      }

      let targetUserId = requestingUser.id;
      const queryUserId = c.req.query("userId");

      // If a userId is provided in the query string
      if (queryUserId) {
        // Only Admins can request balances for other users
        if (requestingUser.role !== "ADMIN") {
          return c.json(
            { error: "Forbidden: Only admins can query specific user balances" },
            403
          );
        }
        targetUserId = queryUserId;
      }

      // Fetch balances for the target user (either the admin-specified user or the logged-in user)
      const totalBalances = await balanceService.getUserTotalBalance(targetUserId);
      console.log("totalBalances for user", targetUserId, totalBalances);
      return c.json({ data: totalBalances }, 200);
    } catch (error) {
      console.error("Error getting user total balance:", error);
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to get user total balance",
        },
        500
      );
    }
  }

  static async adminAdjustBalance(c: Context) {
    try {
      const adminUser = c.get("user");
      if (!adminUser || adminUser.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const body = await c.req.json();
      const { userId, currency, amount } = body;

      console.log(userId, currency, amount);

      if (!userId || !currency || !amount) {
        return c.json(
          { error: "Missing required fields: userId, currency, amount" },
          400
        );
      }

      // Basic validation for currency enum
      const validCurrencies: Currency[] = ["BTC", "ETH", "USDT", "SOL", "BNB", "LTC"];
      if (!validCurrencies.includes(currency)) {
        return c.json({ error: "Invalid currency" }, 400);
      }

      // Further validation for amount (e.g., ensuring it's a string representing an integer) can be done in the service

      const result = await balanceService.adminAdjustBalance(
        userId,
        currency,
        amount,
        adminUser.id
      );
      return c.json(result, 200);
    } catch (error) {
      console.error("Error adjusting user balance:", error);
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to adjust balance",
        },
        // Use 400 for validation errors, 500 for others
        error instanceof Error &&
        (error.message.includes("Invalid") ||
          error.message.includes("Insufficient") ||
          error.message.includes("Cannot decrease"))
          ? 400
          : 500
      );
    }
  }
}
