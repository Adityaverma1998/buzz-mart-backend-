import type { Response, NextFunction } from "express"
import type { AuthRequest } from "../middlewares/authMiddleware.ts"
import { OrderService } from "../services/OrderService.ts"
import { customerOrderQuerySchema, cancelOrderSchema } from "../validators/orderValidator.ts"

export class OrderController {
    private orderService: OrderService

    constructor(orderService: OrderService) {
        this.orderService = orderService
    }

    async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const { id } = req.params
            const order = await this.orderService.getCustomerOrder(id as string, userId)

            res.status(200).json({
                success: true,
                message: "Order retrieved successfully",
                data: order
            })
        } catch (error) {
            next(error)
        }
    }

    async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const query = customerOrderQuerySchema.parse(req.query)
            const { orders, total } = await this.orderService.listCustomerOrders(userId, query)

            res.status(200).json({
                success: true,
                message: "Orders retrieved successfully",
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

    async cancel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const { id } = req.params
            const validated = cancelOrderSchema.parse(req.body)
            const order = await this.orderService.cancelOrderByCustomer(id as string, validated, userId)

            res.status(200).json({
                success: true,
                message: "Order cancelled successfully",
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
}
