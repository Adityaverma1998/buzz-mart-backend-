import type { Repository, EntityManager } from "typeorm"
import { Payment, PaymentStatus } from "../entities/Payment.ts"
import { Order } from "../entities/Order.ts"
import createHttpError from "http-errors"
import crypto from "crypto"
import Razorpay from "razorpay"
import { Config } from "../config/index.ts"

// Initialize Razorpay SDK instance
const razorpay = new Razorpay({
    key_id: Config.RAZORPAY_KEY_ID,
    key_secret: Config.RAZORPAY_KEY_SECRET
})

export class PaymentService {
    private paymentRepository: Repository<Payment>

    constructor(paymentRepository: Repository<Payment>) {
        this.paymentRepository = paymentRepository
    }

    /**
     * Process a cash-on-delivery (COD) payment initialization.
     * For COD, we initialize a pending payment.
     */
    async initializeCODPayment(
        order: Order,
        manager: EntityManager
    ): Promise<Payment> {
        const payment = new Payment()
        payment.orderId = order.id
        payment.transactionId = `TXN-COD-${crypto.randomBytes(8).toString("hex").toUpperCase()}`
        payment.paymentMethod = "cod"
        payment.paymentGateway = "internal"
        payment.amount = order.totalAmount
        payment.status = PaymentStatus.PENDING

        return await manager.save(Payment, payment)
    }

    /**
     * Process a Razorpay payment initialization.
     * Generates a new order in Razorpay and records it in our database.
     */
    async initializeRazorpayPayment(
        order: Order,
        manager: EntityManager
    ): Promise<Payment> {
        try {
            // Amount must be in paise (smallest currency unit, e.g. 1 INR = 100 paise)
            const amountInPaise = Math.round(order.totalAmount * 100)

            const rzpOrder = await razorpay.orders.create({
                amount: amountInPaise,
                currency: "INR",
                receipt: order.orderNumber
            })

            const payment = new Payment()
            payment.orderId = order.id
            payment.transactionId = rzpOrder.id // Use Razorpay Order ID as our transaction reference
            payment.paymentMethod = "razorpay"
            payment.paymentGateway = "razorpay"
            payment.amount = order.totalAmount
            payment.status = PaymentStatus.PENDING

            return await manager.save(Payment, payment)
        } catch (error: any) {
            console.error("Razorpay order creation failed:", error)
            throw new createHttpError.InternalServerError(`Razorpay initialization failed: ${error.message}`)
        }
    }

    /**
     * Cryptographically verify a Razorpay signature sent by client.
     * If valid, updates status of the transaction and mark the order as paid.
     */
    async verifyRazorpaySignature(
        razorpayOrderId: string,
        razorpayPaymentId: string,
        signature: string,
        manager: EntityManager
    ): Promise<Payment> {
        const hmac = crypto.createHmac("sha256", Config.RAZORPAY_KEY_SECRET!)
        hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`)
        const generated = hmac.digest("hex")

        if (generated !== signature) {
            throw new createHttpError.BadRequest("Payment signature verification failed")
        }

        return await this.completePayment(
            razorpayOrderId,
            { razorpayOrderId, razorpayPaymentId, signature },
            manager
        )
    }

    /**
     * Complete a payment (e.g. when COD is delivered, or online payment webhook arrives).
     */
    async completePayment(
        transactionId: string,
        gatewayResponse: Record<string, unknown>,
        manager: EntityManager
    ): Promise<Payment> {
        const payment = await manager.findOne(Payment, {
            where: { transactionId },
            relations: { order: true }
        })

        if (!payment) {
            throw new createHttpError.NotFound(`Payment transaction ${transactionId} not found`)
        }

        if (payment.status === PaymentStatus.SUCCESS) {
            return payment // Already processed
        }

        payment.status = PaymentStatus.SUCCESS
        payment.gatewayResponse = gatewayResponse
        payment.completedAt = new Date()

        const updatedPayment = await manager.save(Payment, payment)

        // Mark order as paid
        await manager.update(Order, payment.orderId, {
            isPaid: true,
            paidAt: new Date()
        })

        return updatedPayment
    }

    /**
     * Fail a payment.
     */
    async failPayment(
        transactionId: string,
        failureReason: string,
        gatewayResponse: Record<string, unknown>,
        manager: EntityManager
    ): Promise<Payment> {
        const payment = await manager.findOne(Payment, {
            where: { transactionId }
        })

        if (!payment) {
            throw new createHttpError.NotFound(`Payment transaction ${transactionId} not found`)
        }

        payment.status = PaymentStatus.FAILED
        payment.failureReason = failureReason
        payment.gatewayResponse = gatewayResponse

        return await manager.save(Payment, payment)
    }
}
