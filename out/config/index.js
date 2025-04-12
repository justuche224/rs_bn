import { join } from "path";
import { productionConfig } from "./production.js";
const developmentConfig = {
    port: process.env.PORT || 5000,
    cors: {
        origin: ["http://localhost:3000", "http://localhost:5173"],
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
        exposeHeaders: ["Content-Length"],
        maxAge: 600,
        credentials: true,
    },
    storage: {
        kycImages: join(process.cwd(), "storage", "kyc-images"),
        walletImages: join(process.cwd(), "storage", "wallet-images"),
        profileImages: join(process.cwd(), "storage", "profile-images"),
        productImages: join(process.cwd(), "storage", "product-images"),
    },
    upload: {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ["image/jpeg", "image/png"],
        imageProcessing: {
            maxWidth: 800,
            maxHeight: 800,
            quality: 80,
        },
    },
};
export const config = process.env.NODE_ENV === "production" ? productionConfig : developmentConfig;
