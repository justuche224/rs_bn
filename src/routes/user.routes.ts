import { Hono } from "hono";
import { UserController } from "../controllers/user.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const userRouter = new Hono();

// Apply authentication middleware to all user routes
userRouter.use("*", requireAuth);

// Get a single user (accessible by the user themselves or admin)
userRouter.get("/:id", UserController.getUser);

// Get all users (admin only)
userRouter.get("/", requireAdmin, UserController.getAllUsers);

// Delete users (admin only)
userRouter.delete("/", requireAdmin, UserController.deleteUsers);

// Update user info (accessible by the user themselves or admin)
userRouter.put("/:id", UserController.updateUserInfo);

// Profile picture routes
userRouter.put("/:id/profile-picture", UserController.updateProfilePicture);
userRouter.get("/profile-picture/:filename", UserController.getProfilePicture);

export default userRouter; 