import type { Repository } from "typeorm"
import { Cart, CartStatus } from "../entities/Cart.ts"
import { CartItem } from "../entities/CartItem.ts"
import { Product } from "../entities/Product.ts"
import { ProductVariant } from "../entities/ProductVariant.ts"
import createHttpError from "http-errors"
import type { AddCartItemInput, UpdateCartItemInput } from "../validators/cartValidator.ts"
import { roundMoney, toMoney } from "../utils/money.ts"

export class CartService {
    private cartRepository: Repository<Cart>
    private cartItemRepository: Repository<CartItem>
    private productRepository: Repository<Product>
    private variantRepository: Repository<ProductVariant>

    constructor(
        cartRepository: Repository<Cart>,
        cartItemRepository: Repository<CartItem>,
        productRepository: Repository<Product>,
        variantRepository: Repository<ProductVariant>
    ) {
        this.cartRepository = cartRepository
        this.cartItemRepository = cartItemRepository
        this.productRepository = productRepository
        this.variantRepository = variantRepository
    }

    /**
     * Get or create the active cart for a user.
     */
    async getOrCreateActiveCart(userId: number): Promise<Cart> {
        let cart = await this.cartRepository.findOne({
            where: { userId, status: CartStatus.ACTIVE },
            relations: { items: { product: true, variant: true } }
        })

        if (!cart) {
            cart = new Cart()
            cart.userId = userId
            cart.status = CartStatus.ACTIVE
            cart.totalPrice = 0
            cart.itemCount = 0
            cart = await this.cartRepository.save(cart)
            cart.items = []
        }

        return cart
    }

    /**
     * Get the active cart for a user (read-only, returns null if none exists).
     */
    async getActiveCart(userId: number): Promise<Cart | null> {
        return await this.cartRepository.findOne({
            where: { userId, status: CartStatus.ACTIVE },
            relations: { items: { product: true, variant: true } }
        })
    }

    /**
     * Add an item to the user's cart.
     * If the same product+variant already exists, increments the quantity.
     */
    async addItem(userId: number, input: AddCartItemInput): Promise<Cart> {
        // Validate product exists and is active
        const product = await this.productRepository.findOne({
            where: { id: input.productId }
        })
        if (!product || !product.isActive) {
            throw new createHttpError.NotFound("Product not found or unavailable")
        }

        // Validate variant if provided
        let variant: ProductVariant | null = null
        if (input.variantId) {
            variant = await this.variantRepository.findOne({
                where: { id: input.variantId, product: { id: input.productId } }
            })
            if (!variant) {
                throw new createHttpError.NotFound("Product variant not found")
            }
        }

        // Check stock availability
        const availableStock = product.getAvailableStock()
        if (availableStock < input.quantity) {
            throw new createHttpError.Conflict(
                `Insufficient stock. Available: ${availableStock}, Requested: ${input.quantity}`
            )
        }

        const cart = await this.getOrCreateActiveCart(userId)

        // Determine the effective unit price (variant price takes precedence)
        const unitPrice = variant
            ? toMoney(variant.salePrice ?? variant.price)
            : toMoney(product.getEffectivePrice())

        // Check for existing cart item with same product+variant
        const existingItem = await this.cartItemRepository.findOne({
            where: {
                cartId: cart.id,
                productId: input.productId,
                variantId: input.variantId ?? null as any
            }
        })

        if (existingItem) {
            // Increment quantity
            const newQuantity = existingItem.quantity + input.quantity
            if (newQuantity > availableStock) {
                throw new createHttpError.Conflict(
                    `Cannot add ${input.quantity} more. Already have ${existingItem.quantity} in cart. Available stock: ${availableStock}`
                )
            }
            existingItem.quantity = newQuantity
            existingItem.price = unitPrice
            await this.cartItemRepository.save(existingItem)
        } else {
            const cartItem = new CartItem()
            cartItem.cartId = cart.id
            cartItem.productId = input.productId
            cartItem.variantId = input.variantId ?? null
            cartItem.quantity = input.quantity
            cartItem.price = unitPrice
            await this.cartItemRepository.save(cartItem)
        }

        return await this.recalculateCart(cart.id)
    }

    /**
     * Update the quantity of a specific cart item.
     */
    async updateItemQuantity(userId: number, cartItemId: string, input: UpdateCartItemInput): Promise<Cart> {
        const cart = await this.getOrCreateActiveCart(userId)

        const item = await this.cartItemRepository.findOne({
            where: { id: cartItemId, cartId: cart.id },
            relations: { product: true }
        })
        if (!item) {
            throw new createHttpError.NotFound("Cart item not found")
        }

        // Check stock
        const available = item.product.getAvailableStock()
        if (input.quantity > available) {
            throw new createHttpError.Conflict(
                `Insufficient stock. Available: ${available}, Requested: ${input.quantity}`
            )
        }

        item.quantity = input.quantity
        await this.cartItemRepository.save(item)

        return await this.recalculateCart(cart.id)
    }

    /**
     * Remove a specific item from the cart.
     */
    async removeItem(userId: number, cartItemId: string): Promise<Cart> {
        const cart = await this.getOrCreateActiveCart(userId)

        const item = await this.cartItemRepository.findOne({
            where: { id: cartItemId, cartId: cart.id }
        })
        if (!item) {
            throw new createHttpError.NotFound("Cart item not found")
        }

        await this.cartItemRepository.remove(item)
        return await this.recalculateCart(cart.id)
    }

    /**
     * Clear all items from the user's active cart.
     */
    async clearCart(userId: number): Promise<void> {
        const cart = await this.cartRepository.findOne({
            where: { userId, status: CartStatus.ACTIVE }
        })
        if (!cart) return

        await this.cartItemRepository.delete({ cartId: cart.id })
        cart.totalPrice = 0
        cart.itemCount = 0
        await this.cartRepository.save(cart)
    }

    /**
     * Recalculate cart totals after any item change.
     */
    private async recalculateCart(cartId: string): Promise<Cart> {
        const cart = await this.cartRepository.findOne({
            where: { id: cartId },
            relations: { items: { product: true, variant: true } }
        })
        if (!cart) {
            throw new createHttpError.NotFound("Cart not found")
        }

        let totalPrice = 0
        let itemCount = 0
        for (const item of cart.items) {
            totalPrice += roundMoney(item.price * item.quantity)
            itemCount += item.quantity
        }

        cart.totalPrice = roundMoney(totalPrice)
        cart.itemCount = itemCount
        return await this.cartRepository.save(cart)
    }
}
