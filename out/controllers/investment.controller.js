import { InvestmentService } from "../services/investment.service.js";
import { z } from "zod";
const investmentService = InvestmentService.getInstance();
// Input validation schemas
const createInvestmentSchema = z.object({
    planId: z.string().uuid("Invalid Plan ID format"),
    currency: z.enum(["BTC", "ETH", "USDT", "SOL", "BNB", "LTC"], {
        required_error: "Currency is required",
        invalid_type_error: "Invalid currency type",
    }),
});
const updateStatusSchema = z.object({
    status: z.enum(["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"], {
        required_error: "Status is required",
        invalid_type_error: "Invalid status value",
    }),
});
const uuidSchema = z.string().uuid("Invalid ID format");
export class InvestmentController {
    static async createInvestment(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const body = await c.req.json();
            const validationResult = createInvestmentSchema.safeParse(body);
            if (!validationResult.success) {
                return c.json({
                    error: "Invalid input",
                    details: validationResult.error.flatten().fieldErrors,
                }, 400);
            }
            const { planId, currency } = validationResult.data;
            const investment = await investmentService.createInvestment(user.id, planId, currency);
            return c.json({ data: investment }, 201);
        }
        catch (error) {
            console.error("Error creating investment:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to create investment";
            const statusCode = errorMessage.includes("Insufficient") ||
                errorMessage.includes("not found")
                ? 400
                : errorMessage.includes("denied")
                    ? 403
                    : 500;
            return c.json({ error: errorMessage }, statusCode);
        }
    }
    static async updateInvestmentStatus(c) {
        try {
            const user = c.get("user");
            if (!user || user.role !== "ADMIN") {
                return c.json({ error: "Forbidden: Admin access required" }, 403);
            }
            const investmentId = c.req.param("id");
            const idValidation = uuidSchema.safeParse(investmentId);
            if (!idValidation.success) {
                return c.json({ error: "Invalid Investment ID format" }, 400);
            }
            const body = await c.req.json();
            const validationResult = updateStatusSchema.safeParse(body);
            if (!validationResult.success) {
                return c.json({
                    error: "Invalid input",
                    details: validationResult.error.flatten().fieldErrors,
                }, 400);
            }
            const { status } = validationResult.data;
            await investmentService.updateInvestmentStatus(idValidation.data, status);
            return c.json({ message: "Investment status updated successfully" }, 200);
        }
        catch (error) {
            console.error("Error updating investment status:", error);
            const errorMessage = error instanceof Error
                ? error.message
                : "Failed to update investment status";
            const statusCode = errorMessage.includes("not found") ? 404 : 500;
            return c.json({ error: errorMessage }, statusCode);
        }
    }
    static async getInvestmentById(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const investmentId = c.req.param("id");
            const idValidation = uuidSchema.safeParse(investmentId);
            if (!idValidation.success) {
                return c.json({ error: "Invalid Investment ID format" }, 400);
            }
            let investment;
            try {
                if (user.role === "ADMIN") {
                    investment = await investmentService.getInvestmentById(idValidation.data);
                }
                else {
                    investment = await investmentService.getInvestmentById(idValidation.data, user.id);
                }
            }
            catch (error) {
                if (error instanceof Error && error.message.includes("Access denied")) {
                    return c.json({ error: "Forbidden: Access denied" }, 403);
                }
                throw error;
            }
            if (!investment) {
                return c.json({ error: "Investment not found" }, 404);
            }
            return c.json({ data: investment }, 200);
        }
        catch (error) {
            console.error("Error getting investment by ID:", error);
            return c.json({ error: "Failed to get investment" }, 500);
        }
    }
    static async getUserInvestments(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            let targetUserId = user.id;
            if (user.role === "ADMIN") {
                const queryUserId = c.req.query("userId");
                if (queryUserId) {
                    const idValidation = uuidSchema.safeParse(queryUserId);
                    if (!idValidation.success) {
                        return c.json({ error: "Invalid userId query parameter format" }, 400);
                    }
                    targetUserId = idValidation.data;
                }
            }
            const investments = await investmentService.getUserInvestments(targetUserId);
            return c.json({ data: investments }, 200);
        }
        catch (error) {
            console.error("Error getting user investments:", error);
            return c.json({
                error: error instanceof Error
                    ? error.message
                    : "Failed to get user investments",
            }, 500);
        }
    }
    static async getAllInvestments(c) {
        try {
            const user = c.get("user");
            if (!user || user.role !== "ADMIN") {
                return c.json({ error: "Forbidden: Admin access required" }, 403);
            }
            const investments = await investmentService.getAllInvestments();
            return c.json({ data: investments }, 200);
        }
        catch (error) {
            console.error("Error getting all investments:", error);
            return c.json({
                error: error instanceof Error
                    ? error.message
                    : "Failed to get all investments",
            }, 500);
        }
    }
}
