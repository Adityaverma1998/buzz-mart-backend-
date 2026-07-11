import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index
} from "typeorm"

export enum AuditAction {
    ORDER_CREATED = "ORDER_CREATED",
    ORDER_STATUS_CHANGED = "ORDER_STATUS_CHANGED",
    ORDER_CANCELLED = "ORDER_CANCELLED",
    PAYMENT_PROCESSED = "PAYMENT_PROCESSED",
    REFUND_PROCESSED = "REFUND_PROCESSED",
    INVENTORY_RESERVED = "INVENTORY_RESERVED",
    INVENTORY_RELEASED = "INVENTORY_RELEASED",
    COUPON_USED = "COUPON_USED",
    PRODUCT_CREATED = "PRODUCT_CREATED",
    PRODUCT_UPDATED = "PRODUCT_UPDATED",
    PRODUCT_DELETED = "PRODUCT_DELETED",
    ADMIN_ACTION = "ADMIN_ACTION"
}

@Entity()
@Index(["entityType", "entityId"])
@Index(["userId", "createdAt"])
@Index(["createdAt"])
export class AuditLog {
    @PrimaryGeneratedColumn("uuid")
    id!: string

    /** The user who performed the action (null for system-initiated events) */
    @Column({ type: "int", nullable: true })
    userId?: number

    @Column({ type: "enum", enum: AuditAction })
    action!: AuditAction

    /** The type of entity affected (e.g., "Order", "Product") */
    @Column({ type: "varchar" })
    entityType!: string

    /** The ID of the affected entity */
    @Column({ type: "varchar" })
    entityId!: string

    /** Previous values before the change */
    @Column({ type: "jsonb", nullable: true })
    oldValues?: Record<string, unknown>

    /** New values after the change */
    @Column({ type: "jsonb", nullable: true })
    newValues?: Record<string, unknown>

    /** IP address of the request */
    @Column({ type: "varchar", nullable: true })
    ipAddress?: string

    @CreateDateColumn()
    createdAt!: Date
}
