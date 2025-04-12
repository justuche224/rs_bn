import { Hono } from "hono";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { ProductController } from "../controllers/product.controller.js";

const productRouter = new Hono();

// Public routes for getting products and categories
productRouter.get("/categories", ProductController.getAllCategories);
productRouter.get("/categories/:id", ProductController.getCategory);
productRouter.get("/", ProductController.getAllProducts);
productRouter.get("/:id", ProductController.getProduct);
productRouter.get("/image/:filename", ProductController.getProductImage);

// Protected admin routes
productRouter.post("/categories", requireAuth, requireAdmin, ProductController.createCategory);
productRouter.put("/categories/:id", requireAuth, requireAdmin, ProductController.updateCategory);
productRouter.delete("/categories", requireAuth, requireAdmin, ProductController.deleteCategories);

productRouter.post("/", requireAuth, requireAdmin, ProductController.createProduct);
productRouter.put("/:id", requireAuth, requireAdmin, ProductController.updateProduct);
productRouter.delete("/", requireAuth, requireAdmin, ProductController.deleteProducts);

export default productRouter; 