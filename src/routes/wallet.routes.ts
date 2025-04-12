import { Hono } from "hono";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { WalletController } from "../controllers/wallet.controller.js";

const walletRouter = new Hono();

// Apply authentication middleware to all wallet routes
walletRouter.use("*", requireAuth);

// System Wallet Routes
// Public read access (no admin required)
walletRouter.get("/system", WalletController.getAllSystemWallets);
walletRouter.get("/system/info", WalletController.getSystemWalletInfo);
walletRouter.get("/system/qr/:filename", WalletController.serveSystemWalletQRCode);

// Admin-only system wallet operations
walletRouter.use("/system/*", requireAdmin);
walletRouter.post("/system", WalletController.uploadSystemWallet);
walletRouter.put("/system/:id", WalletController.updateSystemWallet);
walletRouter.delete("/system/:id", WalletController.deleteSystemWallet);

// User Wallet Routes
walletRouter.post("/", WalletController.createUserWallet);
walletRouter.get("/info", WalletController.getUserWalletInfo);
walletRouter.delete("/:id", WalletController.deleteUserWallet);

export default walletRouter; 