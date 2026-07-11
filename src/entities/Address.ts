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
import { User } from "./User.ts"

export type AddressType = "billing" | "shipping"

@Entity()
@Index(["user", "addressType"])
export class Address {
    @PrimaryGeneratedColumn("uuid")
    id!: string

    @ManyToOne(() => User, (user) => user.addresses, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User

    @Column({ type: "int" })
    userId!: number

    @Column({ type: "enum", enum: ["billing", "shipping"], default: "shipping" })
    addressType!: AddressType

    @Column({ type: "varchar" })
    fullName!: string

    @Column({ type: "varchar" })
    phoneNumber!: string

    @Column({ type: "varchar" })
    street!: string

    @Column({ type: "varchar", nullable: true })
    apartment?: string

    @Column({ type: "varchar" })
    city!: string

    @Column({ type: "varchar" })
    state!: string

    @Column({ type: "varchar" })
    postalCode!: string

    @Column({ type: "varchar", default: "India" })
    country!: string

    @Column({ type: "varchar", nullable: true })
    landmark?: string

    @Column({ type: "boolean", default: false })
    isDefault!: boolean

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date
}

/**
 * Immutable address snapshot stored on orders.
 * Ensures historical accuracy even if the user edits/deletes their saved address.
 */
export type AddressSnapshot = {
    fullName: string
    phoneNumber: string
    street: string
    apartment?: string | null | undefined
    city: string
    state: string
    postalCode: string
    country: string
    landmark?: string | null | undefined
}

/**
 * Converts an Address entity to an immutable snapshot for order storage.
 */
export function toAddressSnapshot(address: Address): AddressSnapshot {
    return {
        fullName: address.fullName,
        phoneNumber: address.phoneNumber,
        street: address.street,
        apartment: address.apartment ?? null,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        landmark: address.landmark ?? null
    }
}
