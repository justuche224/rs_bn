import type { Context } from "hono";
import { ProductService } from "../services/product.service.js";

const productService = ProductService.getInstance();

export class ProductController {
  // Category controllers
  static async createCategory(c: Context) {
    try {
      const { name } = await c.req.json();

      if (!name || typeof name !== "string") {
        return c.json({ error: "Name is required and must be a string" }, 400);
      }

      const result = await productService.createCategory(name);
      return c.json(result, 201);
    } catch (error) {
      console.error("Error creating category:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to create category",
        },
        500
      );
    }
  }

  static async updateCategory(c: Context) {
    try {
      const categoryId = c.req.param("id");
      const { name } = await c.req.json();

      if (!name || typeof name !== "string") {
        return c.json({ error: "Name is required and must be a string" }, 400);
      }

      const result = await productService.updateCategory(categoryId, name);
      return c.json(result, 200);
    } catch (error) {
      console.error("Error updating category:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to update category",
        },
        error instanceof Error && error.message.includes("not found") ? 404 : 500
      );
    }
  }

  static async deleteCategories(c: Context) {
    try {
      const { categoryIds } = await c.req.json();

      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return c.json(
          { error: "categoryIds must be a non-empty array" },
          400
        );
      }

      const result = await productService.deleteCategories(categoryIds);
      return c.json(result, 200);
    } catch (error) {
      console.error("Error deleting categories:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to delete categories",
        },
        500
      );
    }
  }

  static async getAllCategories(c: Context) {
    try {
      const categoriesWithProducts = await productService.getAllCategories();
      return c.json({
        data: categoriesWithProducts.map(category => ({
          id: category.id,
          name: category.name,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
          productsCount: category.products.length,
          products: category.products,
        })),
      }, 200);
    } catch (error) {
      console.error("Error getting categories:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to get categories",
        },
        500
      );
    }
  }

  static async getCategory(c: Context) {
    try {
      const categoryId = c.req.param("id");
      const categoryWithProducts = await productService.getCategory(categoryId);
      return c.json({
        id: categoryWithProducts.id,
        name: categoryWithProducts.name,
        createdAt: categoryWithProducts.createdAt,
        updatedAt: categoryWithProducts.updatedAt,
        productsCount: categoryWithProducts.products.length,
        products: categoryWithProducts.products,
      }, 200);
    } catch (error) {
      console.error("Error getting category:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to get category",
        },
        error instanceof Error && error.message.includes("not found") ? 404 : 500
      );
    }
  }

  // Product controllers
  static async createProduct(c: Context) {
    try {
      const formData = await c.req.formData();
      const name = formData.get("name") as string;
      const price = formData.get("price") as string;
      const description = formData.get("description") as string;
      const categoryId = formData.get("categoryId") as string;
      const imageFile = formData.get("image") as File;

      if (!name || !price || !description || !categoryId || !imageFile) {
        return c.json(
          { error: "All fields (name, price, description, categoryId, image) are required" },
          400
        );
      }

      const result = await productService.createProduct({
        name,
        price,
        description,
        categoryId,
        imageFile,
      });

      return c.json(result, 201);
    } catch (error) {
      console.error("Error creating product:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to create product",
        },
        error instanceof Error && error.message.includes("not found") ? 404 : 500
      );
    }
  }

  static async updateProduct(c: Context) {
    try {
      const productId = c.req.param("id");
      const formData = await c.req.formData();
      
      const updateData: any = {};
      
      const name = formData.get("name");
      if (name) updateData.name = name as string;
      
      const price = formData.get("price");
      if (price) updateData.price = price as string;
      
      const description = formData.get("description");
      if (description) updateData.description = description as string;
      
      const categoryId = formData.get("categoryId");
      if (categoryId) updateData.categoryId = categoryId as string;
      
      const imageFile = formData.get("image");
      if (imageFile) updateData.imageFile = imageFile as File;

      if (Object.keys(updateData).length === 0) {
        return c.json({ error: "No fields to update" }, 400);
      }

      const result = await productService.updateProduct(productId, updateData);
      return c.json(result, 200);
    } catch (error) {
      console.error("Error updating product:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to update product",
        },
        error instanceof Error && error.message.includes("not found") ? 404 : 500
      );
    }
  }

  static async deleteProducts(c: Context) {
    try {
      const { productIds } = await c.req.json();

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return c.json(
          { error: "productIds must be a non-empty array" },
          400
        );
      }

      const result = await productService.deleteProducts(productIds);
      return c.json(result, 200);
    } catch (error) {
      console.error("Error deleting products:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to delete products",
        },
        500
      );
    }
  }

  static async getAllProducts(c: Context) {
    try {
      const products = await productService.getAllProducts();
      return c.json({ data: products }, 200);
    } catch (error) {
      console.error("Error getting products:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to get products",
        },
        500
      );
    }
  }

  static async getProduct(c: Context) {
    try {
      const productId = c.req.param("id");
      const product = await productService.getProduct(productId);
      return c.json(product, 200);
    } catch (error) {
      console.error("Error getting product:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to get product",
        },
        error instanceof Error && error.message.includes("not found") ? 404 : 500
      );
    }
  }

  static async getProductImage(c: Context) {
    try {
      const filename = c.req.param("filename");
      const imageBuffer = await productService.getProductImage(filename);
      
      return new Response(imageBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
        },
      });
    } catch (error) {
      console.error("Error getting product image:", error);
      return new Response(
        error instanceof Error ? error.message : "Image not found",
        { status: 404 }
      );
    }
  }
} 