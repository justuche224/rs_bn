import { PlansService } from "../services/plans.service.js";
const plansService = PlansService.getInstance();
export class PlansController {
    static async createPlan(c) {
        try {
            const { type, price, minRoiAmount, maxRoiAmount, commission, percentage, duration, description } = await c.req.json();
            // Validate required fields
            if (!type || !price || !minRoiAmount || !maxRoiAmount || !commission || !percentage || !duration || !description) {
                return c.json({ error: "All fields are required" }, 400);
            }
            const result = await plansService.createPlan({
                type,
                price,
                minRoiAmount,
                maxRoiAmount,
                commission,
                percentage,
                duration,
                description,
            });
            return c.json(result, 201);
        }
        catch (error) {
            console.error("Error creating plan:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to create plan",
            }, 500);
        }
    }
    static async updatePlan(c) {
        try {
            const planId = c.req.param("id");
            const updateData = await c.req.json();
            console.log(updateData);
            if (Object.keys(updateData).length === 0) {
                return c.json({ error: "No fields to update" }, 400);
            }
            const result = await plansService.updatePlan(planId, updateData);
            return c.json(result, 200);
        }
        catch (error) {
            console.error("Error updating plan:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to update plan",
            }, error instanceof Error && error.message.includes("not found") ? 404 : 500);
        }
    }
    static async deletePlans(c) {
        try {
            const { planIds } = await c.req.json();
            if (!Array.isArray(planIds) || planIds.length === 0) {
                return c.json({ error: "planIds must be a non-empty array" }, 400);
            }
            const result = await plansService.deletePlans(planIds);
            return c.json(result, 200);
        }
        catch (error) {
            console.error("Error deleting plans:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to delete plans",
            }, 500);
        }
    }
    static async getAllPlans(c) {
        try {
            const plans = await plansService.getAllPlans();
            return c.json({ data: plans }, 200);
        }
        catch (error) {
            console.error("Error getting plans:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to get plans",
            }, 500);
        }
    }
    static async getPlan(c) {
        try {
            const planId = c.req.param("id");
            const plan = await plansService.getPlan(planId);
            return c.json(plan, 200);
        }
        catch (error) {
            console.error("Error getting plan:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to get plan",
            }, error instanceof Error && error.message.includes("not found") ? 404 : 500);
        }
    }
}
