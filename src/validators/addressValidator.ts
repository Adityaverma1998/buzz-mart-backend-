import { z } from "zod"

// ───────────────── Address Validators ─────────────────

export const createAddressSchema = z.object({
    addressType: z.enum(["billing", "shipping"]).default("shipping"),
    fullName: z.string().min(1, "Full name is required"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    street: z.string().min(1, "Street is required"),
    apartment: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    country: z.string().default("India"),
    landmark: z.string().optional(),
    isDefault: z.boolean().default(false)
})

export const updateAddressSchema = createAddressSchema.partial()

// ───────────────── Inferred Types ─────────────────

export type CreateAddressInput = z.infer<typeof createAddressSchema>
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>
