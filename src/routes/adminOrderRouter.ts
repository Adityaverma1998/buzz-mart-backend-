import { Router } from "express"
import { AppDataSource } from "../config/data-source.ts"
import { Order } from "../entities/Order.ts"
import { Product } from "../entities/Product.ts"
import { AuditLog } from "../entities/AuditLog.ts"
import { OrderStatusService } from "../services/OrderStatusService.ts"
import { InventoryService } from "../services/InventoryService.ts"
import { AuditService } from "../services/AuditService.ts"
import { OrderService } from "../services/OrderService.ts"
import { AdminOrderController } from "../controllers/AdminOrderController.ts"
import { authMiddleware } from "../middlewares/authMiddleware.ts"
import { authorizeRoles } from "../middlewares/roleGuard.ts"

const router = Router()

// Dependency Injection
const orderRepository = AppDataSource.getRepository(Order)
const productRepository = AppDataSource.getRepository(Product)
const auditRepository = AppDataSource.getRepository(AuditLog)

const orderStatusService = new OrderStatusService()
const inventoryService = new InventoryService(productRepository)
const auditService = new AuditService(auditRepository)

const orderService = new OrderService(
    AppDataSource,
    orderRepository,
    orderStatusService,
    inventoryService,
    auditService
)
const adminOrderController = new AdminOrderController(orderService)

// Require authentication and admin role for all routes
router.use(authMiddleware, authorizeRoles("admin"))

router.get("/", (req, res, next) => adminOrderController.getAll(req as any, res, next))
router.get("/:id", (req, res, next) => adminOrderController.getById(req as any, res, next))
router.patch("/:id/status", (req, res, next) => adminOrderController.updateStatus(req as any, res, next))
router.patch("/:id/shipping", (req, res, next) => adminOrderController.updateShipping(req as any, res, next))

export default router
