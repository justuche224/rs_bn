import db from "../db/index.js";
import { plans } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
export class PlansService {
    constructor() { }
    static getInstance() {
        if (!PlansService.instance) {
            PlansService.instance = new PlansService();
        }
        return PlansService.instance;
    }
    async createPlan(data) {
        const newPlan = await db.insert(plans).values(Object.assign(Object.assign({ id: uuidv4() }, data), { createdAt: new Date(), updatedAt: new Date() }));
        return { success: true, planId: newPlan[0].insertId };
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
