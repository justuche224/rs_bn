import { eq, and, desc, inArray } from "drizzle-orm";
import db from "../db/index.js";
import { investments, plans, user } from "../db/schema.js";
import { BalanceService } from "./balance.service.js";
import { PlansService } from "./plans.service.js";
import type { Currency } from "./wallet.service.js";
import { mailService } from "./mail.service.js";
import { v4 as uuidv4 } from "uuid";

const balanceService = BalanceService.getInstance();
const plansService = PlansService.getInstance();

export class InvestmentService {
  private static instance: InvestmentService;
  private constructor() {}

  public static getInstance(): InvestmentService {
    if (!InvestmentService.instance) {
      InvestmentService.instance = new InvestmentService();
    }
    return InvestmentService.instance;
  }

  async createInvestment(userId: string, planId: string, currency: Currency) {
    // 1. Get plan details
    const plan = await plansService.getPlan(planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // 2. Check user balance
    const userBalance = await balanceService.getUserBalance(userId, currency);
    const planPriceString = plan.price.toString(); // Convert plan price to string for BigInt comparison

    if (!userBalance || BigInt(userBalance.amount) < BigInt(planPriceString)) {
      throw new Error(`Insufficient ${currency} balance`);
    }

    // 3. Decrement user balance (Consider using a transaction here for atomicity)
    await balanceService.decrementBalance(userId, currency, planPriceString);

    // 4. Create investment record
    // --- TODO: Implement actual profit calculation logic ---
    const calculatedTargetProfit = plan.maxRoiAmount; // Example: Using max ROI as target
    const calculatedNoOfROI = plan.duration; // Example: Using plan duration
    const calculatedProfitPercent = plan.percentage; // Example: Using plan percentage
    const calculatedNextProfit = 0; // Example: Needs logic based on schedule
    // --- End TODO ---

    const newInvestment = {
      id: uuidv4(),
      userId,
      planId,
      currency,
      txn: `txn_${uuidv4()}`, // Generate a unique transaction ID
      amount: plan.price,
      targetProfit: calculatedTargetProfit,
      currentProfit: 0, // Starts at 0
      status: "ACTIVE" as const, // Start as active
      noOfROI: calculatedNoOfROI,
      profitPercent: calculatedProfitPercent,
      nextProfit: calculatedNextProfit,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(investments).values(newInvestment);

    // Send email notification
    const userRecord = await this.getUserById(userId);
    if (userRecord && userRecord.email) {
      await mailService.sendInvestmentNotification(
        userRecord.email,
        plan.price.toString(),
        plan.type,
        currency,
        "ACTIVE"
      );
    }

    // Return the created investment object (including ID)
    const created = await this.getInvestmentById(newInvestment.id);
    return created;
  }

  async updateInvestmentStatus(
    investmentId: string,
    status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  ) {
    const investment = await this.getInvestmentById(investmentId);
    if (!investment) {
      throw new Error("Investment not found");
    }

    const result = await db
      .update(investments)
      .set({ status, updatedAt: new Date() })
      .where(eq(investments.id, investmentId));

    if (result[0].affectedRows === 0) {
      throw new Error("Investment not found or status unchanged");
    }

    // Get plan details for the notification
    const plan = await plansService.getPlan(investment.planId);

    // Send email notification
    const userRecord = await this.getUserById(investment.userId);
    if (userRecord && userRecord.email && plan) {
      await mailService.sendInvestmentNotification(
        userRecord.email,
        investment.amount.toString(),
        plan.type,
        investment.currency,
        status
      );
    }

    return { success: true };
  }

  async getInvestmentById(investmentId: string, userId?: string) {
    const result = await db
      .select()
      .from(investments)
      .where(eq(investments.id, investmentId))
      .limit(1);

    const investment = result[0];

    if (!investment) {
      return null;
    }

    // If userId is provided (non-admin request), check ownership
    if (userId && investment.userId !== userId) {
      // Throw or return null based on desired behavior for unauthorized access
      throw new Error("Access denied: Investment does not belong to user");
      // return null;
    }

    return investment;
  }

  async getUserInvestments(userId: string) {
    return await db
      .select()
      .from(investments)
      .where(eq(investments.userId, userId))
      .orderBy(desc(investments.createdAt));
  }

  async getAllInvestments() {
    // Consider adding pagination (e.g., limit, offset) for large datasets
    // TODO: Add pagination logic
    return await db
      .select({
        // Select specific fields instead of '*' for performance and clarity
        id: investments.id,
        userId: investments.userId,
        planId: investments.planId,
        currency: investments.currency,
        amount: investments.amount,
        status: investments.status,
        createdAt: investments.createdAt,
        userName: user.name,
        userEmail: user.email,
        planType: plans.type,
      })
      .from(investments)
      .leftJoin(user, eq(investments.userId, user.id))
      .leftJoin(plans, eq(investments.planId, plans.id))
      .orderBy(desc(investments.createdAt));
  }

  async deleteInvestments(investmentIds: string[]) {
    // Optional: Add logic here to revert balance changes or handle ROI if needed before deleting
    const result = await db
      .delete(investments)
      .where(inArray(investments.id, investmentIds));
    return { success: true, deletedCount: result[0].affectedRows };
  }

  // Add simple statistics method for a specific user
  async getUserSimpleInvestmentStats(userId: string) {
    const userInvestments = await this.getUserInvestments(userId);

    const totalCount = userInvestments.length;
    const totalInvestedAmountByCurrency: Record<Currency, string> = {
      USDT: "0",
      BTC: "0",
      ETH: "0",
      SOL: "0",
      BNB: "0",
      LTC: "0",
    };

    for (const investment of userInvestments) {
      const currency = investment.currency;
      if (currency && totalInvestedAmountByCurrency.hasOwnProperty(currency)) {
        totalInvestedAmountByCurrency[currency] = (
          BigInt(totalInvestedAmountByCurrency[currency]) +
          BigInt(investment.amount)
        ).toString();
      }
    }

    return {
      totalCount,
      totalInvestedAmountByCurrency,
    };
  }

  // Helper method to get user by ID
  private async getUserById(userId: string) {
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return userRecord[0] || null;
  }
}
