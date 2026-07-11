import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index
} from "typeorm"
import { Coupon } from "./Coupon.ts"
import { User } from "./User.ts"
import { Order } from "./Order.ts"

@Entity()
@Index(["couponId", "userId"])
@Index(["orderId"])
export class CouponUsage {
    @PrimaryGeneratedColumn("uuid")
    id!: string

    @ManyToOne(() => Coupon, { onDelete: "CASCADE" })
    @JoinColumn({ name: "couponId" })
    coupon!: Coupon

    @Column({ type: "uuid" })
    couponId!: string

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User

    @Column({ type: "int" })
    userId!: number

    @ManyToOne(() => Order, { onDelete: "SET NULL", nullable: true })
    @JoinColumn({ name: "orderId" })
    order?: Order

    @Column({ type: "uuid", nullable: true })
    orderId?: string

    @CreateDateColumn()
    createdAt!: Date
}
