import { z } from "zod";

// ───────────────── Product Validators ─────────────────

const baseProductSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    slug: z.string().min(1, "Slug is required"),
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    sku: z.string().min(1, "SKU is required"),
    barcode: z.string().optional(),
    categoryId: z.string().uuid("Invalid category ID").optional(),
    subCategoryId: z.string().uuid("Invalid sub-category ID").optional(),
    brandId: z.string().uuid("Invalid brand ID").optional(),
    price: z.number().min(0, "Price must be >= 0"),
    salePrice: z.number().min(0).optional(),
    costPrice: z.number().min(0).optional(),
    stock: z.number().int().min(0, "Stock must be >= 0").default(0),
    minStock: z.number().int().min(0).default(0),
    weight: z.number().min(0).optional(),
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
    unit: z.string().optional(),
    taxPercentage: z.number().min(0).max(100).default(0),
    status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK", "DRAFT"]).default("DRAFT"),
    featured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    thumbnail: z.string().optional()
});

export const createProductSchema = baseProductSchema.refine(
    (data) => !data.salePrice || data.salePrice <= data.price,
    { message: "Sale price must be less than or equal to price", path: ["salePrice"] }
);

export const updateProductSchema = baseProductSchema.partial().refine(
    (data) => !data.salePrice || (data.price !== undefined ? data.salePrice <= data.price : true),
    { message: "Sale price must be less than or equal to price", path: ["salePrice"] }
);

export const updateProductStatusSchema = z.object({
    status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK", "DRAFT"])
});

// ───────────────── Category Validators ─────────────────

export const createCategorySchema = z.object({
    name: z.string().min(1, "Category name is required"),
    slug: z.string().min(1, "Slug is required"),
    icon: z.string().optional(),
    image: z.string().optional(),
    isActive: z.boolean().default(true),
    parentId: z.string().uuid("Invalid parent category ID").nullable().optional()
});

export const updateCategorySchema = createCategorySchema.partial();

// ───────────────── Brand Validators ─────────────────

export const createBrandSchema = z.object({
    name: z.string().min(1, "Brand name is required"),
    logo: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().default(true)
});

export const updateBrandSchema = createBrandSchema.partial();

// ───────────────── Product Variant Validators ─────────────────

export const createVariantSchema = z.object({
    variantName: z.string().min(1, "Variant name is required"),
    sku: z.string().optional(),
    price: z.number().min(0, "Price must be >= 0").default(0),
    salePrice: z.number().min(0).optional(),
    stock: z.number().int().min(0).default(0),
    attributes: z.record(z.string(), z.string()).optional()
});

export const updateVariantSchema = createVariantSchema.partial();

// ───────────────── Query Validators ─────────────────

export const productQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(["price", "createdAt", "name"]).default("createdAt"),
    order: z.enum(["ASC", "DESC"]).default("DESC"),
    search: z.string().optional(),
    category: z.string().uuid().optional(),
    brand: z.string().uuid().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK", "DRAFT"]).optional(),
    featured: z.coerce.boolean().optional()
});

// ───────────────── Inferred Types ─────────────────

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
