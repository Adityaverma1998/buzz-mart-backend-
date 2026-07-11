import { Router } from "express"
import { AppDataSource } from "../config/data-source.ts"
import { Order } from "../entities/Order.ts"
import { Product } from "../entities/Product.ts"
import { AuditLog } from "../entities/AuditLog.ts"
import { OrderStatusService } from "../services/OrderStatusService.ts"
import { InventoryService } from "../services/InventoryService.ts"
import { AuditService } from "../services/AuditService.ts"
import { OrderService } from "../services/OrderService.ts"
import { OrderController } from "../controllers/OrderController.ts"
import { authMiddleware } from "../middlewares/authMiddleware.ts"

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
const orderController = new OrderController(orderService)

// All routes require authentication
router.use(authMiddleware)

router.get("/", (req, res, next) => orderController.getAll(req as any, res, next))
router.get("/:id", (req, res, next) => orderController.getById(req as any, res, next))
router.post("/:id/cancel", (req, res, next) => orderController.cancel(req as any, res, next))

export default router
