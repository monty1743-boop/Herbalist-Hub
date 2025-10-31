import { prisma } from "@/lib/db/client"
import { Role } from "@prisma/client"

// HIPAA audit event types
export enum AuditEventType {
  // Authentication events
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT", 
  LOGIN_FAILED = "LOGIN_FAILED",
  PASSWORD_RESET = "PASSWORD_RESET",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  
  // Data access events
  PHI_READ = "PHI_READ",
  PHI_CREATE = "PHI_CREATE",
  PHI_UPDATE = "PHI_UPDATE",
  PHI_DELETE = "PHI_DELETE",
  PHI_EXPORT = "PHI_EXPORT",
  PHI_PRINT = "PHI_PRINT",
  
  // Administrative events
  USER_CREATE = "USER_CREATE",
  USER_UPDATE = "USER_UPDATE",
  USER_DELETE = "USER_DELETE",
  USER_ROLE_CHANGE = "USER_ROLE_CHANGE",
  
  // System events
  SYSTEM_CONFIG_CHANGE = "SYSTEM_CONFIG_CHANGE",
  DATA_BACKUP = "DATA_BACKUP",
  DATA_RESTORE = "DATA_RESTORE",
  
  // Security events
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  DATA_BREACH_SUSPECTED = "DATA_BREACH_SUSPECTED",
  ENCRYPTION_KEY_CHANGE = "ENCRYPTION_KEY_CHANGE",
}

// HIPAA audit outcome
export enum AuditOutcome {
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
  WARNING = "WARNING",
}

// Sensitivity levels for HIPAA compliance
export enum DataSensitivity {
  PUBLIC = "PUBLIC",
  INTERNAL = "INTERNAL", 
  CONFIDENTIAL = "CONFIDENTIAL",
  PHI = "PHI", // Protected Health Information
}

export interface AuditLogEntry {
  id?: string
  eventType: AuditEventType
  outcome: AuditOutcome
  timestamp: Date
  userId?: string
  userRole?: Role
  userEmail?: string
  ipAddress?: string
  userAgent?: string
  resourceType?: string
  resourceId?: string
  resourceDescription?: string
  dataSensitivity: DataSensitivity
  details?: Record<string, any>
  sessionId?: string
  affectedUserId?: string // For admin actions affecting other users
  reasonCode?: string
  message?: string
}

export class HIPAAAuditLogger {
  private static instance: HIPAAAuditLogger
  
  private constructor() {}
  
  public static getInstance(): HIPAAAuditLogger {
    if (!HIPAAAuditLogger.instance) {
      HIPAAAuditLogger.instance = new HIPAAAuditLogger()
    }
    return HIPAAAuditLogger.instance
  }
  
  /**
   * Log a HIPAA audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          eventType: entry.eventType,
          outcome: entry.outcome,
          timestamp: entry.timestamp,
          userId: entry.userId,
          userRole: entry.userRole,
          userEmail: entry.userEmail,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          resourceDescription: entry.resourceDescription,
          dataSensitivity: entry.dataSensitivity,
          details: entry.details ? JSON.stringify(entry.details) : null,
          sessionId: entry.sessionId,
          affectedUserId: entry.affectedUserId,
          reasonCode: entry.reasonCode,
          message: entry.message,
        },
      })
      
      // For critical events, also log to console/external system
      if (this.isCriticalEvent(entry.eventType)) {
        console.error(`CRITICAL HIPAA EVENT: ${entry.eventType}`, {
          userId: entry.userId,
          resourceType: entry.resourceType,
          outcome: entry.outcome,
          timestamp: entry.timestamp,
        })
      }
    } catch (error) {
      // Never fail the main operation due to audit logging issues
      console.error("Audit logging failed:", error)
      
      // Log to external system or file as fallback
      this.logToFallback(entry, error)
    }
  }
  
  /**
   * Log PHI access event
   */
  async logPHIAccess(
    eventType: AuditEventType,
    user: { id: string; role: Role; email: string },
    resource: { type: string; id: string; description?: string },
    outcome: AuditOutcome,
    request?: { ip?: string; userAgent?: string; sessionId?: string },
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      outcome,
      timestamp: new Date(),
      userId: user.id,
      userRole: user.role,
      userEmail: user.email,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
      sessionId: request?.sessionId,
      resourceType: resource.type,
      resourceId: resource.id,
      resourceDescription: resource.description,
      dataSensitivity: DataSensitivity.PHI,
      details,
    })
  }
  
  /**
   * Log authentication event
   */
  async logAuth(
    eventType: AuditEventType,
    outcome: AuditOutcome,
    user?: { id?: string; email: string; role?: Role },
    request?: { ip?: string; userAgent?: string },
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      outcome,
      timestamp: new Date(),
      userId: user?.id,
      userRole: user?.role,
      userEmail: user?.email,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
      dataSensitivity: DataSensitivity.INTERNAL,
      details,
    })
  }
  
  /**
   * Log administrative action
   */
  async logAdminAction(
    eventType: AuditEventType,
    admin: { id: string; role: Role; email: string },
    affectedUser?: { id: string; email: string },
    outcome: AuditOutcome = AuditOutcome.SUCCESS,
    request?: { ip?: string; userAgent?: string },
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      outcome,
      timestamp: new Date(),
      userId: admin.id,
      userRole: admin.role,
      userEmail: admin.email,
      affectedUserId: affectedUser?.id,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
      dataSensitivity: DataSensitivity.CONFIDENTIAL,
      details: {
        ...details,
        affectedUserEmail: affectedUser?.email,
      },
    })
  }
  
  /**
   * Log security incident
   */
  async logSecurityIncident(
    eventType: AuditEventType,
    outcome: AuditOutcome,
    user?: { id?: string; email?: string; role?: Role },
    request?: { ip?: string; userAgent?: string },
    resource?: { type: string; id: string },
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      outcome,
      timestamp: new Date(),
      userId: user?.id,
      userRole: user?.role,
      userEmail: user?.email,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
      resourceType: resource?.type,
      resourceId: resource?.id,
      dataSensitivity: DataSensitivity.PHI,
      details,
      reasonCode: "SECURITY_INCIDENT",
    })
  }
  
  /**
   * Query audit logs with filters
   */
  async queryLogs(filters: {
    startDate?: Date
    endDate?: Date
    userId?: string
    eventTypes?: AuditEventType[]
    dataSensitivity?: DataSensitivity[]
    outcome?: AuditOutcome
    resourceType?: string
    page?: number
    limit?: number
  }) {
    const {
      startDate,
      endDate,
      userId,
      eventTypes,
      dataSensitivity,
      outcome,
      resourceType,
      page = 1,
      limit = 100,
    } = filters
    
    const where: any = {}
    
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }
    
    if (userId) where.userId = userId
    if (eventTypes?.length) where.eventType = { in: eventTypes }
    if (dataSensitivity?.length) where.dataSensitivity = { in: dataSensitivity }
    if (outcome) where.outcome = outcome
    if (resourceType) where.resourceType = resourceType
    
    const skip = (page - 1) * limit
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])
    
    return {
      logs: logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
  
  /**
   * Generate audit report for compliance
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    options: {
      includeSuccessfulAccess?: boolean
      includePHIOnly?: boolean
      groupByUser?: boolean
    } = {}
  ) {
    const where: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    }
    
    if (options.includePHIOnly) {
      where.dataSensitivity = DataSensitivity.PHI
    }
    
    if (!options.includeSuccessfulAccess) {
      where.outcome = { not: AuditOutcome.SUCCESS }
    }
    
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
    })
    
    const summary = {
      totalEvents: logs.length,
      byEventType: this.groupBy(logs, "eventType"),
      byOutcome: this.groupBy(logs, "outcome"),
      byDataSensitivity: this.groupBy(logs, "dataSensitivity"),
      byUser: options.groupByUser ? this.groupBy(logs, "userId") : undefined,
      suspiciousActivity: logs.filter(log => 
        log.outcome === AuditOutcome.FAILURE ||
        log.eventType === AuditEventType.UNAUTHORIZED_ACCESS ||
        log.eventType === AuditEventType.DATA_BREACH_SUSPECTED
      ),
    }
    
    return {
      period: { startDate, endDate },
      summary,
      logs: logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
      })),
    }
  }
  
  private isCriticalEvent(eventType: AuditEventType): boolean {
    return [
      AuditEventType.DATA_BREACH_SUSPECTED,
      AuditEventType.UNAUTHORIZED_ACCESS,
      AuditEventType.PHI_DELETE,
      AuditEventType.ENCRYPTION_KEY_CHANGE,
      AuditEventType.SYSTEM_CONFIG_CHANGE,
    ].includes(eventType)
  }
  
  private async logToFallback(entry: AuditLogEntry, error: any): Promise<void> {
    // In production, this would log to an external system, file, or queue
    console.error("AUDIT LOG FALLBACK:", {
      timestamp: new Date().toISOString(),
      originalEntry: entry,
      error: error.message,
    })
  }
  
  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((result, item) => {
      const groupKey = String(item[key])
      result[groupKey] = (result[groupKey] || 0) + 1
      return result
    }, {} as Record<string, number>)
  }
}

// Export singleton instance
export const auditLogger = HIPAAAuditLogger.getInstance()

// Convenience functions
export const logPHIAccess = auditLogger.logPHIAccess.bind(auditLogger)
export const logAuth = auditLogger.logAuth.bind(auditLogger)
export const logAdminAction = auditLogger.logAdminAction.bind(auditLogger)
export const logSecurityIncident = auditLogger.logSecurityIncident.bind(auditLogger)