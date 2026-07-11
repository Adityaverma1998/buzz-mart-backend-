import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    OneToMany,
    Check
} from "typeorm"
import { Category } from "./Category.ts"
import { Brand } from "./Brand.ts"
import { User } from "./User.ts"
import { ProductImage } from "./ProductImage.ts"
import { ProductVariant } from "./ProductVariant.ts"
import { DecimalTransformer } from "../utils/DecimalTransformer.ts"
import { toMoney } from "../utils/money.ts"

export enum ProductStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    OUT_OF_STOCK = "OUT_OF_STOCK",
    DRAFT = "DRAFT"
}

@Entity()
@Check(`"stock" >= 0`)
@Check(`"reserved" >= 0`)
@Check(`"stock" >= "reserved"`)
@Check(`"price" >= 0`)
export class Product {
    @PrimaryGeneratedColumn("uuid")
    id!: string

    @Column({ type: "varchar" })
    name!: string

    @Column({ type: "varchar", unique: true })
    slug!: string

    @Column({ type: "varchar", nullable: true })
    shortDescription?: string

    @Column({ type: "text", nullable: true })
    description?: string

    @Column({ type: "varchar", unique: true })
    sku!: string

    @Column({ type: "varchar", nullable: true })
    barcode?: string

    // Relations
    @ManyToOne(() => Category, { nullable: true, onDelete: "SET NULL" })
    category?: Category

    @Column({ type: "uuid", nullable: true })
    categoryId?: string

    @ManyToOne(() => Category, { nullable: true, onDelete: "SET NULL" })
    subCategory?: Category

    @Column({ type: "uuid", nullable: true })
    subCategoryId?: string

    @ManyToOne(() => Brand, { nullable: true, onDelete: "SET NULL" })
    brand?: Brand

    @Column({ type: "uuid", nullable: true })
    brandId?: string

    // Pricing
    @Column({ type: "decimal", precision: 10, scale: 2, default: 0, transformer: DecimalTransformer })
    price!: number

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, transformer: DecimalTransformer })
    salePrice?: number

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, transformer: DecimalTransformer })
    costPrice?: number

    // Inventory
    @Column({ type: "int", default: 0 })
    stock!: number

    @Column({ type: "int", default: 0 })
    reserved!: number

    @Column({ type: "int", default: 0 })
    minStock!: number

    // Physical attributes
    @Column({ type: "decimal", precision: 8, scale: 2, nullable: true, transformer: DecimalTransformer })
    weight?: number

    @Column({ type: "decimal", precision: 8, scale: 2, nullable: true, transformer: DecimalTransformer })
    length?: number

    @Column({ type: "decimal", precision: 8, scale: 2, nullable: true, transformer: DecimalTransformer })
    width?: number

    @Column({ type: "decimal", precision: 8, scale: 2, nullable: true, transformer: DecimalTransformer })
    height?: number

    @Column({ type: "varchar", nullable: true })
    unit?: string

    // Tax
    @Column({ type: "decimal", precision: 5, scale: 2, default: 0, transformer: DecimalTransformer })
    taxPercentage!: number

    // Status & visibility
    @Column({ type: "enum", enum: ProductStatus, default: ProductStatus.DRAFT })
    status!: ProductStatus

    @Column({ type: "boolean", default: false })
    featured!: boolean

    @Column({ type: "boolean", default: true })
    isActive!: boolean

    @Column({ type: "varchar", nullable: true })
    thumbnail?: string

    // Audit relationships
    @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
    createdBy?: User

    @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
    updatedBy?: User

    // Child relations
    @OneToMany(() => ProductImage, (image) => image.product)
    images!: ProductImage[]

    @OneToMany(() => ProductVariant, (variant) => variant.product)
    variants!: ProductVariant[]

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date

    @DeleteDateColumn()
    deletedAt?: Date

    // ───────────────── Helper Methods ─────────────────

    /**
     * Returns the available stock (total minus reserved).
     */
    getAvailableStock(): number {
        return this.stock - this.reserved
    }

    /**
     * Returns true if the product has an active discount (salePrice < price).
     */
    hasDiscount(): boolean {
        return this.salePrice !== null && this.salePrice !== undefined && this.salePrice < this.price
    }

    /**
     * Returns the discount percentage if a sale price is set.
     */
    getDiscountPercentage(): number {
        if (!this.hasDiscount() || this.price === 0) return 0
        return toMoney(((this.price - this.salePrice!) / this.price) * 100)
    }

    /**
     * Returns the price the customer actually pays (salePrice if discounted, otherwise price).
     */
    getEffectivePrice(): number {
        return this.hasDiscount() ? toMoney(this.salePrice!) : toMoney(this.price)
    }

    /**
     * Returns profit per unit (effectivePrice - costPrice).
     */
    getProfit(): number {
        if (!this.costPrice) return 0
        return toMoney(this.getEffectivePrice() - this.costPrice)
    }
}
