import type { Repository } from "typeorm"
import { Address } from "../entities/Address.ts"
import createHttpError from "http-errors"
import type { CreateAddressInput, UpdateAddressInput } from "../validators/addressValidator.ts"

export class AddressService {
    private addressRepository: Repository<Address>

    constructor(addressRepository: Repository<Address>) {
        this.addressRepository = addressRepository
    }

    async create(userId: number, input: CreateAddressInput): Promise<Address> {
        const count = await this.addressRepository.count({ where: { userId } })
        if (count >= 10) {
            throw new createHttpError.BadRequest("Maximum of 10 addresses allowed per user")
        }

        const address = new Address()
        address.userId = userId
        address.addressType = input.addressType ?? "shipping"
        address.fullName = input.fullName
        address.phoneNumber = input.phoneNumber
        address.street = input.street
        address.city = input.city
        address.state = input.state
        address.postalCode = input.postalCode
        address.country = input.country ?? "India"
        address.isDefault = input.isDefault ?? false
        if (input.apartment !== undefined) address.apartment = input.apartment
        if (input.landmark !== undefined) address.landmark = input.landmark

        // If this is set as default, unset existing defaults for same type
        if (address.isDefault) {
            await this.unsetDefault(userId, address.addressType)
        }

        // First address should always be default
        if (count === 0) {
            address.isDefault = true
        }

        return await this.addressRepository.save(address)
    }

    async findAllByUser(userId: number): Promise<Address[]> {
        return await this.addressRepository.find({
            where: { userId },
            order: { isDefault: "DESC", createdAt: "DESC" }
        })
    }

    async findById(id: string, userId: number): Promise<Address> {
        const address = await this.addressRepository.findOne({
            where: { id, userId }
        })
        if (!address) {
            throw new createHttpError.NotFound("Address not found")
        }
        return address
    }

    async update(id: string, userId: number, input: UpdateAddressInput): Promise<Address> {
        const address = await this.findById(id, userId)

        if (input.isDefault && !address.isDefault) {
            await this.unsetDefault(userId, input.addressType ?? address.addressType)
        }

        Object.assign(address, input)
        return await this.addressRepository.save(address)
    }

    async delete(id: string, userId: number): Promise<void> {
        const address = await this.findById(id, userId)
        await this.addressRepository.remove(address)
    }

    async setDefault(id: string, userId: number): Promise<Address> {
        const address = await this.findById(id, userId)
        await this.unsetDefault(userId, address.addressType)
        address.isDefault = true
        return await this.addressRepository.save(address)
    }

    private async unsetDefault(userId: number, addressType: string): Promise<void> {
        await this.addressRepository
            .createQueryBuilder()
            .update(Address)
            .set({ isDefault: false })
            .where("userId = :userId AND addressType = :addressType AND isDefault = true", {
                userId,
                addressType
            })
            .execute()
    }
}
