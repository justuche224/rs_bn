import db from "../db/index.js";
import { plans } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";

export class PlansService {
  private static instance: PlansService;
  private constructor() {}

  public static getInstance(): PlansService {
    if (!PlansService.instance) {
      PlansService.instance = new PlansService();
    }
    return PlansService.instance;
  }

  async createPlan(data: {
    type: string;
    price: number;
    minRoiAmount: number;
    maxRoiAmount: number;
    commission: number;
    percentage: number;
    duration: number;
    description: string;
  }) {
    const newPlan = await db.insert(plans).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return { success: true, planId: newPlan[0].id };
  }

  async updatePlan(
    planId: string,
    data: Partial<{
      type: string;
      price: number;
      minRoiAmount: number;
      maxRoiAmount: number;
      commission: number;
      percentage: number;
      duration: number;
      description: string;
    }>
  ) {
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
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(plans.id, planId));

    return { success: true };
  }

  async deletePlans(planIds: string[]) {
    await db.delete(plans).where(inArray(plans.id, planIds));
    return { success: true, deletedCount: planIds.length };
  }

  async getAllPlans() {
    return await db.select().from(plans).orderBy(plans.createdAt);
  }

  async getPlan(planId: string) {
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
