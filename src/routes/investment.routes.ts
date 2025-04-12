import { Hono } from "hono";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { InvestmentController } from "../controllers/investment.controller.js";

const investmentRouter = new Hono();

// Apply authentication middleware to all investment routes
investmentRouter.use("*", requireAuth);

// Investment routes
investmentRouter.post("/", InvestmentController.createInvestment);
investmentRouter.get("/", InvestmentController.getUserInvestments);
investmentRouter.get("/:id", InvestmentController.getInvestmentById);

// admin routes
investmentRouter.get(
  "/all",
  requireAdmin,
  InvestmentController.getAllInvestments
);
investmentRouter.patch(
  "/:id/status",
  requireAdmin,
  InvestmentController.updateInvestmentStatus
);

export default investmentRouter;
