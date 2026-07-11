/**
 * Centralized money/currency utilities.
 * All monetary calculations in the application must use these functions
 * to ensure consistent rounding and avoid floating-point drift.
 */

/**
 * Rounds a monetary value to 2 decimal places using banker's rounding.
 */
export function roundMoney(value: number): number {
    return Math.round(value * 100) / 100
}

/**
 * Safely parses a value that may be a string (from PostgreSQL decimal)
 * or a number into a guaranteed number. Returns 0 for invalid input.
 */
export function toMoney(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0
    const parsed = typeof value === "string" ? parseFloat(value) : value
    return isNaN(parsed) ? 0 : roundMoney(parsed)
}

/**
 * Shipping cost configuration.
 * Free shipping above the threshold; flat rate otherwise.
 */
export const SHIPPING_CONFIG = {
    FLAT_RATE: 50,
    FREE_THRESHOLD: 500
} as const

/**
 * Calculate shipping cost based on subtotal.
 */
export function calculateShipping(subtotal: number): number {
    if (subtotal >= SHIPPING_CONFIG.FREE_THRESHOLD) return 0
    return SHIPPING_CONFIG.FLAT_RATE
}
