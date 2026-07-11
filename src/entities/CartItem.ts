import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Check
} from "typeorm"
import { Cart } from "./Cart.ts"
import { Product } from "./Product.ts"
import { ProductVariant } from "./ProductVariant.ts"
import { DecimalTransformer } from "../utils/DecimalTransformer.ts"

@Entity()
@Check(`"quantity" > 0`)
@Check(`"price" >= 0`)
@Index(["cart", "product", "variant"], { unique: true })
export class CartItem {
    @PrimaryGeneratedColumn("uuid")
    id!: string

    @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: "CASCADE" })
    @JoinColumn({ name: "cartId" })
    cart!: Cart

    @Column({ type: "uuid" })
    cartId!: string

    @ManyToOne(() => Product, { onDelete: "CASCADE" })
    @JoinColumn({ name: "productId" })
    product!: Product

    @Column({ type: "uuid" })
    productId!: string

    @ManyToOne(() => ProductVariant, { nullable: true, onDelete: "CASCADE" })
    @JoinColumn({ name: "variantId" })
    variant?: ProductVariant

    @Column({ type: "uuid", nullable: true })
    variantId?: string | null

    @Column({ type: "int" })
    quantity!: number

    /** Snapshot price at the time of adding to cart (revalidated at checkout) */
    @Column({ type: "decimal", precision: 10, scale: 2, transformer: DecimalTransformer })
    price!: number

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date
}
