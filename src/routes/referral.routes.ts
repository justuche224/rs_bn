import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { ReferralController } from "../controllers/referral.controller.js";

const referralRouter = new Hono();

// Apply authentication middleware to all referral routes
referralRouter.use("*", requireAuth);

// Referral routes
referralRouter.post("/", ReferralController.createReferral);
referralRouter.get("/", ReferralController.getUserReferrals);
referralRouter.get("/stats", ReferralController.getReferralStats);

export default referralRouter; 