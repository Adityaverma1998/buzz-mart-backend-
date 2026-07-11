import type { Repository, EntityManager } from "typeorm"
import { Product } from "../entities/Product.ts"
import createHttpError from "http-errors"

/**
 * Handles inventory reservation and release with concurrency safety.
 * Uses SELECT ... FOR UPDATE to prevent overselling.
 */
export class InventoryService {
    private productRepository: Repository<Product>

    constructor(productRepository: Repository<Product>) {
        this.productRepository = productRepository
    }

    /**
     * Reserve stock for an order. Must be called within a transaction.
     * Uses pessimistic locking (SELECT ... FOR UPDATE) to prevent race conditions.
     */
    async reserveStock(
        productId: string,
        quantity: number,
        manager: EntityManager
    ): Promise<void> {
        // Lock the product row for update
        const product = await manager
            .createQueryBuilder(Product, "product")
            .setLock("pessimistic_write")
            .where("product.id = :id", { id: productId })
            .getOne()

        if (!product) {
            throw new createHttpError.NotFound(`Product ${productId} not found`)
        }

        const available = product.stock - product.reserved
        if (available < quantity) {
            throw new createHttpError.Conflict(
                `Insufficient stock for "${product.name}". Available: ${available}, Requested: ${quantity}`
            )
        }

        // Atomic increment of reserved count
        await manager
            .createQueryBuilder()
            .update(Product)
            .set({ reserved: () => `"reserved" + ${quantity}` })
            .where("id = :id AND (stock - reserved) >= :quantity", { id: productId, quantity })
            .execute()
    }

    /**
     * Release reserved stock (e.g., on cancellation or payment failure).
     * Idempotent: uses GREATEST to prevent reserved from going below 0.
     */
    async releaseStock(
        productId: string,
        quantity: number,
        manager: EntityManager
    ): Promise<void> {
        await manager
            .createQueryBuilder()
            .update(Product)
            .set({ reserved: () => `GREATEST("reserved" - ${quantity}, 0)` })
            .where("id = :id", { id: productId })
            .execute()
    }

    /**
     * Confirm stock deduction after payment (moves from reserved to sold).
     * Decrements both stock and reserved.
     */
    async confirmStockDeduction(
        productId: string,
        quantity: number,
        manager: EntityManager
    ): Promise<void> {
        await manager
            .createQueryBuilder()
            .update(Product)
            .set({
                stock: () => `GREATEST("stock" - ${quantity}, 0)`,
                reserved: () => `GREATEST("reserved" - ${quantity}, 0)`
            })
            .where("id = :id", { id: productId })
            .execute()
    }
}
