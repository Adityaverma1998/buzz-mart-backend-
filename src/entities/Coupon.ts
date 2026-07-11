import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Check
} from "typeorm"
import { DecimalTransformer } from "../utils/DecimalTransformer.ts"

export enum CouponType {
    FIXED_AMOUNT = "FIXED_AMOUNT",
    PERCENTAGE = "PERCENTAGE"
}

@Entity()
@Check(`"value" > 0`)
@Check(`"usageCount" >= 0`)
@Check(`"expiresAt" > "validFrom"`)
export class Coupon {
    @PrimaryGeneratedColumn("uuid")
    id!: string

    @Column({ type: "varchar", unique: true })
    code!: string

    @Column({ type: "text", nullable: true })
    description?: string

    @Column({ type: "enum", enum: CouponType })
    type!: CouponType

    /** For PERCENTAGE: the percentage (e.g. 10 = 10%). For FIXED_AMOUNT: the amount in currency. */
    @Column({ type: "decimal", precision: 10, scale: 2, transformer: DecimalTransformer })
    value!: number

    /** Maximum discount amount (caps percentage-based discounts). Null = no cap. */
    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, transformer: DecimalTransformer })
    maxDiscountAmount?: number

    /** Minimum order subtotal required to use this coupon. */
    @Column({ type: "decimal", precision: 10, scale: 2, default: 0, transformer: DecimalTransformer })
    minOrderAmount!: number

    /** Total number of times this coupon can be used across all users. Null = unlimited. */
    @Column({ type: "int", nullable: true })
    usageLimit?: number

    /** Current total usage count. Atomically incremented. */
    @Column({ type: "int", default: 0 })
    usageCount!: number

    /** How many times a single user can use this coupon. */
    @Column({ type: "int", default: 1 })
    usagePerUser!: number

    @Column({ type: "boolean", default: true })
    isActive!: boolean

    @Column({ type: "timestamptz" })
    validFrom!: Date

    @Column({ type: "timestamptz" })
    expiresAt!: Date

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date
}
