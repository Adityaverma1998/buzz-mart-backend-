import { z } from "zod"

// ───────────────── Cart Validators ─────────────────

export const addCartItemSchema = z.object({
    productId: z.string().uuid("Invalid product ID"),
    variantId: z.string().uuid("Invalid variant ID").optional(),
    quantity: z.number().int("Quantity must be an integer").min(1, "Quantity must be at least 1")
})

export const updateCartItemSchema = z.object({
    quantity: z.number().int("Quantity must be an integer").min(1, "Quantity must be at least 1")
})

// ───────────────── Inferred Types ─────────────────

export type AddCartItemInput = z.infer<typeof addCartItemSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>
