import db from "../db/index.js";
import { user } from "../db/schema.js";
import { eq, inArray, ne, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { join } from "path";
import { readFile, unlink } from "fs/promises";
import sharp from "sharp";
import { config } from "../config/index.js";
export class UserService {
    constructor() { }
    static getInstance() {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }
    async getUser(userId, requestingUserId, isAdmin) {
        const userRecord = await db
            .select()
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);
        if (!userRecord.length) {
            throw new Error("User not found");
        }
        // Only allow access if user is admin or requesting their own data
        if (!isAdmin && userRecord[0].id !== requestingUserId) {
            throw new Error("Unauthorized: You can only view your own data");
        }
        return userRecord[0];
    }
    async getAllUsers() {
        const users = await db
            .select()
            .from(user)
            .where(ne(user.role, "ADMIN"))
            .orderBy(user.createdAt);
        return users;
    }
    async deleteUsers(userIds) {
        // Delete all users with the given IDs
        await db
            .delete(user)
            .where(inArray(user.id, userIds));
        return { success: true, deletedCount: userIds.length };
    }
    async updateUserInfo(userId, requestingUserId, isAdmin, updateData) {
        const userRecord = await db
            .select()
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);
        if (!userRecord.length) {
            throw new Error("User not found");
        }
        // Only allow update if user is admin or updating their own data
        if (!isAdmin && userRecord[0].id !== requestingUserId) {
            throw new Error("Unauthorized: You can only update your own data");
        }
        await db
            .update(user)
            .set(Object.assign(Object.assign({}, updateData), { updatedAt: new Date() }))
            .where(eq(user.id, userId));
        return { success: true };
    }
    async updateProfilePicture(userId, requestingUserId, isAdmin, imageFile) {
        const userRecord = await db
            .select()
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);
        if (!userRecord.length) {
            throw new Error("User not found");
        }
        // Only allow update if user is admin or updating their own data
        if (!isAdmin && userRecord[0].id !== requestingUserId) {
            throw new Error("Unauthorized: You can only update your own profile picture");
        }
        if (!imageFile.type.startsWith("image/")) {
            throw new Error("File must be an image");
        }
        if (imageFile.size > config.upload.maxFileSize) {
            throw new Error("Image must be under 5MB");
        }
        // Delete old profile picture if exists
        if (userRecord[0].image) {
            const oldFilepath = join(config.storage.profileImages, userRecord[0].image);
            try {
                await unlink(oldFilepath);
            }
            catch (error) {
                console.error("Error deleting old profile picture:", error);
            }
        }
        // Save new profile picture
        const filename = `${uuidv4()}-${imageFile.name}`;
        const filepath = join(config.storage.profileImages, filename);
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await sharp(buffer)
            .resize(config.upload.imageProcessing.maxWidth, config.upload.imageProcessing.maxHeight, {
            fit: "inside",
        })
            .jpeg({ quality: config.upload.imageProcessing.quality })
            .toFile(filepath);
        await db
            .update(user)
            .set({
            image: filename,
            updatedAt: new Date(),
        })
            .where(eq(user.id, userId));
        return {
            success: true,
            imageUrl: `${process.env.BASE_URL}/api/user/profile-picture/${filename}`,
        };
    }
    async getProfilePicture(filename, requestingUserId, isAdmin) {
        const userRecord = await db
            .select()
            .from(user)
            .where(eq(user.image, filename))
            .limit(1);
        if (!userRecord.length) {
            throw new Error("Profile picture not found");
        }
        // Only allow access if user is admin or requesting their own picture
        if (!isAdmin && userRecord[0].id !== requestingUserId) {
            throw new Error("Unauthorized: You can only view your own profile picture");
        }
        const filepath = join(config.storage.profileImages, filename);
        return await readFile(filepath);
    }
    async getUserStats() {
        const [totalUsers, kycVerifiedUsers, emailVerifiedUsers, usersByCountry] = await Promise.all([
            // Total users (excluding admins)
            db
                .select({ count: sql `count(*)` })
                .from(user)
                .where(ne(user.role, "ADMIN"))
                .then(result => result[0].count),
            // KYC verified users
            db
                .select({ count: sql `count(*)` })
                .from(user)
                .where(and(eq(user.kyc_verified, true), ne(user.role, "ADMIN")))
                .then(result => result[0].count),
            // Email verified users
            db
                .select({ count: sql `count(*)` })
                .from(user)
                .where(and(eq(user.emailVerified, true), ne(user.role, "ADMIN")))
                .then(result => result[0].count),
            // Users by country
            db
                .select({
                country: user.country,
                count: sql `count(*)`
            })
                .from(user)
                .where(and(sql `${user.country} IS NOT NULL`, ne(user.role, "ADMIN")))
                .groupBy(user.country)
        ]);
        return {
            totalUsers,
            kycVerified: kycVerifiedUsers,
            emailVerified: emailVerifiedUsers,
            byCountry: usersByCountry
        };
    }
}
