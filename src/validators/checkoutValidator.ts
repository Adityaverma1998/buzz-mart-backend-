import { z } from "zod"

// ───────────────── Checkout Validators ─────────────────

export const checkoutPreviewSchema = z.object({
    shippingAddressId: z.string().uuid("Invalid shipping address ID"),
    billingAddressId: z.string().uuid("Invalid billing address ID").optional(),
    couponCode: z.string().trim().optional()
})

export const placeOrderSchema = z.object({
    shippingAddressId: z.string().uuid("Invalid shipping address ID"),
    billingAddressId: z.string().uuid("Invalid billing address ID").optional(),
    couponCode: z.string().trim().optional(),
    paymentMethod: z.enum(["cod", "razorpay", "stripe"]).default("cod"),
    notes: z.string().max(500).optional(),
    idempotencyKey: z.string().min(1).optional()
})

// ───────────────── Inferred Types ─────────────────

export type CheckoutPreviewInput = z.infer<typeof checkoutPreviewSchema>
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>
