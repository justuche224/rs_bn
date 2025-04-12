import type { Context } from "hono";
import { WalletService } from "../services/wallet.service.js";

const walletService = WalletService.getInstance();

export class WalletController {
  // System Wallet Methods
  static async uploadSystemWallet(c: Context) {
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const formData = await c.req.formData();
      const currency = formData.get("currency") as "BTC" | "ETH" | "USDT" | "SOL" | "BNB" | "LTC";
      const address = formData.get("address") as string;
      const qrCodeFile = formData.get("wallQRCode") as File;

      if (!currency || !address || !qrCodeFile) {
        return c.json(
          {
            error:
              "Missing required fields: currency, address, and QR code are required",
          },
          400
        );
      }

      const result = await walletService.uploadSystemWallet(
        currency,
        address,
        qrCodeFile
      );

      return c.json({ success: true, wallet: result }, 201);
    } catch (error) {
      console.error("Error uploading system wallet:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to upload system wallet",
        },
        500
      );
    }
  }

  static async serveSystemWalletQRCode(c: Context) {
    try {
      const filename = c.req.param("filename");
      const fileBuffer = await walletService.getSystemWalletQRCode(filename);
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
        },
      });
    } catch (error) {
      console.error("Error serving system wallet QR code:", error);
      return new Response(
        error instanceof Error ? error.message : "File not found",
        { status: 404 }
      );
    }
  }

  static async getSystemWalletInfo(c: Context) {
    try {
      const currency = c.req.query("currency") as "BTC" | "ETH" | "USDT" | "SOL" | "BNB" | "LTC";
      if (!currency) {
        return c.json({ error: "Currency parameter is required" }, 400);
      }

      const walletInfo = await walletService.getSystemWalletInfo(currency);
      if (!walletInfo) {
        return c.json({ error: "System wallet not found" }, 404);
      }

      return c.json(walletInfo, 200);
    } catch (error) {
      console.error("Error getting system wallet info:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to get system wallet info",
        },
        500
      );
    }
  }

  static async getAllSystemWallets(c: Context) {
    try {
      const wallets = await walletService.getAllSystemWallets();
      return c.json({ data: wallets }, 200);
    } catch (error) {
      console.error("Error getting all system wallets:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to get system wallets",
        },
        500
      );
    }
  }

  static async updateSystemWallet(c: Context) {
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const walletId = c.req.param("id");
      const formData = await c.req.formData();
      const currency = formData.get("currency") as "BTC" | "ETH" | "USDT" | "SOL" | "BNB" | "LTC";
      const address = formData.get("address") as string;
      const qrCodeFile = formData.get("wallQRCode") as File;

      if (!currency || !address) {
        return c.json(
          {
            error: "Missing required fields: currency and address are required",
          },
          400
        );
      }

      const result = await walletService.updateSystemWallet(
        walletId,
        currency,
        address,
        qrCodeFile
      );

      return c.json({ success: true, wallet: result }, 200);
    } catch (error) {
      console.error("Error updating system wallet:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to update system wallet",
        },
        500
      );
    }
  }

  static async deleteSystemWallet(c: Context) {
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const walletId = c.req.param("id");
      const result = await walletService.deleteSystemWallet(walletId);
      return c.json(result, 200);
    } catch (error) {
      console.error("Error deleting system wallet:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to delete system wallet",
        },
        500
      );
    }
  }

  // User Wallet Methods
  static async createUserWallet(c: Context) {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized: No user found" }, 401);
      }

      const { currency, address } = await c.req.json();

      if (!currency || !address) {
        return c.json(
          {
            error: "Missing required fields: currency and address are required",
          },
          400
        );
      }

      // Validate currency
      const validCurrencies = ["BTC", "ETH", "USDT", "SOL", "BNB", "LTC"];
      if (!validCurrencies.includes(currency)) {
        return c.json(
          {
            error: `Invalid currency. Must be one of: ${validCurrencies.join(", ")}`,
          },
          400
        );
      }

      const result = await walletService.createUserWallet(
        user.id,
        currency,
        address
      );

      return c.json({ success: true, wallet: result }, 201);
    } catch (error) {
      console.error("Error creating user wallet:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to create user wallet",
        },
        error instanceof Error && error.message.includes("already have") ? 400 : 500
      );
    }
  }

  static async getUserWalletInfo(c: Context) {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized: No user found" }, 401);
      }

      const currency = c.req.query("currency") as "BTC" | "ETH" | "USDT" | "SOL" | "BNB" | "LTC" | undefined;
      const walletInfo = await walletService.getUserWalletInfo(user.id);

      // If currency is specified, filter wallets by currency
      if (currency) {
        const filteredWallets = walletInfo.filter(wallet => wallet.currency === currency);
        return c.json({ wallets: filteredWallets }, 200);
      }

      return c.json({ wallets: walletInfo }, 200);
    } catch (error) {
      console.error("Error getting user wallet info:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to get wallet info",
        },
        500
      );
    }
  }

  static async deleteUserWallet(c: Context) {
    console.log("deleteUserWallet");
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized: No user found" }, 401);
      }

      const walletId = c.req.param("id");
      const isAdmin = user.role === "ADMIN";
      console.log("walletId", walletId);
      const result = await walletService.deleteUserWallet(walletId, user.id, isAdmin);
      return c.json(result, 200);
    } catch (error) {
      console.error("Error deleting user wallet:", error);
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to delete user wallet",
        },
        500
      );
    }
  }
} 