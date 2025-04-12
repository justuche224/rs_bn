import { TransferService } from "../services/transfer.service.js";
const transferService = TransferService.getInstance();
export class TransferController {
    static async getAllTransfers(c) {
        try {
            const user = c.get("user");
            if (!user || user.role !== "ADMIN") {
                return c.json({ error: "Unauthorized: Admin access required" }, 403);
            }
            const transfers = await transferService.getAllTransfers();
            return c.json({ data: transfers }, 200);
        }
        catch (error) {
            console.error("Error getting all transfers:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to get transfers",
            }, 500);
        }
    }
    static async getUserTransfers(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const transfers = await transferService.getUserTransfers(user.id);
            return c.json({ data: transfers }, 200);
        }
        catch (error) {
            console.error("Error getting user transfers:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to get transfers",
            }, 500);
        }
    }
    static async createInternalTransfer(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const { fromCurrency, toCurrency, amount } = await c.req.json();
            if (!fromCurrency || !toCurrency || !amount) {
                return c.json({
                    error: "Missing or invalid fields: fromCurrency, toCurrency, and amount are required",
                }, 400);
            }
            const result = await transferService.createInternalTransfer(user.id, fromCurrency, toCurrency, amount);
            return c.json({ success: true, transfer: result }, 201);
        }
        catch (error) {
            console.error("Error creating internal transfer:", error);
            // Optional: classify known errors if needed
            if (error instanceof Error &&
                ["Insufficient balance", "Cannot transfer to the same currency"].includes(error.message)) {
                return c.json({ error: error.message }, 400);
            }
            return c.json({
                error: error instanceof Error ? error.message : "Failed to create transfer",
            }, 500);
        }
    }
    static async createInterUserTransfer(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const { recipientEmail, currency, amount } = await c.req.json();
            if (!recipientEmail || !currency || !amount) {
                return c.json({
                    error: "Missing required fields: recipientEmail, currency, and amount are required",
                }, 400);
            }
            const result = await transferService.createInterUserTransfer(user.id, recipientEmail, currency, amount);
            return c.json({ success: true, transfer: result }, 201);
        }
        catch (error) {
            console.error("Error creating inter-user transfer:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to create transfer",
            }, 500);
        }
    }
    static async approveTransfer(c) {
        try {
            const user = c.get("user");
            if (!user || user.role !== "ADMIN") {
                return c.json({ error: "Unauthorized: Admin access required" }, 403);
            }
            const transferId = c.req.param("id");
            const result = await transferService.approveTransfer(transferId);
            return c.json(result, 200);
        }
        catch (error) {
            console.error("Error approving transfer:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to approve transfer",
            }, 500);
        }
    }
    static async rejectTransfer(c) {
        try {
            const user = c.get("user");
            if (!user || user.role !== "ADMIN") {
                return c.json({ error: "Unauthorized: Admin access required" }, 403);
            }
            const transferId = c.req.param("id");
            const { rejectionReason } = await c.req.json();
            if (!rejectionReason) {
                return c.json({ error: "Rejection reason is required" }, 400);
            }
            const result = await transferService.rejectTransfer(transferId, rejectionReason);
            return c.json({ success: true, transfer: result }, 200);
        }
        catch (error) {
            console.error("Error rejecting transfer:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to reject transfer",
            }, 500);
        }
    }
}
