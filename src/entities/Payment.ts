import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index
} from "typeorm"
import { Order } from "./Order.ts"
import { DecimalTransformer } from "../utils/DecimalTransformer.ts"

export enum PaymentStatus {
    PENDING = "PENDING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED"
}

@Entity()
@Index(["orderId", "createdAt"])
export class Payment {
    @PrimaryGeneratedColumn("uuid")
    id!: string

    @ManyToOne(() => Order, (order) => order.payments, { onDelete: "CASCADE" })
    @JoinColumn({ name: "orderId" })
    order!: Order

    @Column({ type: "uuid" })
    orderId!: string

    /** Unique transaction ID from payment gateway or internal reference */
    @Column({ type: "varchar", unique: true })
    transactionId!: string

    @Column({ type: "varchar" })
    paymentMethod!: string

    @Column({ type: "varchar" })
    paymentGateway!: string

    @Column({ type: "decimal", precision: 12, scale: 2, transformer: DecimalTransformer })
    amount!: number

    @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.PENDING })
    status!: PaymentStatus

    /** Raw response from payment gateway (for debugging/auditing). Never expose to frontend. */
    @Column({ type: "jsonb", nullable: true })
    gatewayResponse?: Record<string, unknown>

    @Column({ type: "text", nullable: true })
    failureReason?: string

    @Column({ type: "timestamptz", nullable: true })
    completedAt?: Date

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date
}
