import { DataSource, EntityManager } from "typeorm"
import createHttpError from "http-errors"
import { Cart, CartStatus } from "../entities/Cart.ts"
import { Order } from "../entities/Order.ts"
import { OrderStatus } from "../entities/OrderStatus.ts"
import { OrderItem } from "../entities/OrderItem.ts"
import { OrderTracking } from "../entities/OrderTracking.ts"
import { toAddressSnapshot } from "../entities/Address.ts"
import { CartService } from "./CartService.ts"
import { AddressService } from "./AddressService.ts"
import { CouponService } from "./CouponService.ts"
import { PricingService } from "./PricingService.ts"
import { InventoryService } from "./InventoryService.ts"
import { PaymentService } from "./PaymentService.ts"
import { AuditService } from "./AuditService.ts"
import { AuditAction } from "../entities/AuditLog.ts"
import { generateOrderNumber } from "../utils/generateOrderNumber.ts"
import { toMoney } from "../utils/money.ts"
import type { CheckoutPreviewInput, PlaceOrderInput, VerifyRazorpayPaymentInput } from "../validators/checkoutValidator.ts"

export interface CheckoutPreviewResult {
    subtotal: number
    shippingCost: number
    discountAmount: number
    taxAmount: number
    totalAmount: number
    itemCount: number
    appliedCoupon?: {
        code: string
        discountAmount: number
    } | undefined
}

export class CheckoutService {
    private dataSource: DataSource
    private cartService: CartService
    private addressService: AddressService
    private couponService: CouponService
    private pricingService: PricingService
    private inventoryService: InventoryService
    private paymentService: PaymentService
    private auditService: AuditService

    constructor(
        dataSource: DataSource,
        cartService: CartService,
        addressService: AddressService,
        couponService: CouponService,
        pricingService: PricingService,
        inventoryService: InventoryService,
        paymentService: PaymentService,
        auditService: AuditService
    ) {
        this.dataSource = dataSource
        this.cartService = cartService
        this.addressService = addressService
        this.couponService = couponService
        this.pricingService = pricingService
        this.inventoryService = inventoryService
        this.paymentService = paymentService
        this.auditService = auditService
    }

    /**
     * Preview checkout pricing totals without modifying any state.
     */
    async preview(userId: number, input: CheckoutPreviewInput): Promise<CheckoutPreviewResult> {
        const cart = await this.cartService.getActiveCart(userId)
        if (!cart || cart.items.length === 0) {
            throw new createHttpError.BadRequest("Your cart is empty")
        }

        // Validate address existence
        await this.addressService.findById(input.shippingAddressId, userId)
        if (input.billingAddressId) {
            await this.addressService.findById(input.billingAddressId, userId)
        }

        // Map cart items to line items for pricing calculation
        const lineItems = cart.items.map(item => ({
            unitPrice: toMoney(item.price),
            quantity: item.quantity,
            taxPercentage: toMoney(item.product.taxPercentage)
        }))

        let discountAmount = 0
        let couponDiscountDetail: { code: string; discountAmount: number } | undefined

        if (input.couponCode) {
            const subtotal = lineItems.reduce((acc, curr) => acc + (curr.unitPrice * curr.quantity), 0)
            const couponResult = await this.couponService.validateAndCalculate(input.couponCode, userId, subtotal)
            discountAmount = couponResult.discountAmount
            couponDiscountDetail = {
                code: couponResult.code,
                discountAmount: couponResult.discountAmount
            }
        }

        const totals = this.pricingService.calculateOrderTotals(lineItems, discountAmount)

        return {
            subtotal: totals.subtotal,
            shippingCost: totals.shippingCost,
            discountAmount: totals.discountAmount,
            taxAmount: totals.taxAmount,
            totalAmount: totals.totalAmount,
            itemCount: totals.itemCount,
            appliedCoupon: couponDiscountDetail
        }
    }

    /**
     * Places an order atomically, handles inventory reservation, coupon validation/redemption,
     * payment initialization, cart conversion, and auditing.
     */
    async placeOrder(userId: number, input: PlaceOrderInput): Promise<Order> {
        // Prevent concurrent order processing/race conditions using database transactions
        return await this.dataSource.transaction(async (manager: EntityManager) => {
            // 1. Get active cart
            const cart = await manager.findOne(Cart, {
                where: { userId, status: CartStatus.ACTIVE },
                relations: { items: { product: true, variant: true } },
                lock: { mode: "pessimistic_write" } // lock cart row
            })

            if (!cart || cart.items.length === 0) {
                throw new createHttpError.BadRequest("Your cart is empty")
            }

            // 2. Validate addresses
            const shippingAddress = await this.addressService.findById(input.shippingAddressId, userId)
            const billingAddress = input.billingAddressId 
                ? await this.addressService.findById(input.billingAddressId, userId)
                : shippingAddress

            // 3. Verify and reserve stock for each item under a lock
            for (const item of cart.items) {
                await this.inventoryService.reserveStock(item.productId, item.quantity, manager)
            }

            // 4. Calculate prices and discount
            const lineItems = cart.items.map(item => ({
                unitPrice: toMoney(item.price),
                quantity: item.quantity,
                taxPercentage: toMoney(item.product.taxPercentage)
            }))

            let discountAmount = 0
            let couponId: string | undefined
            let couponCode: string | undefined

            if (input.couponCode) {
                const subtotal = lineItems.reduce((acc, curr) => acc + (curr.unitPrice * curr.quantity), 0)
                const couponResult = await this.couponService.validateAndCalculate(input.couponCode, userId, subtotal)
                discountAmount = couponResult.discountAmount
                couponId = couponResult.couponId
                couponCode = couponResult.code
            }

            const totals = this.pricingService.calculateOrderTotals(lineItems, discountAmount)

            // 5. Create Order
            const order = new Order()
            order.orderNumber = generateOrderNumber()
            order.userId = userId
            order.shippingAddress = toAddressSnapshot(shippingAddress)
            order.billingAddress = toAddressSnapshot(billingAddress)
            order.subtotal = totals.subtotal
            order.shippingCost = totals.shippingCost
            order.discountAmount = totals.discountAmount
            order.taxAmount = totals.taxAmount
            order.totalAmount = totals.totalAmount
            order.status = OrderStatus.PENDING
            order.paymentMethod = input.paymentMethod
            if (input.notes !== undefined) order.notes = input.notes
            if (couponCode !== undefined) order.couponCode = couponCode
            if (input.idempotencyKey !== undefined) order.idempotencyKey = input.idempotencyKey

            const savedOrder = await manager.save(Order, order)

            // 6. Create Order Items from Cart Items
            const orderItems: OrderItem[] = []
            for (const item of cart.items) {
                const orderItem = new OrderItem()
                orderItem.orderId = savedOrder.id
                orderItem.productId = item.productId
                if (item.variantId) {
                    orderItem.variantId = item.variantId
                }
                
                // Snapshots for immutability
                orderItem.productName = item.product.name
                orderItem.productSku = item.product.sku
                if (item.product.thumbnail) {
                    orderItem.productThumbnail = item.product.thumbnail
                }
                if (item.variant) {
                    orderItem.variantName = item.variant.variantName
                    if (item.variant.sku) {
                        orderItem.variantSku = item.variant.sku
                    }
                    // If we have variant attributes, store them
                    if (item.variant.attributes) {
                        orderItem.variantAttributes = item.variant.attributes as any
                    }
                }

                orderItem.quantity = item.quantity
                orderItem.unitPrice = toMoney(item.price)
                
                // Distribute coupons proportion/ratio or simplify?
                // Let's allocate discount proportionally to avoid precision loss issues,
                // or just keep it simple: discount is distributed proportionally.
                const itemRatio = totals.subtotal > 0 ? (toMoney(item.price) * item.quantity) / totals.subtotal : 0
                orderItem.discountAmount = toMoney(totals.discountAmount * itemRatio)
                
                orderItem.taxPercentage = toMoney(item.product.taxPercentage)
                
                const lineCalculations = this.pricingService.calculateLineTotal({
                    unitPrice: orderItem.unitPrice,
                    quantity: orderItem.quantity,
                    taxPercentage: orderItem.taxPercentage,
                    discountAmount: orderItem.discountAmount
                })
                
                orderItem.taxAmount = lineCalculations.lineTax
                orderItem.totalPrice = lineCalculations.lineTotal

                orderItems.push(orderItem)
            }

            await manager.save(OrderItem, orderItems)
            savedOrder.items = orderItems

            // 7. Initialize tracking status
            const tracking = new OrderTracking()
            tracking.orderId = savedOrder.id
            tracking.status = OrderStatus.PENDING
            tracking.message = "Order placed successfully, pending confirmation"
            await manager.save(OrderTracking, tracking)

            // 8. Record Coupon Usage (if any)
            if (couponId) {
                await this.couponService.recordUsage(couponId, userId, savedOrder.id)
            }

            // 9. Process Payment Initialization (e.g. COD or Gateway)
            if (input.paymentMethod === "cod") {
                await this.paymentService.initializeCODPayment(savedOrder, manager)
            } else if (input.paymentMethod === "razorpay") {
                const payment = await this.paymentService.initializeRazorpayPayment(savedOrder, manager)
                // Attach the payment to the savedOrder so controllers can read the Razorpay order ID
                savedOrder.payments = [payment]
            }

            // 10. Convert Cart to Converted state
            cart.status = CartStatus.CONVERTED
            await manager.save(Cart, cart)

            // 11. Audit Log
            await this.auditService.log({
                userId,
                action: AuditAction.ORDER_CREATED,
                entityType: "Order",
                entityId: savedOrder.id,
                newValues: { orderNumber: savedOrder.orderNumber, totalAmount: savedOrder.totalAmount }
            })

            return savedOrder
        })
    }

    /**
     * Atomically verify a Razorpay payment and transition order to CONFIRMED.
     */
    async verifyPayment(userId: number, input: VerifyRazorpayPaymentInput): Promise<Order> {
        return await this.dataSource.transaction(async (manager: EntityManager) => {
            // 1. Verify payment signature
            const payment = await this.paymentService.verifyRazorpaySignature(
                input.razorpayOrderId,
                input.razorpayPaymentId,
                input.signature,
                manager
            )

            // 2. Fetch the corresponding order
            const order = await manager.findOne(Order, {
                where: { id: payment.orderId, userId },
                relations: { items: true }
            })

            if (!order) {
                throw new createHttpError.NotFound("Order not found")
            }

            const oldStatus = order.status
            const newStatus = OrderStatus.CONFIRMED

            // If order is still pending, confirm it and deduct inventory stock
            if (oldStatus === OrderStatus.PENDING) {
                order.status = newStatus
                await manager.save(Order, order)

                // Confirm stock deduction (moves from reserved to sold)
                for (const item of order.items) {
                    if (item.productId) {
                        await this.inventoryService.confirmStockDeduction(item.productId, item.quantity, manager)
                    }
                }

                // Append status tracking history
                const tracking = new OrderTracking()
                tracking.orderId = order.id
                tracking.status = newStatus
                tracking.message = "Payment verified successfully. Order confirmed."
                await manager.save(OrderTracking, tracking)

                // Log the action
                await this.auditService.log({
                    userId,
                    action: AuditAction.ORDER_STATUS_CHANGED,
                    entityType: "Order",
                    entityId: order.id,
                    oldValues: { status: oldStatus },
                    newValues: { status: newStatus }
                })
            }

            return order
        })
    }
}
