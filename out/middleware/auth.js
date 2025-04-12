import { auth } from "../lib/auth.js";
export const requireAuth = async (c, next) => {
    console.log("requireAuth");
    const session = await auth.api.getSession(c.req.raw);
    if (!session || !session.user) {
        return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("user", session.user);
    c.set("session", session.session);
    await next();
};
export const requireAdmin = async (c, next) => {
    console.log("requireAdmin");
    const user = c.get("user");
    if (!user || user.role !== "ADMIN") {
        return c.json({ error: "Unauthorized: Admin access required" }, 403);
    }
    await next();
};
