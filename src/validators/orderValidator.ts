import { z } from "zod"
import { OrderStatus } from "../entities/OrderStatus.ts"

// ───────────────── Order Query Validators ─────────────────

export const customerOrderQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.nativeEnum(OrderStatus).optional()
})

export const adminOrderQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.nativeEnum(OrderStatus).optional(),
    search: z.string().optional(),
    paymentStatus: z.enum(["paid", "unpaid"]).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    sortBy: z.enum(["createdAt", "totalAmount", "orderNumber"]).default("createdAt"),
    order: z.enum(["ASC", "DESC"]).default("DESC")
})

// ───────────────── Order Status Update Validators ─────────────────

// Filter out PENDING for manual status transitions
export const updateOrderStatusSchema = z.object({
    status: z.enum([
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED
    ]),
    message: z.string().max(500).optional(),
    location: z.string().max(200).optional()
})

export const updateShippingSchema = z.object({
    trackingNumber: z.string().min(1, "Tracking number is required"),
    shippingProvider: z.string().min(1, "Shipping provider is required"),
    message: z.string().max(500).optional()
})

export const cancelOrderSchema = z.object({
    reason: z.string().min(1, "Cancellation reason is required").max(500)
})

// ───────────────── Inferred Types ─────────────────

export type CustomerOrderQueryInput = z.infer<typeof customerOrderQuerySchema>
export type AdminOrderQueryInput = z.infer<typeof adminOrderQuerySchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
export type UpdateShippingInput = z.infer<typeof updateShippingSchema>
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>
