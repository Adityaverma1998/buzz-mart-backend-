import { Router } from "express"
import { AppDataSource } from "../config/data-source.ts"
import { Address } from "../entities/Address.ts"
import { AddressService } from "../services/AddressService.ts"
import { AddressController } from "../controllers/AddressController.ts"
import { authMiddleware } from "../middlewares/authMiddleware.ts"

const router = Router()

// Dependency Injection
const addressRepository = AppDataSource.getRepository(Address)
const addressService = new AddressService(addressRepository)
const addressController = new AddressController(addressService)

// All address routes require authentication
router.use(authMiddleware)

router.post("/", (req, res, next) => addressController.create(req as any, res, next))
router.get("/", (req, res, next) => addressController.getAll(req as any, res, next))
router.get("/:id", (req, res, next) => addressController.getById(req as any, res, next))
router.put("/:id", (req, res, next) => addressController.update(req as any, res, next))
router.delete("/:id", (req, res, next) => addressController.delete(req as any, res, next))
router.patch("/:id/default", (req, res, next) => addressController.setDefault(req as any, res, next))

export default router
