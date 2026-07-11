import { DataSource } from "typeorm"
import { Order } from "../entities/Order.ts"
import { OrderStatus } from "../entities/OrderStatus.ts"
import { Product, ProductStatus } from "../entities/Product.ts"
import { User } from "../entities/User.ts"
import { OrderItem } from "../entities/OrderItem.ts"
import { Category } from "../entities/Category.ts"
import { toMoney } from "../utils/money.ts"

export interface DashboardStats {
    totalRevenue: number
    totalOrders: number
    totalDiscounts: number
    averageOrderValue: number
    customerCount: number
    lowStockCount: number
}

export interface DailySalesReport {
    date: string
    revenue: number
    orders: number
}

export interface CategoryPerformance {
    categoryId: string
    categoryName: string
    totalRevenue: number
    quantitySold: number
}

export interface TopProductReport {
    productId: string
    productName: string
    sku: string
    quantitySold: number
    totalRevenue: number
}

export class AdminReportService {
    private dataSource: DataSource

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource
    }

    /**
     * Get aggregate dashboard stats.
     */
    async getDashboardStats(): Promise<DashboardStats> {
        const orderRepo = this.dataSource.getRepository(Order)
        const productRepo = this.dataSource.getRepository(Product)
        const userRepo = this.dataSource.getRepository(User)

        // 1. Total revenue & orders (exclude CANCELLED and REFUNDED orders)
        const salesResult = await orderRepo
            .createQueryBuilder("order")
            .select("SUM(order.totalAmount)", "revenue")
            .addSelect("SUM(order.discountAmount)", "discounts")
            .addSelect("COUNT(order.id)", "orders")
            .where("order.status NOT IN (:...excludedStatuses)", {
                excludedStatuses: [OrderStatus.CANCELLED, OrderStatus.REFUNDED]
            })
            .getRawOne()

        const totalRevenue = toMoney(salesResult?.revenue || 0)
        const totalDiscounts = toMoney(salesResult?.discounts || 0)
        const totalOrders = parseInt(salesResult?.orders || "0", 10)

        // 2. Average Order Value
        const averageOrderValue = totalOrders > 0 ? toMoney(totalRevenue / totalOrders) : 0

        // 3. Customer Count
        const customerCount = await userRepo.count({
            where: { role: "customer", isActive: true }
        })

        // 4. Low stock count (available stock < minStock)
        const lowStockCount = await productRepo
            .createQueryBuilder("product")
            .where("product.stock - product.reserved <= product.minStock")
            .andWhere("product.status != :draft", { draft: ProductStatus.DRAFT })
            .getCount()

        return {
            totalRevenue,
            totalOrders,
            totalDiscounts,
            averageOrderValue,
            customerCount,
            lowStockCount
        }
    }

    /**
     * Get daily sales reports for the last 30 days.
     */
    async getDailySalesReport(days = 30): Promise<DailySalesReport[]> {
        const dateLimit = new Date()
        dateLimit.setDate(dateLimit.getDate() - days)

        const rawData = await this.dataSource.getRepository(Order)
            .createQueryBuilder("order")
            .select("DATE(order.createdAt)", "date")
            .addSelect("SUM(order.totalAmount)", "revenue")
            .addSelect("COUNT(order.id)", "orders")
            .where("order.createdAt >= :dateLimit", { dateLimit })
            .andWhere("order.status NOT IN (:...excludedStatuses)", {
                excludedStatuses: [OrderStatus.CANCELLED, OrderStatus.REFUNDED]
            })
            .groupBy("DATE(order.createdAt)")
            .orderBy("DATE(order.createdAt)", "ASC")
            .getRawMany()

        return rawData.map(row => ({
            date: new Date(row.date).toISOString().split("T")[0]!,
            revenue: toMoney(row.revenue),
            orders: parseInt(row.orders, 10)
        }))
    }

    /**
     * Get performance summary by product categories.
     */
    async getCategoryPerformance(): Promise<CategoryPerformance[]> {
        const rawData = await this.dataSource.getRepository(OrderItem)
            .createQueryBuilder("item")
            .innerJoin("item.product", "product")
            .innerJoin("product.category", "category")
            .innerJoin("item.order", "order")
            .select("category.id", "categoryId")
            .addSelect("category.name", "categoryName")
            .addSelect("SUM(item.totalPrice)", "totalRevenue")
            .addSelect("SUM(item.quantity)", "quantitySold")
            .where("order.status NOT IN (:...excludedStatuses)", {
                excludedStatuses: [OrderStatus.CANCELLED, OrderStatus.REFUNDED]
            })
            .groupBy("category.id")
            .addGroupBy("category.name")
            .orderBy("totalRevenue", "DESC")
            .getRawMany()

        return rawData.map(row => ({
            categoryId: row.categoryId,
            categoryName: row.categoryName,
            totalRevenue: toMoney(row.totalRevenue),
            quantitySold: parseInt(row.quantitySold, 10)
        }))
    }

    /**
     * Get top-selling products by quantity and revenue.
     */
    async getTopSellingProducts(limit = 10): Promise<TopProductReport[]> {
        const rawData = await this.dataSource.getRepository(OrderItem)
            .createQueryBuilder("item")
            .innerJoin("item.order", "order")
            .select("item.productId", "productId")
            .addSelect("item.productName", "productName")
            .addSelect("item.productSku", "sku")
            .addSelect("SUM(item.quantity)", "quantitySold")
            .addSelect("SUM(item.totalPrice)", "totalRevenue")
            .where("order.status NOT IN (:...excludedStatuses)", {
                excludedStatuses: [OrderStatus.CANCELLED, OrderStatus.REFUNDED]
            })
            .groupBy("item.productId")
            .addGroupBy("item.productName")
            .addGroupBy("item.productSku")
            .orderBy("quantitySold", "DESC")
            .limit(limit)
            .getRawMany()

        return rawData.map(row => ({
            productId: row.productId,
            productName: row.productName,
            sku: row.sku,
            quantitySold: parseInt(row.quantitySold, 10),
            totalRevenue: toMoney(row.totalRevenue)
        }))
    }
}
