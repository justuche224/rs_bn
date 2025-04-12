import { Hono } from "hono";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { WithdrawalController } from "../controllers/withdrawal.controller.js";
const withdrawalRouter = new Hono();
// Apply authentication middleware to all withdrawal routes
withdrawalRouter.use("*", requireAuth);
// User withdrawal routes
withdrawalRouter.post("/", WithdrawalController.createWithdrawal);
withdrawalRouter.get("/", WithdrawalController.getUserWithdrawals);
// Admin-only withdrawal management routes
withdrawalRouter.use("/*", requireAdmin);
withdrawalRouter.get("/all", WithdrawalController.getAllWithdrawals);
withdrawalRouter.get("/:id/approve", WithdrawalController.approveWithdrawal);
withdrawalRouter.post("/:id/reject", WithdrawalController.rejectWithdrawal);
export default withdrawalRouter;
