import db from "../db/index.js";
import { plans } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
export class PlansService {
    constructor() { }
    static getInstance() {
        if (!PlansService.instance) {
            PlansService.instance = new PlansService();
        }
        return PlansService.instance;
    }
    async createPlan(data) {
        const newPlan = await db.insert(plans).values(Object.assign(Object.assign({}, data), { createdAt: new Date(), updatedAt: new Date() })).returning();
        return { success: true, planId: newPlan[0].id };
    }
    async updatePlan(planId, data) {
        const plan = await db
            .select()
            .from(plans)
            .where(eq(plans.id, planId))
            .limit(1);
        if (!plan.length) {
            throw new Error("Plan not found");
        }
        await db
            .update(plans)
            .set(Object.assign(Object.assign({}, data), { updatedAt: new Date() }))
            .where(eq(plans.id, planId));
        return { success: true };
    }
    async deletePlans(planIds) {
        await db.delete(plans).where(inArray(plans.id, planIds));
        return { success: true, deletedCount: planIds.length };
    }
    async getAllPlans() {
        return await db.select().from(plans).orderBy(plans.createdAt);
    }
    async getPlan(planId) {
        const plan = await db
            .select()
            .from(plans)
            .where(eq(plans.id, planId))
            .limit(1);
        if (!plan.length) {
            throw new Error("Plan not found");
        }
        return plan[0];
    }
}
