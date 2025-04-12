import { Hono } from "hono";
import { KYCController } from "../controllers/kyc.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
const kycRouter = new Hono();
// Apply authentication middleware to all KYC routes
kycRouter.use("*", requireAuth);
// Public KYC routes (require authentication but not admin)
kycRouter.post("/upload", KYCController.uploadKYCImage);
kycRouter.get("/images/:filename", KYCController.serveKYCImage);
kycRouter.get("/status", KYCController.checkKYCStatus);
kycRouter.get("/info", KYCController.getKYCInfo);
// Admin-only KYC routes
kycRouter.use("*", requireAdmin);
kycRouter.put("/status", KYCController.updateKYCStatus);
kycRouter.get("/", KYCController.getAllKYC);
export default kycRouter;
