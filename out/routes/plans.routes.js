import { Hono } from "hono";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { PlansController } from "../controllers/plans.controller.js";
const plansRouter = new Hono();
// Public routes for getting plans
plansRouter.get("/", PlansController.getAllPlans);
plansRouter.get("/:id", PlansController.getPlan);
// Protected admin routes
plansRouter.post("/", requireAuth, requireAdmin, PlansController.createPlan);
plansRouter.put("/:id", requireAuth, requireAdmin, PlansController.updatePlan);
plansRouter.delete("/", requireAuth, requireAdmin, PlansController.deletePlans);
export default plansRouter;
