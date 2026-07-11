import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Check
} from "typeorm"
import { Order } from "./Order.ts"
import { Product } from "./Product.ts"
import { ProductVariant } from "./ProductVariant.ts"
import { DecimalTransformer } from "../utils/DecimalTransformer.ts"

@Entity()
@Check(`"quantity" > 0`)
@Check(`"unitPrice" >= 0`)
@Check(`"totalPrice" >= 0`)
@Index(["orderId"])
@Index(["productId"])
export class OrderItem {
    @PrimaryGeneratedColumn("uuid")
    id!: string

    @ManyToOne(() => Order, (order) => order.items, { onDelete: "CASCADE" })
    @JoinColumn({ name: "orderId" })
    order!: Order

    @Column({ type: "uuid" })
    orderId!: string

    @ManyToOne(() => Product, { onDelete: "SET NULL", nullable: true })
    @JoinColumn({ name: "productId" })
    product?: Product

    @Column({ type: "uuid", nullable: true })
    productId?: string

    @ManyToOne(() => ProductVariant, { onDelete: "SET NULL", nullable: true })
    @JoinColumn({ name: "variantId" })
    variant?: ProductVariant

    @Column({ type: "uuid", nullable: true })
    variantId?: string

    // ───────────────── Immutable Snapshots ─────────────────
    // These fields preserve what the customer actually purchased,
    // even if the product is later renamed, repriced, or deleted.

    @Column({ type: "varchar" })
    productName!: string

    @Column({ type: "varchar" })
    productSku!: string

    @Column({ type: "varchar", nullable: true })
    productThumbnail?: string

    @Column({ type: "varchar", nullable: true })
    variantName?: string

    @Column({ type: "varchar", nullable: true })
    variantSku?: string

    @Column({ type: "jsonb", nullable: true })
    variantAttributes?: Record<string, string>

    // ───────────────── Pricing ─────────────────

    @Column({ type: "int" })
    quantity!: number

    @Column({ type: "decimal", precision: 10, scale: 2, transformer: DecimalTransformer })
    unitPrice!: number

    @Column({ type: "decimal", precision: 10, scale: 2, default: 0, transformer: DecimalTransformer })
    discountAmount!: number

    @Column({ type: "decimal", precision: 5, scale: 2, default: 0, transformer: DecimalTransformer })
    taxPercentage!: number

    @Column({ type: "decimal", precision: 10, scale: 2, default: 0, transformer: DecimalTransformer })
    taxAmount!: number

    @Column({ type: "decimal", precision: 12, scale: 2, transformer: DecimalTransformer })
    totalPrice!: number

    @CreateDateColumn()
    createdAt!: Date
}
