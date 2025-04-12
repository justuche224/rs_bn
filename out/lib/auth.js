import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../db/index.js";
// import { emailHarmony } from "better-auth-harmony";
import { mailService } from "../services/mail.service.js";
export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "postgres",
    }),
    rateLimit: {
        enabled: true,
        window: 60, // time window in seconds
        max: 10, // max requests in the window
        customRules: {
            "/forget-password": { window: 10, max: 2 },
        },
    },
    // plugins: [emailHarmony()],
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url, token }, request) => {
            console.log(url);
            await mailService.sendPasswordResetEmail(user.email, url);
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url, token }, request) => {
            console.log(url);
            await mailService.sendVerificationEmail(user.email, url);
        },
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                default: "USER",
            },
            kyc_verified: {
                type: "boolean",
                default: false,
            },
        },
    },
    trustedOrigins: process.env.NODE_ENV === "production" ? [process.env.FRONTEND_URL] : ["http://localhost:5173", "http://localhost:3000"],
});
