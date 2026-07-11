import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
    Check
} from "typeorm"
import { User } from "./User.ts"
import { OrderItem } from "./OrderItem.ts"
import { OrderTracking } from "./OrderTracking.ts"
import { Payment } from "./Payment.ts"
import type { AddressSnapshot } from "./Address.ts"
import { DecimalTransformer } from "../utils/DecimalTransformer.ts"
import { OrderStatus } from "./OrderStatus.ts"

@Entity()
@Check(`"subtotal" >= 0`)
@Check(`"shippingCost" >= 0`)
@Check(`"discountAmount" >= 0`)
@Check(`"taxAmount" >= 0`)
@Check(`"totalAmount" >= 0`)
@Index(["userId", "createdAt"])
@Index(["status", "createdAt"])
export class Order {
    @PrimaryGeneratedColumn("uuid")
    id!: string

    @Column({ type: "varchar", unique: true })
    orderNumber!: string

    @ManyToOne(() => User, (user) => user.orders, { onDelete: "SET NULL", nullable: true })
    @JoinColumn({ name: "userId" })
    user?: User

    @Column({ type: "int", nullable: true })
    userId?: number

    @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
    items!: OrderItem[]

    @OneToMany(() => OrderTracking, (tracking) => tracking.order, { cascade: true })
    trackingHistory!: OrderTracking[]

    @OneToMany(() => Payment, (payment) => payment.order, { cascade: true })
    payments!: Payment[]

    @Column({ type: "jsonb" })
    shippingAddress!: AddressSnapshot

    @Column({ type: "jsonb" })
    billingAddress!: AddressSnapshot

    // Pricing (all transformed from string to number)
    @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: DecimalTransformer })
    subtotal!: number

    @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: DecimalTransformer })
    shippingCost!: number

    @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: DecimalTransformer })
    discountAmount!: number

    @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: DecimalTransformer })
    taxAmount!: number

    @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: DecimalTransformer })
    totalAmount!: number

    @Column({ type: "enum", enum: OrderStatus, default: OrderStatus.PENDING })
    status!: OrderStatus

    @Column({ type: "varchar", nullable: true })
    paymentMethod?: string

    @Column({ type: "boolean", default: false })
    isPaid!: boolean

    @Column({ type: "timestamptz", nullable: true })
    paidAt?: Date

    @Column({ type: "varchar", nullable: true })
    trackingNumber?: string

    @Column({ type: "varchar", nullable: true })
    shippingProvider?: string

    @Column({ type: "text", nullable: true })
    notes?: string

    /** Coupon code applied to this order (stored as snapshot string) */
    @Column({ type: "varchar", nullable: true })
    couponCode?: string

    /** Idempotency key to prevent duplicate order placement */
    @Column({ type: "varchar", nullable: true, unique: true })
    idempotencyKey?: string

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date

    @DeleteDateColumn()
    deletedAt?: Date
}
