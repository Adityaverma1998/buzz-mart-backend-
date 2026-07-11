import { Router } from "express"
import { AppDataSource } from "../config/data-source.ts"
import { Cart } from "../entities/Cart.ts"
import { CartItem } from "../entities/CartItem.ts"
import { Product } from "../entities/Product.ts"
import { ProductVariant } from "../entities/ProductVariant.ts"
import { CartService } from "../services/CartService.ts"
import { CartController } from "../controllers/CartController.ts"
import { authMiddleware } from "../middlewares/authMiddleware.ts"

const router = Router()

// Dependency Injection
const cartRepository = AppDataSource.getRepository(Cart)
const cartItemRepository = AppDataSource.getRepository(CartItem)
const productRepository = AppDataSource.getRepository(Product)
const variantRepository = AppDataSource.getRepository(ProductVariant)

const cartService = new CartService(
    cartRepository,
    cartItemRepository,
    productRepository,
    variantRepository
)
const cartController = new CartController(cartService)

// All cart routes require authentication
router.use(authMiddleware)

router.get("/", (req, res, next) => cartController.getCart(req as any, res, next))
router.post("/items", (req, res, next) => cartController.addItem(req as any, res, next))
router.put("/items/:itemId", (req, res, next) => cartController.updateItem(req as any, res, next))
router.delete("/items/:itemId", (req, res, next) => cartController.removeItem(req as any, res, next))
router.delete("/", (req, res, next) => cartController.clearCart(req as any, res, next))

export default router
