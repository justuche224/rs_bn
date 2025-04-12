import { Hono } from "hono";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { DepositController } from "../controllers/deposit.controller.js";

const depositRouter = new Hono();

// Apply authentication middleware to all deposit routes
depositRouter.use("*", requireAuth);

// User deposit routes
depositRouter.post("/", DepositController.createDeposit);
depositRouter.get("/", DepositController.getUserDeposits);

// Admin-only deposit management routes
depositRouter.use("/*", requireAdmin);
depositRouter.get("/all", DepositController.getAllDeposits);
depositRouter.get("/:id/approve", DepositController.approveDeposit);
depositRouter.post("/:id/reject", DepositController.rejectDeposit);
depositRouter.post("/:id/fail", DepositController.markDepositAsFailed);

export default depositRouter; 