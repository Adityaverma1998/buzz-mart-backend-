import type { Response, NextFunction } from "express"
import type { AuthRequest } from "../middlewares/authMiddleware.ts"
import { CheckoutService } from "../services/CheckoutService.ts"
import { checkoutPreviewSchema, placeOrderSchema } from "../validators/checkoutValidator.ts"

export class CheckoutController {
    private checkoutService: CheckoutService

    constructor(checkoutService: CheckoutService) {
        this.checkoutService = checkoutService
    }

    async preview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const validated = checkoutPreviewSchema.parse(req.body)
            const previewResult = await this.checkoutService.preview(userId, validated)

            res.status(200).json({
                success: true,
                message: "Checkout preview calculated successfully",
                data: previewResult
            })
        } catch (error) {
            next(error)
        }
    }

    async placeOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const validated = placeOrderSchema.parse(req.body)
            const order = await this.checkoutService.placeOrder(userId, validated)

            res.status(201).json({
                success: true,
                message: "Order placed successfully",
                data: {
                    id: order.id,
                    orderNumber: order.orderNumber,
                    totalAmount: order.totalAmount,
                    status: order.status,
                    paymentMethod: order.paymentMethod,
                    isPaid: order.isPaid
                }
            })
        } catch (error) {
            next(error)
        }
    }
}
