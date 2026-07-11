import { Router } from "express"
import { AppDataSource } from "../config/data-source.ts"
import { Cart } from "../entities/Cart.ts"
import { CartItem } from "../entities/CartItem.ts"
import { Product } from "../entities/Product.ts"
import { ProductVariant } from "../entities/ProductVariant.ts"
import { Address } from "../entities/Address.ts"
import { Coupon } from "../entities/Coupon.ts"
import { CouponUsage } from "../entities/CouponUsage.ts"
import { Payment } from "../entities/Payment.ts"
import { AuditLog } from "../entities/AuditLog.ts"

import { CartService } from "../services/CartService.ts"
import { AddressService } from "../services/AddressService.ts"
import { CouponService } from "../services/CouponService.ts"
import { PricingService } from "../services/PricingService.ts"
import { InventoryService } from "../services/InventoryService.ts"
import { PaymentService } from "../services/PaymentService.ts"
import { AuditService } from "../services/AuditService.ts"
import { CheckoutService } from "../services/CheckoutService.ts"
import { CheckoutController } from "../controllers/CheckoutController.ts"
import { authMiddleware } from "../middlewares/authMiddleware.ts"

const router = Router()

// Dependency Injection
const cartRepository = AppDataSource.getRepository(Cart)
const cartItemRepository = AppDataSource.getRepository(CartItem)
const productRepository = AppDataSource.getRepository(Product)
const variantRepository = AppDataSource.getRepository(ProductVariant)
const addressRepository = AppDataSource.getRepository(Address)
const couponRepository = AppDataSource.getRepository(Coupon)
const usageRepository = AppDataSource.getRepository(CouponUsage)
const paymentRepository = AppDataSource.getRepository(Payment)
const auditRepository = AppDataSource.getRepository(AuditLog)

const cartService = new CartService(cartRepository, cartItemRepository, productRepository, variantRepository)
const addressService = new AddressService(addressRepository)
const couponService = new CouponService(couponRepository, usageRepository)
const pricingService = new PricingService()
const inventoryService = new InventoryService(productRepository)
const paymentService = new PaymentService(paymentRepository)
const auditService = new AuditService(auditRepository)

const checkoutService = new CheckoutService(
    AppDataSource,
    cartService,
    addressService,
    couponService,
    pricingService,
    inventoryService,
    paymentService,
    auditService
)
const checkoutController = new CheckoutController(checkoutService)

// All checkout routes require authentication
router.use(authMiddleware)

router.post("/preview", (req, res, next) => checkoutController.preview(req as any, res, next))
router.post("/place", (req, res, next) => checkoutController.placeOrder(req as any, res, next))
router.post("/verify-payment", (req, res, next) => checkoutController.verifyPayment(req as any, res, next))

export default router
