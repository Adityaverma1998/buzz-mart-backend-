import { roundMoney, calculateShipping } from "../utils/money.ts"

/**
 * Centralized pricing service. All price calculations in the application
 * MUST go through this service to ensure consistency.
 */

export interface LineItem {
    unitPrice: number
    quantity: number
    taxPercentage: number
    discountAmount?: number
}

export interface PricingSummary {
    subtotal: number
    taxAmount: number
    shippingCost: number
    discountAmount: number
    totalAmount: number
    itemCount: number
}

export class PricingService {
    /**
     * Calculate the total for a single line item.
     */
    calculateLineTotal(item: LineItem): { lineSubtotal: number; lineTax: number; lineTotal: number } {
        const lineSubtotal = roundMoney(item.unitPrice * item.quantity)
        const lineTax = roundMoney(lineSubtotal * (item.taxPercentage / 100))
        const lineDiscount = roundMoney(item.discountAmount ?? 0)
        const lineTotal = roundMoney(lineSubtotal + lineTax - lineDiscount)
        return { lineSubtotal, lineTax, lineTotal }
    }

    /**
     * Calculate the full pricing summary for a set of line items.
     */
    calculateOrderTotals(items: LineItem[], discountAmount: number = 0): PricingSummary {
        let subtotal = 0
        let taxAmount = 0
        let itemCount = 0

        for (const item of items) {
            const lineSubtotal = roundMoney(item.unitPrice * item.quantity)
            const lineTax = roundMoney(lineSubtotal * (item.taxPercentage / 100))
            subtotal += lineSubtotal
            taxAmount += lineTax
            itemCount += item.quantity
        }

        subtotal = roundMoney(subtotal)
        taxAmount = roundMoney(taxAmount)
        discountAmount = roundMoney(Math.min(discountAmount, subtotal))

        const shippingCost = calculateShipping(subtotal)
        const totalAmount = roundMoney(subtotal + taxAmount + shippingCost - discountAmount)

        return {
            subtotal,
            taxAmount,
            shippingCost,
            discountAmount,
            totalAmount: Math.max(totalAmount, 0),
            itemCount
        }
    }
}
