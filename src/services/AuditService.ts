import type { Repository } from "typeorm"
import { AuditLog, AuditAction } from "../entities/AuditLog.ts"

/**
 * Lightweight audit logging service.
 * Captures important business events for traceability.
 */
export class AuditService {
    private auditRepository: Repository<AuditLog>

    constructor(auditRepository: Repository<AuditLog>) {
        this.auditRepository = auditRepository
    }

    async log(params: {
        userId?: number
        action: AuditAction
        entityType: string
        entityId: string
        oldValues?: Record<string, unknown>
        newValues?: Record<string, unknown>
        ipAddress?: string
    }): Promise<void> {
        try {
            const entry = new AuditLog()
            entry.userId = params.userId
            entry.action = params.action
            entry.entityType = params.entityType
            entry.entityId = params.entityId
            entry.oldValues = params.oldValues
            entry.newValues = params.newValues
            entry.ipAddress = params.ipAddress

            await this.auditRepository.save(entry)
        } catch (error) {
            // Audit logging should never break the main flow
            console.error("Audit log failed:", error)
        }
    }
}
