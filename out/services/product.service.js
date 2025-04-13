import db from "../db/index.js";
import { product, productCategory } from "../db/schema.js";
import { eq, inArray, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { join } from "path";
import { readFile, unlink } from "fs/promises";
import sharp from "sharp";
import { config } from "../config/index.js";
export class ProductService {
    constructor() { }
    static getInstance() {
        if (!ProductService.instance) {
            ProductService.instance = new ProductService();
        }
        return ProductService.instance;
    }
    // Category methods
    async createCategory(name) {
        const newCategory = await db.insert(productCategory).values({
            id: uuidv4(),
            name,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();
        return { success: true, categoryId: newCategory[0].id };
    }
    async updateCategory(categoryId, name) {
        const category = await db
            .select()
            .from(productCategory)
            .where(eq(productCategory.id, categoryId))
            .limit(1);
        if (!category.length) {
            throw new Error("Category not found");
        }
        await db
            .update(productCategory)
            .set({
            name,
            updatedAt: new Date(),
        })
            .where(eq(productCategory.id, categoryId));
        return { success: true };
    }
    async deleteCategories(categoryIds) {
        await db
            .delete(productCategory)
            .where(inArray(productCategory.id, categoryIds));
        return { success: true, deletedCount: categoryIds.length };
    }
    async getAllCategories() {
        const categories = await db
            .select()
            .from(productCategory)
            .orderBy(productCategory.name);
        // Get products for each category
        const categoriesWithProducts = await Promise.all(categories.map(async (category) => {
            const products = await db
                .select()
                .from(product)
                .where(eq(product.categoryId, category.id));
            return Object.assign(Object.assign({}, category), { products: products.map(p => (Object.assign(Object.assign({}, p), { imageUrl: `${process.env.BASE_URL}/api/products/image/${p.img}` }))) });
        }));
        return categoriesWithProducts;
    }
    async getCategory(categoryId) {
        const category = await db
            .select()
            .from(productCategory)
            .where(eq(productCategory.id, categoryId))
            .limit(1);
        if (!category.length) {
            throw new Error("Category not found");
        }
        // Get products for this category
        const products = await db
            .select()
            .from(product)
            .where(eq(product.categoryId, categoryId));
        return Object.assign(Object.assign({}, category[0]), { products: products.map(p => (Object.assign(Object.assign({}, p), { imageUrl: `${process.env.BASE_URL}/api/products/image/${p.img}` }))) });
    }
    // Product methods
    async createProduct(data) {
        // Validate category exists
        const category = await db
            .select()
            .from(productCategory)
            .where(eq(productCategory.id, data.categoryId))
            .limit(1);
        if (!category.length) {
            throw new Error("Category not found");
        }
        if (!data.imageFile.type.startsWith("image/")) {
            throw new Error("File must be an image");
        }
        if (data.imageFile.size > config.upload.maxFileSize) {
            throw new Error("Image must be under 5MB");
        }
        // Save product image
        const filename = `${uuidv4()}-${data.imageFile.name}`;
        const filepath = join(config.storage.productImages, filename);
        const arrayBuffer = await data.imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await sharp(buffer)
            .resize(config.upload.imageProcessing.maxWidth, config.upload.imageProcessing.maxHeight, {
            fit: "inside",
        })
            .jpeg({ quality: config.upload.imageProcessing.quality })
            .toFile(filepath);
        // Create product record
        const newProduct = await db.insert(product).values({
            id: uuidv4(),
            name: data.name,
            price: data.price,
            description: data.description,
            categoryId: data.categoryId,
            img: filename,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();
        return {
            success: true,
            productId: newProduct[0].id,
            imageUrl: `${process.env.BASE_URL}/api/products/image/${filename}`,
        };
    }
    async updateProduct(productId, data) {
        const productRecord = await db
            .select()
            .from(product)
            .where(eq(product.id, productId))
            .limit(1);
        if (!productRecord.length) {
            throw new Error("Product not found");
        }
        const updateData = Object.assign({}, data);
        delete updateData.imageFile;
        if (data.categoryId) {
            const category = await db
                .select()
                .from(productCategory)
                .where(eq(productCategory.id, data.categoryId))
                .limit(1);
            if (!category.length) {
                throw new Error("Category not found");
            }
        }
        if (data.imageFile) {
            if (!data.imageFile.type.startsWith("image/")) {
                throw new Error("File must be an image");
            }
            if (data.imageFile.size > config.upload.maxFileSize) {
                throw new Error("Image must be under 5MB");
            }
            // Delete old image if exists
            if (productRecord[0].img) {
                const oldFilepath = join(config.storage.productImages, productRecord[0].img);
                try {
                    await unlink(oldFilepath);
                }
                catch (error) {
                    console.error("Error deleting old product image:", error);
                }
            }
            // Save new image
            const filename = `${uuidv4()}-${data.imageFile.name}`;
            const filepath = join(config.storage.productImages, filename);
            const arrayBuffer = await data.imageFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await sharp(buffer)
                .resize(config.upload.imageProcessing.maxWidth, config.upload.imageProcessing.maxHeight, {
                fit: "inside",
            })
                .jpeg({ quality: config.upload.imageProcessing.quality })
                .toFile(filepath);
            updateData.img = filename;
        }
        await db
            .update(product)
            .set(Object.assign(Object.assign({}, updateData), { updatedAt: new Date() }))
            .where(eq(product.id, productId));
        return {
            success: true,
            imageUrl: updateData.img
                ? `${process.env.BASE_URL}/api/products/image/${updateData.img}`
                : undefined,
        };
    }
    async deleteProducts(productIds) {
        // Get all products to delete their images
        const productsToDelete = await db
            .select()
            .from(product)
            .where(inArray(product.id, productIds));
        // Delete product images
        for (const product of productsToDelete) {
            if (product.img) {
                const filepath = join(config.storage.productImages, product.img);
                try {
                    await unlink(filepath);
                }
                catch (error) {
                    console.error(`Error deleting product image for product ${product.id}:`, error);
                }
            }
        }
        // Delete products from database
        await db.delete(product).where(inArray(product.id, productIds));
        return { success: true, deletedCount: productIds.length };
    }
    async getAllProducts() {
        const products = await db
            .select()
            .from(product)
            .orderBy(product.createdAt);
        return products.map((p) => (Object.assign(Object.assign({}, p), { imageUrl: `${process.env.BASE_URL}/api/products/image/${p.img}` })));
    }
    async getProduct(productId) {
        const productRecord = await db
            .select()
            .from(product)
            .where(eq(product.id, productId))
            .limit(1);
        if (!productRecord.length) {
            throw new Error("Product not found");
        }
        return Object.assign(Object.assign({}, productRecord[0]), { imageUrl: `${process.env.BASE_URL}/api/products/image/${productRecord[0].img}` });
    }
    async getProductImage(filename) {
        const filepath = join(config.storage.productImages, filename);
        return await readFile(filepath);
    }
    async getProductStats() {
        const [totalProducts, totalCategories, productsByCategory, priceRanges] = await Promise.all([
            // Total products
            db
                .select({ count: sql `count(*)` })
                .from(product)
                .then(result => result[0].count),
            // Total categories
            db
                .select({ count: sql `count(*)` })
                .from(productCategory)
                .then(result => result[0].count),
            // Products by category
            db
                .select({
                categoryId: productCategory.id,
                categoryName: productCategory.name,
                count: sql `count(${product.id})`
            })
                .from(productCategory)
                .leftJoin(product, eq(product.categoryId, productCategory.id))
                .groupBy(productCategory.id, productCategory.name),
            // Products by price range
            db
                .select({
                priceRange: sql `
            CASE 
              WHEN CAST(${product.price} AS DECIMAL) < 100 THEN 'Under $100'
              WHEN CAST(${product.price} AS DECIMAL) < 500 THEN '$100 - $499'
              WHEN CAST(${product.price} AS DECIMAL) < 1000 THEN '$500 - $999'
              ELSE '$1000 and above'
            END
          `,
                count: sql `count(*)`
            })
                .from(product)
                .groupBy(sql `
          CASE 
            WHEN CAST(${product.price} AS DECIMAL) < 100 THEN 'Under $100'
            WHEN CAST(${product.price} AS DECIMAL) < 500 THEN '$100 - $499'
            WHEN CAST(${product.price} AS DECIMAL) < 1000 THEN '$500 - $999'
            ELSE '$1000 and above'
          END
        `)
        ]);
        return {
            totalProducts,
            totalCategories,
            byCategory: productsByCategory,
            byPriceRange: priceRanges
        };
    }
}
