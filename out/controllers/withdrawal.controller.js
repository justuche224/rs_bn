import { WithdrawalService } from "../services/withdrawal.service.js";
const withdrawalService = WithdrawalService.getInstance();
export class WithdrawalController {
    static async getAllWithdrawals(c) {
        try {
            const user = c.get("user");
            if (!user || user.role !== "ADMIN") {
                return c.json({ error: "Unauthorized: Admin access required" }, 403);
            }
            const withdrawals = await withdrawalService.getAllWithdrawals();
            return c.json({ data: withdrawals }, 200);
        }
        catch (error) {
            console.error("Error getting all withdrawals:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to get withdrawals",
            }, 500);
        }
    }
    static async createWithdrawal(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const { currency, amount, destinationAddress } = await c.req.json();
            if (!currency || !amount || !destinationAddress) {
                return c.json({
                    error: "Missing required fields: currency, amount, and destinationAddress are required",
                }, 400);
            }
            const result = await withdrawalService.createWithdrawal(user.id, currency, amount, destinationAddress);
            return c.json({ success: true, withdrawal: result }, 201);
        }
        catch (error) {
            console.error("Error creating withdrawal:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to create withdrawal",
            }, 500);
        }
    }
    static async getUserWithdrawals(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const withdrawals = await withdrawalService.getUserWithdrawals(user.id);
            return c.json({ data: withdrawals }, 200);
        }
        catch (error) {
            console.error("Error getting user withdrawals:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to get withdrawals",
            }, 500);
        }
    }
    static async approveWithdrawal(c) {
        try {
            const user = c.get("user");
            if (!user || user.role !== "ADMIN") {
                return c.json({ error: "Unauthorized: Admin access required" }, 403);
            }
            const withdrawalId = c.req.param("id");
            const result = await withdrawalService.approveWithdrawal(withdrawalId);
            return c.json(result, 200);
        }
        catch (error) {
            console.error("Error approving withdrawal:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to approve withdrawal",
            }, 500);
        }
    }
    static async rejectWithdrawal(c) {
        try {
            const user = c.get("user");
            if (!user || user.role !== "ADMIN") {
                return c.json({ error: "Unauthorized: Admin access required" }, 403);
            }
            const withdrawalId = c.req.param("id");
            console.log(withdrawalId);
            const { rejectionReason } = await c.req.json();
            console.log(rejectionReason);
            if (!rejectionReason) {
                return c.json({ error: "Rejection reason is required" }, 400);
            }
            const result = await withdrawalService.rejectWithdrawal(withdrawalId, rejectionReason);
            return c.json({ success: true, withdrawal: result }, 200);
        }
        catch (error) {
            console.error("Error rejecting withdrawal:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to reject withdrawal",
            }, 500);
        }
    }
    static async getUserApprovedWithdrawals(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const withdrawals = await withdrawalService.getUserApprovedWithdrawalsAmount(user.id);
            return c.json({ data: withdrawals }, 200);
        }
        catch (error) {
            console.error("Error getting user approved withdrawals:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to get approved withdrawals",
            }, 500);
        }
    }
}
