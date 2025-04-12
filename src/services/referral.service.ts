import { eq, and, or } from "drizzle-orm";
import db from "../db/index.js";
import { referrals, user } from "../db/schema.js";
import { BalanceService } from "./balance.service.js";

export class ReferralService {
  private static instance: ReferralService;
  private balanceService: BalanceService;
  
  private constructor() {
    this.balanceService = BalanceService.getInstance();
  }

  public static getInstance(): ReferralService {
    if (!ReferralService.instance) {
      ReferralService.instance = new ReferralService();
    }
    return ReferralService.instance;
  }

  async createReferral(referrerId: string, referreeId: string) {

    const referrer = await db
      .select()
      .from(user)
      .where(eq(user.id, referrerId));

    if (referrer.length === 0) {
      throw new Error("Referrer not found");
    }
    const existingReferral = await db
      .select()
      .from(referrals)
      .where(or(and(eq(referrals.referrerId, referrerId), eq(referrals.referreeId, referreeId)), and(eq(referrals.referrerId, referreeId), eq(referrals.referreeId, referrerId))));

    if (existingReferral.length > 0) {
      throw new Error("Referral already exists");
    }

    await db.insert(referrals).values({
        referrerId,
        referreeId,
        createdAt: new Date(),
    });

    try {
      await this.balanceService.incrementBalance(referrerId, "USDT", "50");
    } catch (error) {
      console.error("Failed to reward referrer:", error);
    }

    return { success: true, message: "Referral created and reward processed" };
  }

  async getReferralsByReferrerId(referrerId: string) {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, referrerId));
  }

  async getReferralsByReferreeId(referreeId: string) {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referreeId, referreeId));
  }

  async getReferralStats(userId: string) {
    const referrals = await this.getReferralsByReferrerId(userId);
    const totalReferrals = referrals.length;
    const totalRewards = (BigInt(totalReferrals) * BigInt(50)).toString();

    return {
      totalReferrals,
      totalRewards,
      currency: "USDT",
    };
  }
}