import { ReferralService } from "../services/referral.service.js";
const referralService = ReferralService.getInstance();
export class ReferralController {
    static async createReferral(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const { referrerId } = await c.req.json();
            if (!referrerId) {
                return c.json({ error: "Missing required field: referreeId" }, 400);
            }
            // Prevent self-referral
            if (user.id === referrerId) {
                return c.json({ error: "Cannot refer yourself" }, 400);
            }
            const result = await referralService.createReferral(referrerId, user.id);
            return c.json(result, 201);
        }
        catch (error) {
            console.error("Error creating referral:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to create referral",
            }, 500);
        }
    }
    static async getUserReferrals(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const referrals = await referralService.getReferralsByReferrerId(user.id);
            return c.json({ data: referrals }, 200);
        }
        catch (error) {
            console.error("Error getting user referrals:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to get referrals",
            }, 500);
        }
    }
    static async getReferralStats(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const stats = await referralService.getReferralStats(user.id);
            return c.json({ data: stats }, 200);
        }
        catch (error) {
            console.error("Error getting referral stats:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to get referral stats",
            }, 500);
        }
    }
}
