import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { BalanceController } from "../controllers/balance.controller.js";
import { WithdrawalController } from "../controllers/withdrawal.controller.js";

const balanceRouter = new Hono();

// Apply authentication middleware to all balance routes
balanceRouter.use("*", requireAuth);

// Balance routes
balanceRouter.get("/", BalanceController.getAllUserBalances);
balanceRouter.get("/total", BalanceController.getTotalSystemBalance);
balanceRouter.get("/total/user", BalanceController.getUserTotalBalance);
balanceRouter.get("/info", BalanceController.getUserBalance);
balanceRouter.get(
  "/withdrawals/total",
  WithdrawalController.getUserApprovedWithdrawals
);

// Admin routes
balanceRouter.post("/admin/adjust", BalanceController.adminAdjustBalance);

export default balanceRouter;
