import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index
} from "typeorm"
import { Order, OrderStatus } from "./Order.ts"

@Entity()
@Index(["orderId", "createdAt"])
export class OrderTracking {
    @PrimaryGeneratedColumn("uuid")
    id!: string

    @ManyToOne(() => Order, (order) => order.trackingHistory, { onDelete: "CASCADE" })
    @JoinColumn({ name: "orderId" })
    order!: Order

    @Column({ type: "uuid" })
    orderId!: string

    @Column({ type: "enum", enum: OrderStatus })
    status!: OrderStatus

    @Column({ type: "text", nullable: true })
    message?: string

    @Column({ type: "varchar", nullable: true })
    location?: string

    @CreateDateColumn()
    createdAt!: Date
}
