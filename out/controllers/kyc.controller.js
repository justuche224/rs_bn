import { KYCService } from "../services/kyc.service.js";
const kycService = KYCService.getInstance();
export class KYCController {
    static async uploadKYCImage(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const formData = await c.req.formData();
            const frontFile = formData.get("front");
            const backFile = formData.get("back");
            const selfieFile = formData.get("selfie");
            const documentType = formData.get("documentType");
            const userId = formData.get("userId");
            if (!frontFile || !backFile || !selfieFile || !documentType || !userId) {
                return c.json({
                    error: "Missing required fields: front, back, selfie images, documentType, and userId are required",
                }, 400);
            }
            if (userId !== user.id) {
                return c.json({ error: "Unauthorized: User ID mismatch" }, 401);
            }
            const result = await kycService.uploadKYCImages(userId, frontFile, backFile, selfieFile, documentType);
            return c.json({ success: true, kyc: result }, 201);
        }
        catch (error) {
            console.error("Error uploading KYC images:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to upload images",
            }, 500);
        }
    }
    static async serveKYCImage(c) {
        try {
            const filename = c.req.param("filename");
            const user = c.get("user");
            const userId = user === null || user === void 0 ? void 0 : user.id;
            const isAdmin = (user === null || user === void 0 ? void 0 : user.role) === "ADMIN";
            if (!userId) {
                return c.json({ error: "Unauthorized: No user ID found" }, 401);
            }
            const fileBuffer = await kycService.getKYCImage(filename, userId, isAdmin);
            return new Response(fileBuffer, {
                status: 200,
                headers: {
                    "Content-Type": "image/jpeg",
                },
            });
        }
        catch (error) {
            console.error("Error serving KYC image:", error);
            return new Response(error instanceof Error ? error.message : "File not found", { status: 404 });
        }
    }
    static async checkKYCStatus(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const status = await kycService.checkKYCStatus(user.id);
            return c.json({ status }, 200);
        }
        catch (error) {
            console.error("Error checking KYC status:", error);
            return c.json({
                error: error instanceof Error
                    ? error.message
                    : "Failed to check KYC status",
            }, 500);
        }
    }
    static async updateKYCStatus(c) {
        try {
            const user = c.get("user");
            if (!user || user.role !== "ADMIN") {
                return c.json({ error: "Unauthorized: Admin access required" }, 403);
            }
            const { kycId, status, rejectionReason } = await c.req.json();
            if (!kycId || !status) {
                return c.json({ error: "Missing required fields: kycId and status are required" }, 400);
            }
            const result = await kycService.updateKYCStatus(kycId, status, rejectionReason);
            return c.json(result, 200);
        }
        catch (error) {
            console.error("Error updating KYC status:", error);
            return c.json({
                error: error instanceof Error
                    ? error.message
                    : "Failed to update KYC status",
            }, 500);
        }
    }
    static async getKYCInfo(c) {
        try {
            const user = c.get("user");
            if (!user) {
                return c.json({ error: "Unauthorized: No user found" }, 401);
            }
            const kycInfo = await kycService.getKYCInfo(user.id);
            if (!kycInfo) {
                return c.json({ error: "KYC information not found" }, 404);
            }
            return c.json(kycInfo, 200);
        }
        catch (error) {
            console.error("Error getting KYC info:", error);
            return c.json({
                error: error instanceof Error ? error.message : "Failed to get KYC info",
            }, 500);
        }
    }
    static async getAllKYC(c) {
        try {
            const user = c.get("user");
            if (!user || user.role !== "ADMIN") {
                return c.json({ error: "Unauthorized: Admin access required" }, 403);
            }
            const kycRecords = await kycService.getAllKYC();
            return c.json({ data: kycRecords }, 200);
        }
        catch (error) {
            console.error("Error getting all KYC records:", error);
            return c.json({
                error: error instanceof Error
                    ? error.message
                    : "Failed to get KYC records",
            }, 500);
        }
    }
}
