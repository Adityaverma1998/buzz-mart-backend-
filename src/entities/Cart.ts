import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index
} from "typeorm"
import { User } from "./User.ts"
import { CartItem } from "./CartItem.ts"
import { DecimalTransformer } from "../utils/DecimalTransformer.ts"

export enum CartStatus {
    ACTIVE = "ACTIVE",
    ABANDONED = "ABANDONED",
    CONVERTED = "CONVERTED"
}

@Entity()
@Index(["userId", "status"])
export class Cart {
    @PrimaryGeneratedColumn("uuid")
    id!: string

    @ManyToOne(() => User, (user) => user.carts, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User

    @Column({ type: "int" })
    userId!: number

    @OneToMany(() => CartItem, (item) => item.cart, { cascade: true, eager: true })
    items!: CartItem[]

    @Column({ type: "enum", enum: CartStatus, default: CartStatus.ACTIVE })
    status!: CartStatus

    @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: DecimalTransformer })
    totalPrice!: number

    @Column({ type: "int", default: 0 })
    itemCount!: number

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date

    @Column({ type: "timestamptz", nullable: true })
    expiresAt?: Date
}
