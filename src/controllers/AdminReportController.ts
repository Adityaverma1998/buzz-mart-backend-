import type { Response, NextFunction } from "express"
import type { AuthRequest } from "../middlewares/authMiddleware.ts"
import { AdminReportService } from "../services/AdminReportService.ts"

export class AdminReportController {
    private reportService: AdminReportService

    constructor(reportService: AdminReportService) {
        this.reportService = reportService
    }

    async getDashboardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const stats = await this.reportService.getDashboardStats()
            res.status(200).json({
                success: true,
                message: "Dashboard stats retrieved successfully",
                data: stats
            })
        } catch (error) {
            next(error)
        }
    }

    async getDailySalesReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const days = req.query.days ? parseInt(req.query.days as string, 10) : 30
            const report = await this.reportService.getDailySalesReport(days)
            res.status(200).json({
                success: true,
                message: `Daily sales report for the last ${days} days retrieved successfully`,
                data: report
            })
        } catch (error) {
            next(error)
        }
    }

    async getCategoryPerformance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const report = await this.reportService.getCategoryPerformance()
            res.status(200).json({
                success: true,
                message: "Category sales performance report retrieved successfully",
                data: report
            })
        } catch (error) {
            next(error)
        }
    }

    async getTopSellingProducts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10
            const report = await this.reportService.getTopSellingProducts(limit)
            res.status(200).json({
                success: true,
                message: `Top ${limit} selling products report retrieved successfully`,
                data: report
            })
        } catch (error) {
            next(error)
        }
    }
}
