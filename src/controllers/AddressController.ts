import type { Response, NextFunction } from "express"
import type { AuthRequest } from "../middlewares/authMiddleware.ts"
import { AddressService } from "../services/AddressService.ts"
import { createAddressSchema, updateAddressSchema } from "../validators/addressValidator.ts"

export class AddressController {
    private addressService: AddressService

    constructor(addressService: AddressService) {
        this.addressService = addressService
    }

    async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const validated = createAddressSchema.parse(req.body)
            const address = await this.addressService.create(userId, validated)

            res.status(201).json({
                success: true,
                message: "Address created successfully",
                data: address
            })
        } catch (error) {
            next(error)
        }
    }

    async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const addresses = await this.addressService.findAllByUser(userId)

            res.status(200).json({
                success: true,
                message: "Addresses retrieved successfully",
                data: addresses
            })
        } catch (error) {
            next(error)
        }
    }

    async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const { id } = req.params
            const address = await this.addressService.findById(id as string, userId)

            res.status(200).json({
                success: true,
                message: "Address retrieved successfully",
                data: address
            })
        } catch (error) {
            next(error)
        }
    }

    async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const { id } = req.params
            const validated = updateAddressSchema.parse(req.body)
            const address = await this.addressService.update(id as string, userId, validated)

            res.status(200).json({
                success: true,
                message: "Address updated successfully",
                data: address
            })
        } catch (error) {
            next(error)
        }
    }

    async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const { id } = req.params
            await this.addressService.delete(id as string, userId)

            res.status(200).json({
                success: true,
                message: "Address deleted successfully"
            })
        } catch (error) {
            next(error)
        }
    }

    async setDefault(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.auth.sub
            const { id } = req.params
            const address = await this.addressService.setDefault(id as string, userId)

            res.status(200).json({
                success: true,
                message: "Default address updated successfully",
                data: address
            })
        } catch (error) {
            next(error)
        }
    }
}
