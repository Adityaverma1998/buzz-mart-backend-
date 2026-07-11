import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { UserDevice } from "./UserDevice.ts"
import type { Address } from "./Address.ts"
import type { Cart } from "./Cart.ts"
import type { Order } from "./Order.ts"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id!: number

    @Column({ type: "varchar" })
    firstName!: string

    @Column({ type: "varchar" })
    lastName!: string

    @Column({ type: "varchar", unique: true })
    email!: string

    @Column({ type: "varchar", nullable: true })
    password?: string

    @Column({ type: "varchar", nullable: true })
    phone?: string

    // E.g., 'local', 'google', 'github', 'facebook'
    @Column({ type: "varchar", default: 'local' })
    provider!: string

    // The unique user ID returned by the OAuth provider (e.g. Google profile ID, GitHub user ID)
    @Column({ type: "varchar", nullable: true })
    providerUserId?: string

    @Column({
        type: "enum",
        enum: ["admin", "customer"],
        default: "customer"
    })
    role!: "admin" | "customer"

    @Column({ type: "boolean", default: true })
    isActive!: boolean

    @OneToMany(() => UserDevice, (device) => device.user)
    devices!: UserDevice[]

    // Lazy-loaded relations for the order/cart domain
    @OneToMany("Address", "user")
    addresses!: Address[]

    @OneToMany("Cart", "user")
    carts!: Cart[]

    @OneToMany("Order", "user")
    orders!: Order[]

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date
}
