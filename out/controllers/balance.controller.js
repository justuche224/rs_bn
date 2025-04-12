import { BalanceService } from "../services/balance.service.js";
const balanceService = BalanceService.getInstance();
export class BalanceController {
    static async getUserBalance(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const currency = c.req.query("currency");
            if (!currency) {
                return c.json({ error: "Currency parameter is required" }, 400);
            }
            const balance = await balanceService.getUserBalance(user.id, currency);
            if (!balance) {
                return c.json({ error: "Balance not found" }, 404);
            }
            return c.json(balance, 200);
        }
        catch (error) {
            console.error("Error getting user balance:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to get balance",
            }, 500);
        }
    }
    static async getAllUserBalances(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const balances = await balanceService.getAllUserBalances(user.id);
            return c.json({ data: balances }, 200);
        }
        catch (error) {
            console.error("Error getting user balances:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to get balances",
            }, 500);
        }
    }
    static async getTotalSystemBalance(c) {
        try {
            const user = c.get("user");
            if (!user || user.role !== "ADMIN") {
                return c.json({ error: "Unauthorized: Admin access required" }, 403);
            }
            const totalBalances = await balanceService.getTotalSystemBalance();
            return c.json({ data: totalBalances }, 200);
        }
        catch (error) {
            console.error("Error getting total system balance:", error);
            return c.json({
                error: error instanceof Error
                    ? error.message
                    : "Failed to get total system balance",
            }, 500);
        }
    }
    static async getUserTotalBalance(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const totalBalances = await balanceService.getUserTotalBalance(user.id);
            return c.json({ data: totalBalances }, 200);
        }
        catch (error) {
            console.error("Error getting user total balance:", error);
            return c.json({
                error: error instanceof Error
                    ? error.message
                    : "Failed to get user total balance",
            }, 500);
        }
    }
}
