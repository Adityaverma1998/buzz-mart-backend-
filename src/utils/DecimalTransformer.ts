import type { ValueTransformer } from "typeorm"

/**
 * TypeORM value transformer for decimal/numeric columns.
 * PostgreSQL returns decimal values as strings; this transformer
 * converts them to JavaScript numbers on read and ensures
 * consistent storage on write.
 */
export const DecimalTransformer: ValueTransformer = {
    to(value: number | null | undefined): number | null | undefined {
        return value
    },
    from(value: string | number | null | undefined): number | null {
        if (value === null || value === undefined) {
            return null
        }
        const parsed = typeof value === "string" ? parseFloat(value) : value
        return isNaN(parsed) ? null : parsed
    }
}
