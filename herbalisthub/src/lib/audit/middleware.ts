import { NextRequest, NextResponse } from "next/server"
import { AuthenticatedUser } from "@/lib/auth/api-middleware"
import { auditLogger, AuditEventType, AuditOutcome, DataSensitivity } from "./logger"

/**
 * Extract request metadata for audit logging
 */
export function extractRequestMetadata(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown"
  const userAgent = request.headers.get("user-agent") || undefined
  
  return { ip, userAgent }
}

/**
 * Higher-order function to add audit logging to API routes
 */
export function withAuditLogging<T extends any[]>(
  handler: (request: NextRequest, context: { params?: any }, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>,
  options: {
    eventType: AuditEventType
    resourceType: string
    dataSensitivity: DataSensitivity
    getResourceId?: (request: NextRequest, context: { params?: any }) => string
    getResourceDescription?: (request: NextRequest, context: { params?: any }) => string
  }
) {
  return async (
    request: NextRequest,
    context: { params?: any } = {},
    user: AuthenticatedUser,
    ...args: T
  ): Promise<NextResponse> => {
    const { ip, userAgent } = extractRequestMetadata(request)
    const resourceId = options.getResourceId?.(request, context)
    const resourceDescription = options.getResourceDescription?.(request, context)
    
    try {
      // Call the actual handler
      const response = await handler(request, context, user, ...args)
      
      // Determine outcome based on response status
      const outcome = response.status >= 200 && response.status < 300 
        ? AuditOutcome.SUCCESS 
        : AuditOutcome.FAILURE
      
      // Log the audit event
      await auditLogger.log({
        eventType: options.eventType,
        outcome,
        timestamp: new Date(),
        userId: user.id,
        userRole: user.role,
        userEmail: user.email,
        ipAddress: ip,
        userAgent,
        resourceType: options.resourceType,
        resourceId,
        resourceDescription,
        dataSensitivity: options.dataSensitivity,
        details: {
          method: request.method,
          url: request.url,
          statusCode: response.status,
        },
      })
      
      return response
    } catch (error) {
      // Log the failure
      await auditLogger.log({
        eventType: options.eventType,
        outcome: AuditOutcome.FAILURE,
        timestamp: new Date(),
        userId: user.id,
        userRole: user.role,
        userEmail: user.email,
        ipAddress: ip,
        userAgent,
        resourceType: options.resourceType,
        resourceId,
        resourceDescription,
        dataSensitivity: options.dataSensitivity,
        details: {
          method: request.method,
          url: request.url,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      })
      
      throw error
    }
  }
}

/**
 * Audit logging for PHI access
 */
export function withPHIAuditLogging(
  handler: (request: NextRequest, context: { params?: any }, user: AuthenticatedUser) => Promise<NextResponse>,
  options: {
    eventType: AuditEventType
    resourceType: string
    getResourceId?: (request: NextRequest, context: { params?: any }) => string
    getResourceDescription?: (request: NextRequest, context: { params?: any }) => string
  }
) {
  return withAuditLogging(handler, {
    ...options,
    dataSensitivity: DataSensitivity.PHI,
  })
}

/**
 * Audit logging for authentication events
 */
export async function logAuthEvent(
  eventType: AuditEventType,
  request: NextRequest,
  user?: { id?: string; email: string; role?: string },
  outcome: AuditOutcome = AuditOutcome.SUCCESS,
  details?: Record<string, any>
) {
  const { ip, userAgent } = extractRequestMetadata(request)
  
  await auditLogger.logAuth(
    eventType,
    outcome,
    user,
    { ip, userAgent },
    details
  )
}

/**
 * Audit logging for administrative actions
 */
export async function logAdminEvent(
  eventType: AuditEventType,
  request: NextRequest,
  admin: AuthenticatedUser,
  affectedUser?: { id: string; email: string },
  outcome: AuditOutcome = AuditOutcome.SUCCESS,
  details?: Record<string, any>
) {
  const { ip, userAgent } = extractRequestMetadata(request)
  
  await auditLogger.logAdminAction(
    eventType,
    admin,
    affectedUser,
    outcome,
    { ip, userAgent },
    details
  )
}

/**
 * Audit logging for security incidents
 */
export async function logSecurityEvent(
  eventType: AuditEventType,
  request: NextRequest,
  user?: AuthenticatedUser,
  resource?: { type: string; id: string },
  details?: Record<string, any>
) {
  const { ip, userAgent } = extractRequestMetadata(request)
  
  await auditLogger.logSecurityIncident(
    eventType,
    AuditOutcome.FAILURE,
    user,
    { ip, userAgent },
    resource,
    details
  )
}

/**
 * Middleware specifically for client profile access (PHI)
 */
export function withClientProfileAudit(
  handler: (request: NextRequest, context: { params?: any }, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return withPHIAuditLogging(handler, {
    eventType: AuditEventType.PHI_READ,
    resourceType: "ClientProfile",
    getResourceId: (request, context) => context.params?.id || "unknown",
    getResourceDescription: () => "Client health profile accessed",
  })
}

/**
 * Middleware for consultation notes access (PHI)
 */
export function withConsultationNotesAudit(
  handler: (request: NextRequest, context: { params?: any }, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return withPHIAuditLogging(handler, {
    eventType: AuditEventType.PHI_READ,
    resourceType: "ConsultationNote",
    getResourceId: (request, context) => context.params?.id || "unknown",
    getResourceDescription: () => "Consultation notes accessed",
  })
}

/**
 * Middleware for user management actions
 */
export function withUserManagementAudit(
  handler: (request: NextRequest, context: { params?: any }, user: AuthenticatedUser) => Promise<NextResponse>,
  eventType: AuditEventType = AuditEventType.USER_UPDATE
) {
  return withAuditLogging(handler, {
    eventType,
    resourceType: "User",
    dataSensitivity: DataSensitivity.CONFIDENTIAL,
    getResourceId: (request, context) => context.params?.id || "unknown",
    getResourceDescription: () => "User record accessed",
  })
}