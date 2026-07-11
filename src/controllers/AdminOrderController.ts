import type { Response, NextFunction } from "express"
import type { AuthRequest } from "../middlewares/authMiddleware.ts"
import { OrderService } from "../services/OrderService.ts"
import { adminOrderQuerySchema, updateOrderStatusSchema, updateShippingSchema } from "../validators/orderValidator.ts"

export class AdminOrderController {
    private orderService: OrderService

    constructor(orderService: OrderService) {
        this.orderService = orderService
    }

    async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const order = await this.orderService.getAdminOrder(id as string)

            res.status(200).json({
                success: true,
                message: "Order retrieved successfully by admin",
                data: order
            })
        } catch (error) {
            next(error)
        }
    }

    async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = adminOrderQuerySchema.parse(req.query)
            const { orders, total } = await this.orderService.listAdminOrders(query)

            res.status(200).json({
                success: true,
                message: "All orders retrieved successfully by admin",
                data: orders,
                meta: {
                    total,
                    page: query.page,
                    limit: query.limit,
                    totalPages: Math.ceil(total / query.limit)
                }
            })
        } catch (error) {
            next(error)
        }
    }

    async updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const adminId = req.auth.sub
            const { id } = req.params
            const validated = updateOrderStatusSchema.parse(req.body)
            const order = await this.orderService.updateStatus(id as string, validated, adminId)

            res.status(200).json({
                success: true,
                message: "Order status updated successfully",
                data: {
                    id: order.id,
                    orderNumber: order.orderNumber,
                    status: order.status
                }
            })
        } catch (error) {
            next(error)
        }
    }

    async updateShipping(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const adminId = req.auth.sub
            const { id } = req.params
            const validated = updateShippingSchema.parse(req.body)
            const order = await this.orderService.updateShipping(id as string, validated, adminId)

            res.status(200).json({
                success: true,
                message: "Order shipping details updated successfully",
                data: {
                    id: order.id,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    trackingNumber: order.trackingNumber,
                    shippingProvider: order.shippingProvider
                }
            })
        } catch (error) {
            next(error)
        }
    }
}
