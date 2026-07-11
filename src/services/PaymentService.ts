import type { Repository, EntityManager } from "typeorm"
import { Payment, PaymentStatus } from "../entities/Payment.ts"
import { Order } from "../entities/Order.ts"
import createHttpError from "http-errors"
import crypto from "crypto"

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
