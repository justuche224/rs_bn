import { eq, and } from "drizzle-orm";
import db from "../db/index.js";
import { balance } from "../db/schema.js";
import type { Currency } from "./wallet.service.js";

export class BalanceService {
  private static instance: BalanceService;
  private constructor() {}

  public static getInstance(): BalanceService {
    if (!BalanceService.instance) {
      BalanceService.instance = new BalanceService();
    }
    return BalanceService.instance;
  }

  async getUserBalance(userId: string, currency: Currency) {
    const balanceRecord = await db
      .select()
      .from(balance)
      .where(and(eq(balance.userId, userId), eq(balance.currency, currency)))
      .limit(1);

    return balanceRecord[0] || null;
  }

  async getAllUserBalances(userId: string) {
    const balances = await db
      .select()
      .from(balance)
      .where(eq(balance.userId, userId));

    return balances;
  }

  async incrementBalance(userId: string, currency: Currency, amount: string) {
    const existingBalance = await this.getUserBalance(userId, currency);

    if (!existingBalance) {
      // Create new balance record if it doesn't exist
      return await db.insert(balance).values({
        userId,
        currency,
        amount,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Update existing balance
    const newAmount = (
      BigInt(existingBalance.amount) + BigInt(amount)
    ).toString();
    return await db
      .update(balance)
      .set({
        amount: newAmount,
        updatedAt: new Date(),
      })
      .where(and(eq(balance.userId, userId), eq(balance.currency, currency)));
  }

  async decrementBalance(userId: string, currency: Currency, amount: string) {
    const existingBalance = await this.getUserBalance(userId, currency);

    if (!existingBalance) {
      throw new Error("No balance found for this currency");
    }

    // Check if user has sufficient balance
    if (BigInt(existingBalance.amount) < BigInt(amount)) {
      throw new Error("Insufficient balance");
    }

    // Update existing balance
    const newAmount = (
      BigInt(existingBalance.amount) - BigInt(amount)
    ).toString();
    return await db
      .update(balance)
      .set({
        amount: newAmount,
        updatedAt: new Date(),
      })
      .where(and(eq(balance.userId, userId), eq(balance.currency, currency)));
  }

  async getTotalSystemBalance() {
    const currencies = ["BTC", "ETH", "USDT", "SOL", "BNB", "LTC"] as const;
    const totalBalances: Record<Currency, string> = {
      BTC: "0",
      ETH: "0",
      USDT: "0",
      SOL: "0",
      BNB: "0",
      LTC: "0",
    };

    // Get all balances
    const balances = await db
      .select({
        currency: balance.currency,
        amount: balance.amount,
      })
      .from(balance);

    // Sum up balances for each currency
    for (const record of balances) {
      totalBalances[record.currency] = (
        BigInt(totalBalances[record.currency]) + BigInt(record.amount)
      ).toString();
    }

    return totalBalances;
  }

  async getUserTotalBalance(userId: string) {
    const currencies = ["BTC", "ETH", "USDT", "SOL", "BNB", "LTC"] as const;
    const totalBalances: Record<Currency, string> = {
      BTC: "0",
      ETH: "0",
      USDT: "0",
      SOL: "0",
      BNB: "0",
      LTC: "0",
    };

    // Get all balances for the user
    const balances = await db
      .select({
        currency: balance.currency,
        amount: balance.amount,
      })
      .from(balance)
      .where(eq(balance.userId, userId));

    // Sum up balances for each currency
    for (const record of balances) {
      totalBalances[record.currency] = (
        BigInt(totalBalances[record.currency]) + BigInt(record.amount)
      ).toString();
    }

    return totalBalances;
  }
}
