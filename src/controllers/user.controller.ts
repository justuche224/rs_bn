import type { Context } from "hono";
import { UserService } from "../services/user.service.js";

const userService = UserService.getInstance();

export class UserController {
  static async getUser(c: Context) {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized: No user found" }, 401);
      }

      const userId = c.req.param("id");
      const isAdmin = user.role === "ADMIN";

      const userData = await userService.getUser(userId, user.id, isAdmin);
      return c.json(userData, 200);
    } catch (error) {
      console.error("Error getting user:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to get user",
        },
        error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500
      );
    }
  }

  static async getAllUsers(c: Context) {
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const users = await userService.getAllUsers();
      return c.json({ data: users }, 200);
    } catch (error) {
      console.error("Error getting all users:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to get users",
        },
        500
      );
    }
  }

  static async deleteUsers(c: Context) {
    try {
      const user = c.get("user");
      if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
      }

      const { userIds } = await c.req.json();

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return c.json(
          { error: "Invalid request: userIds must be a non-empty array" },
          400
        );
      }

      const result = await userService.deleteUsers(userIds);
      return c.json(result, 200);
    } catch (error) {
      console.error("Error deleting users:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to delete users",
        },
        500
      );
    }
  }

  static async updateUserInfo(c: Context) {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized: No user found" }, 401);
      }

      const userId = c.req.param("id");
      const isAdmin = user.role === "ADMIN";
      const updateData = await c.req.json();

      // Remove fields that shouldn't be updated
      delete updateData.email;
      delete updateData.emailVerified;
      delete updateData.role;
      delete updateData.twoFactorEnabled;
      delete updateData.kycVerified;

      // Parse dateOfBirth if it exists
      if (updateData.dateOfBirth) {
        const parsedDate = new Date(updateData.dateOfBirth);
        if (isNaN(parsedDate.getTime())) {
          return c.json({ error: "Invalid date format" }, 400);
        }
        updateData.dateOfBirth = parsedDate;
      }

      const result = await userService.updateUserInfo(userId, user.id, isAdmin, updateData);
      return c.json(result, 200);
    } catch (error) {
      console.error("Error updating user info:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to update user info",
        },
        error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500
      );
    }
  }

  static async updateProfilePicture(c: Context) {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized: No user found" }, 401);
      }

      const userId = c.req.param("id");
      const isAdmin = user.role === "ADMIN";
      const formData = await c.req.formData();
      const imageFile = formData.get("image") as File;

      if (!imageFile) {
        return c.json({ error: "No image file provided" }, 400);
      }

      const result = await userService.updateProfilePicture(userId, user.id, isAdmin, imageFile);
      return c.json(result, 200);
    } catch (error) {
      console.error("Error updating profile picture:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to update profile picture",
        },
        error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500
      );
    }
  }

  static async getProfilePicture(c: Context) {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized: No user found" }, 401);
      }

      const filename = c.req.param("filename");
      const isAdmin = user.role === "ADMIN";

      const fileBuffer = await userService.getProfilePicture(filename, user.id, isAdmin);
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
        },
      });
    } catch (error) {
      console.error("Error getting profile picture:", error);
      return new Response(
        error instanceof Error ? error.message : "File not found",
        { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 404 }
      );
    }
  }
} 