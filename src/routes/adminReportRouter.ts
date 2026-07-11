import { Router } from "express"
import { AppDataSource } from "../config/data-source.ts"
import { AdminReportService } from "../services/AdminReportService.ts"
import { AdminReportController } from "../controllers/AdminReportController.ts"
import { authMiddleware } from "../middlewares/authMiddleware.ts"
import { authorizeRoles } from "../middlewares/roleGuard.ts"

const router = Router()

// Dependency Injection
const reportService = new AdminReportService(AppDataSource)
const reportController = new AdminReportController(reportService)

// Guard routes to require authentication and admin role
router.use(authMiddleware, authorizeRoles("admin"))

router.get("/dashboard-stats", (req, res, next) => reportController.getDashboardStats(req as any, res, next))
router.get("/daily-sales", (req, res, next) => reportController.getDailySalesReport(req as any, res, next))
router.get("/category-performance", (req, res, next) => reportController.getCategoryPerformance(req as any, res, next))
router.get("/top-products", (req, res, next) => reportController.getTopSellingProducts(req as any, res, next))

export default router
