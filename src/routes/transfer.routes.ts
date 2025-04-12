import { Hono } from "hono";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { TransferController } from "../controllers/transfer.controller.js";

const transferRouter = new Hono();

// Apply authentication middleware to all transfer routes
transferRouter.use("*", requireAuth);

// User transfer routes
transferRouter.get("/", TransferController.getUserTransfers);
transferRouter.post("/internal", TransferController.createInternalTransfer);
transferRouter.post("/inter-user", TransferController.createInterUserTransfer);

// Admin-only transfer management routes
transferRouter.use("/*", requireAdmin);
transferRouter.get("/all", TransferController.getAllTransfers);
transferRouter.get("/:id/approve", TransferController.approveTransfer);
transferRouter.post("/:id/reject", TransferController.rejectTransfer);

export default transferRouter; 