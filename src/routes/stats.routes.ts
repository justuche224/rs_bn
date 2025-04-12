import { Hono } from "hono";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { StatsController } from "../controllers/stats.controller.js";

const statsRouter = new Hono();

// Apply authentication middleware to all stats routes
statsRouter.use("*", requireAuth);

// Admin-only routes
const adminRoutes = [
  "/transactions",
  "/users",
  "/products",
  "/transaction-history",
  "/investments",
  "/investments-basic",
];

adminRoutes.forEach((route) => {
  statsRouter.use(route, requireAdmin);
});

// Stats routes
statsRouter.get("/transactions", StatsController.getTransactionStats);
statsRouter.get("/users", StatsController.getUserStats);
statsRouter.get("/products", StatsController.getProductStats);
statsRouter.get("/transaction-history", StatsController.getTransactionHistory);
statsRouter.get(
  "/user/:userId/transaction-history",
  StatsController.getUserTransactionHistory
);
statsRouter.get(
  "/user/:userId/referral-stats",
  StatsController.getUserReferralStats
);

// User-specific investment basic stats
statsRouter.get(
  "/user/:userId/investment-basic-stats",
  StatsController.getUserSimpleInvestmentStats
);

export default statsRouter;
