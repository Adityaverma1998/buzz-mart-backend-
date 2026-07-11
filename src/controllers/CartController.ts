import type { Response, NextFunction } from "express"
import type { AuthRequest } from "../middlewares/authMiddleware.ts"
import { CartService } from "../services/CartService.ts"
import { addCartItemSchema, updateCartItemSchema } from "../validators/cartValidator.ts"

export class CartController {
    private cartService: CartService

    constructor(cartService: CartService) {
        this.cartService = cartService
    }

    async getCart(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const cart = await this.cartService.getOrCreateActiveCart(userId)

            res.status(200).json({
                success: true,
                message: "Cart retrieved successfully",
                data: cart
            })
        } catch (error) {
            next(error)
        }
    }

    async addItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const validated = addCartItemSchema.parse(req.body)
            const cart = await this.cartService.addItem(userId, validated)

            res.status(200).json({
                success: true,
                message: "Item added to cart successfully",
                data: cart
            })
        } catch (error) {
            next(error)
        }
    }

    async updateItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const { itemId } = req.params
            const validated = updateCartItemSchema.parse(req.body)
            const cart = await this.cartService.updateItemQuantity(userId, itemId as string, validated)

            res.status(200).json({
                success: true,
                message: "Cart item quantity updated successfully",
                data: cart
            })
        } catch (error) {
            next(error)
        }
    }

    async removeItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const { itemId } = req.params
            const cart = await this.cartService.removeItem(userId, itemId as string)

            res.status(200).json({
                success: true,
                message: "Item removed from cart successfully",
                data: cart
            })
        } catch (error) {
            next(error)
        }
    }

    async clearCart(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            await this.cartService.clearCart(userId)

            res.status(200).json({
                success: true,
                message: "Cart cleared successfully"
            })
        } catch (error) {
            next(error)
        }
    }
}
