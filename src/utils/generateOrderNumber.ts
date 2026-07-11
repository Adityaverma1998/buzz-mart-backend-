import crypto from "crypto"

/**
 * Generates a unique, human-readable order number.
 * Format: BZM-YYYYMMDD-XXXXXX
 * Where XXXXXX is a 6-character uppercase alphanumeric random suffix.
 *
 * Collision probability is extremely low (~2 billion combinations per day).
 * The Order entity has a unique constraint on orderNumber as a safety net.
 */
export function generateOrderNumber(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const datePart = `${year}${month}${day}`

    // 6-char alphanumeric suffix using crypto for proper randomness
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const bytes = crypto.randomBytes(6)
    let suffix = ""
    for (let i = 0; i < 6; i++) {
        suffix += chars[bytes[i]! % chars.length]
    }

    return `BZM-${datePart}-${suffix}`
}
