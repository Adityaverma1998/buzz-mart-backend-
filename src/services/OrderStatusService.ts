import { OrderStatus } from "../entities/OrderStatus.ts"

/**
 * Defines the valid state machine transitions for order status.
 * This is the single source of truth — no status change happens
 * without going through this validation.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.REFUNDED]: []
}

/**
 * Statuses that customers can cancel from (limited to early stages).
 */
const CUSTOMER_CANCELLABLE: OrderStatus[] = [OrderStatus.PENDING]

/**
 * Statuses that admins can cancel from.
 */
const ADMIN_CANCELLABLE: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED]

/**
 * Statuses that require inventory release on cancellation.
 */
const REQUIRES_INVENTORY_RELEASE: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING
]

export class OrderStatusService {
    /**
     * Check if a status transition is allowed.
     */
    isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
        return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
    }

    /**
     * Get all valid transitions from the current status.
     */
    getValidTransitions(from: OrderStatus): OrderStatus[] {
        return ALLOWED_TRANSITIONS[from] ?? []
    }

    /**
     * Check if a customer can cancel an order in this status.
     */
    canCustomerCancel(status: OrderStatus): boolean {
        return CUSTOMER_CANCELLABLE.includes(status)
    }

    /**
     * Check if an admin can cancel an order in this status.
     */
    canAdminCancel(status: OrderStatus): boolean {
        return ADMIN_CANCELLABLE.includes(status)
    }

    /**
     * Whether inventory needs to be released when transitioning to the given status.
     */
    requiresInventoryRelease(currentStatus: OrderStatus): boolean {
        return REQUIRES_INVENTORY_RELEASE.includes(currentStatus)
    }

    /**
     * Whether the order is in a terminal (final) state.
     */
    isTerminal(status: OrderStatus): boolean {
        return ALLOWED_TRANSITIONS[status]?.length === 0
    }
}
