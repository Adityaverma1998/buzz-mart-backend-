import { DataSource, EntityManager, Repository } from "typeorm"
import { Order } from "../entities/Order.ts"
import { OrderStatus } from "../entities/OrderStatus.ts"
import { OrderTracking } from "../entities/OrderTracking.ts"
import { OrderItem } from "../entities/OrderItem.ts"
import { Product } from "../entities/Product.ts"
import createHttpError from "http-errors"
import { OrderStatusService } from "./OrderStatusService.ts"
import { InventoryService } from "./InventoryService.ts"
import { AuditService } from "./AuditService.ts"
import { AuditAction } from "../entities/AuditLog.ts"
import type { 
    CustomerOrderQueryInput, 
    AdminOrderQueryInput, 
    UpdateOrderStatusInput, 
    UpdateShippingInput, 
    CancelOrderInput 
} from "../validators/orderValidator.ts"

export class OrderService {
    private dataSource: DataSource
    private orderRepository: Repository<Order>
    private orderStatusService: OrderStatusService
    private inventoryService: InventoryService
    private auditService: AuditService

    constructor(
        dataSource: DataSource,
        orderRepository: Repository<Order>,
        orderStatusService: OrderStatusService,
        inventoryService: InventoryService,
        auditService: AuditService
    ) {
        this.dataSource = dataSource
        this.orderRepository = orderRepository
        this.orderStatusService = orderStatusService
        this.inventoryService = inventoryService
        this.auditService = auditService
    }

    /**
     * Customer: Get order details.
     */
    async getCustomerOrder(orderId: string, userId: number): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, userId },
            relations: { items: true, trackingHistory: true, payments: true }
        })
        if (!order) {
            throw new createHttpError.NotFound("Order not found")
        }
        return order
    }

    /**
     * Admin: Get order details.
     */
    async getAdminOrder(orderId: string): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: { items: true, trackingHistory: true, payments: true, user: true }
        })
        if (!order) {
            throw new createHttpError.NotFound("Order not found")
        }
        return order
    }

    /**
     * Customer: List orders with pagination.
     */
    async listCustomerOrders(userId: number, query: CustomerOrderQueryInput): Promise<{ orders: Order[]; total: number }> {
        const { page, limit, status } = query
        const skip = (page - 1) * limit

        const where: any = { userId }
        if (status) {
            where.status = status
        }

        const [orders, total] = await this.orderRepository.findAndCount({
            where,
            order: { createdAt: "DESC" },
            skip,
            take: limit
        })

        return { orders, total }
    }

    /**
     * Admin: List all orders with advanced filtering and pagination.
     */
    async listAdminOrders(query: AdminOrderQueryInput): Promise<{ orders: Order[]; total: number }> {
        const { page, limit, status, search, paymentStatus, dateFrom, dateTo, sortBy, order } = query
        const skip = (page - 1) * limit

        const queryBuilder = this.orderRepository.createQueryBuilder("order")
            .leftJoinAndSelect("order.user", "user")
            .skip(skip)
            .take(limit)
            .orderBy(`order.${sortBy}`, order)

        if (status) {
            queryBuilder.andWhere("order.status = :status", { status })
        }

        if (paymentStatus) {
            const isPaid = paymentStatus === "paid"
            queryBuilder.andWhere("order.isPaid = :isPaid", { isPaid })
        }

        if (dateFrom) {
            queryBuilder.andWhere("order.createdAt >= :dateFrom", { dateFrom })
        }

        if (dateTo) {
            queryBuilder.andWhere("order.createdAt <= :dateTo", { dateTo })
        }

        if (search) {
            queryBuilder.andWhere(
                "(order.orderNumber ILIKE :search OR user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)",
                { search: `%${search}%` }
            )
        }

        const [orders, total] = await queryBuilder.getManyAndCount()
        return { orders, total }
    }

    /**
     * Admin: Update status of an order (state machine validated).
     */
    async updateStatus(orderId: string, input: UpdateOrderStatusInput, adminId: number): Promise<Order> {
        return await this.dataSource.transaction(async (manager: EntityManager) => {
            const order = await manager.findOne(Order, {
                where: { id: orderId },
                relations: { items: true }
            })

            if (!order) {
                throw new createHttpError.NotFound("Order not found")
            }

            const oldStatus = order.status
            const newStatus = input.status as OrderStatus

            if (!this.orderStatusService.isValidTransition(oldStatus, newStatus)) {
                throw new createHttpError.BadRequest(
                    `Invalid transition from ${oldStatus} to ${newStatus}. Valid next states: ${this.orderStatusService.getValidTransitions(oldStatus).join(", ")}`
                )
            }

            // Perform inventory updates if needed based on transition
            if (newStatus === OrderStatus.CONFIRMED && oldStatus === OrderStatus.PENDING) {
                // Moving from PENDING to CONFIRMED: Confirm stock deduction
                for (const item of order.items) {
                    if (item.productId) {
                        await this.inventoryService.confirmStockDeduction(item.productId, item.quantity, manager)
                    }
                }
            } else if (newStatus === OrderStatus.CANCELLED) {
                // Handle cancellation stock recovery
                if (oldStatus === OrderStatus.PENDING) {
                    // Just release reservation
                    for (const item of order.items) {
                        if (item.productId) {
                            await this.inventoryService.releaseStock(item.productId, item.quantity, manager)
                        }
                    }
                } else if (oldStatus === OrderStatus.CONFIRMED || oldStatus === OrderStatus.PROCESSING) {
                    // Restock directly since stock was already deducted
                    for (const item of order.items) {
                        if (item.productId) {
                            await manager.createQueryBuilder()
                                .update(Product)
                                .set({ stock: () => `"stock" + ${item.quantity}` })
                                .where("id = :id", { id: item.productId })
                                .execute()
                        }
                    }
                }
            }

            // Update order status
            order.status = newStatus
            const updatedOrder = await manager.save(Order, order)

            // Log history
            const tracking = new OrderTracking()
            tracking.orderId = orderId
            tracking.status = newStatus
            tracking.message = input.message ?? `Order status changed to ${newStatus}`
            if (input.location !== undefined) {
                tracking.location = input.location
            }
            await manager.save(OrderTracking, tracking)

            // Audit Log
            await this.auditService.log({
                userId: adminId,
                action: AuditAction.ORDER_STATUS_CHANGED,
                entityType: "Order",
                entityId: orderId,
                oldValues: { status: oldStatus },
                newValues: { status: newStatus }
            })

            return updatedOrder
        })
    }

    /**
     * Admin: Update shipping info (transition to SHIPPED).
     */
    async updateShipping(orderId: string, input: UpdateShippingInput, adminId: number): Promise<Order> {
        return await this.dataSource.transaction(async (manager: EntityManager) => {
            const order = await manager.findOne(Order, {
                where: { id: orderId }
            })

            if (!order) {
                throw new createHttpError.NotFound("Order not found")
            }

            const oldStatus = order.status
            const newStatus = OrderStatus.SHIPPED

            if (!this.orderStatusService.isValidTransition(oldStatus, newStatus)) {
                throw new createHttpError.BadRequest(`Invalid transition from ${oldStatus} to ${newStatus}`)
            }

            order.status = newStatus
            order.trackingNumber = input.trackingNumber
            order.shippingProvider = input.shippingProvider
            const updatedOrder = await manager.save(Order, order)

            const tracking = new OrderTracking()
            tracking.orderId = orderId
            tracking.status = newStatus
            tracking.message = input.message ?? `Shipped via ${input.shippingProvider}. Tracking No: ${input.trackingNumber}`
            await manager.save(OrderTracking, tracking)

            await this.auditService.log({
                userId: adminId,
                action: AuditAction.ORDER_STATUS_CHANGED,
                entityType: "Order",
                entityId: orderId,
                oldValues: { status: oldStatus },
                newValues: { status: newStatus, trackingNumber: input.trackingNumber, shippingProvider: input.shippingProvider }
            })

            return updatedOrder
        })
    }

    /**
     * Customer: Cancel order.
     */
    async cancelOrderByCustomer(orderId: string, input: CancelOrderInput, userId: number): Promise<Order> {
        return await this.dataSource.transaction(async (manager: EntityManager) => {
            const order = await manager.findOne(Order, {
                where: { id: orderId, userId },
                relations: { items: true }
            })

            if (!order) {
                throw new createHttpError.NotFound("Order not found")
            }

            const oldStatus = order.status
            const newStatus = OrderStatus.CANCELLED

            if (!this.orderStatusService.canCustomerCancel(oldStatus)) {
                throw new createHttpError.BadRequest("This order cannot be cancelled anymore as it is already being processed or shipped.")
            }

            if (!this.orderStatusService.isValidTransition(oldStatus, newStatus)) {
                throw new createHttpError.BadRequest(`Invalid transition from ${oldStatus} to ${newStatus}`)
            }

            // Release inventory reservation
            for (const item of order.items) {
                if (item.productId) {
                    await this.inventoryService.releaseStock(item.productId, item.quantity, manager)
                }
            }

            order.status = newStatus
            const updatedOrder = await manager.save(Order, order)

            const tracking = new OrderTracking()
            tracking.orderId = orderId
            tracking.status = newStatus
            tracking.message = `Cancelled by customer. Reason: ${input.reason}`
            await manager.save(OrderTracking, tracking)

            await this.auditService.log({
                userId,
                action: AuditAction.ORDER_CANCELLED,
                entityType: "Order",
                entityId: orderId,
                oldValues: { status: oldStatus },
                newValues: { status: newStatus, cancellationReason: input.reason }
            })

            return updatedOrder
        })
    }
}
