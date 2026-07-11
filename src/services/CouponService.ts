import type { Repository } from "typeorm"
import { Coupon, CouponType } from "../entities/Coupon.ts"
import { CouponUsage } from "../entities/CouponUsage.ts"
import createHttpError from "http-errors"
import { roundMoney } from "../utils/money.ts"

export interface CouponDiscount {
    couponId: string
    code: string
    type: CouponType
    discountAmount: number
}

export class CouponService {
    private couponRepository: Repository<Coupon>
    private usageRepository: Repository<CouponUsage>

    constructor(
        couponRepository: Repository<Coupon>,
        usageRepository: Repository<CouponUsage>
    ) {
        this.couponRepository = couponRepository
        this.usageRepository = usageRepository
    }

    /**
     * Validate and calculate the discount for a coupon code.
     * Does NOT record usage — that happens only when the order is placed.
     */
    async validateAndCalculate(code: string, userId: number, subtotal: number): Promise<CouponDiscount> {
        const coupon = await this.couponRepository.findOne({
            where: { code: code.toUpperCase().trim() }
        })

        if (!coupon) {
            throw new createHttpError.NotFound("Coupon not found")
        }

        // Check active status
        if (!coupon.isActive) {
            throw new createHttpError.BadRequest("This coupon is no longer active")
        }

        // Check date validity
        const now = new Date()
        if (now < coupon.validFrom || now > coupon.expiresAt) {
            throw new createHttpError.BadRequest("This coupon has expired or is not yet valid")
        }

        // Check global usage limit
        if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
            throw new createHttpError.BadRequest("This coupon has reached its usage limit")
        }

        // Check per-user usage limit
        const userUsageCount = await this.usageRepository.count({
            where: { couponId: coupon.id, userId }
        })
        if (userUsageCount >= coupon.usagePerUser) {
            throw new createHttpError.BadRequest("You have already used this coupon the maximum number of times")
        }

        // Check minimum order amount
        if (subtotal < coupon.minOrderAmount) {
            throw new createHttpError.BadRequest(
                `Minimum order amount of ₹${coupon.minOrderAmount} required. Current subtotal: ₹${subtotal}`
            )
        }

        // Calculate discount
        let discountAmount: number
        if (coupon.type === CouponType.PERCENTAGE) {
            discountAmount = roundMoney(subtotal * (coupon.value / 100))
            // Apply cap if set
            if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined) {
                discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount)
            }
        } else {
            discountAmount = roundMoney(Math.min(coupon.value, subtotal))
        }

        return {
            couponId: coupon.id,
            code: coupon.code,
            type: coupon.type,
            discountAmount
        }
    }

    /**
     * Record coupon usage. Called atomically during order placement.
     */
    async recordUsage(couponId: string, userId: number, orderId: string): Promise<void> {
        // Increment the global usage count
        await this.couponRepository
            .createQueryBuilder()
            .update(Coupon)
            .set({ usageCount: () => `"usageCount" + 1` })
            .where("id = :id", { id: couponId })
            .execute()

        // Record per-user usage
        const usage = new CouponUsage()
        usage.couponId = couponId
        usage.userId = userId
        usage.orderId = orderId
        await this.usageRepository.save(usage)
    }
}
