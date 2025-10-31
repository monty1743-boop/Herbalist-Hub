import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import crypto from "crypto"
import { ErrorHandler, ApiErrors, ApiResponse } from "./errors"
import { RequestSanitizer } from "./validation"
import { auditLogger, AuditEventType, AuditOutcome, DataSensitivity } from "@/lib/audit/logger"

/**
 * Request context interface
 */
export interface RequestContext {
  requestId: string
  startTime: number
  ip: string
  userAgent: string
  path: string
  method: string
  userId?: string
  userRole?: string
  sessionId?: string
}

/**
 * Middleware options interface
 */
export interface MiddlewareOptions {
  enableCors?: boolean
  enableRateLimit?: boolean
  enableRequestLogging?: boolean
  enableSanitization?: boolean
  enableSecurityHeaders?: boolean
  maxRequestSize?: number
  allowedOrigins?: string[]
  rateLimitWindow?: number
  rateLimitMax?: number
}

/**
 * Default middleware options
 */
const DEFAULT_OPTIONS: MiddlewareOptions = {
  enableCors: true,
  enableRateLimit: true,
  enableRequestLogging: true,
  enableSanitization: true,
  enableSecurityHeaders: true,
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  allowedOrigins: ["http://localhost:3000", "https://herbalisthub.com"],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 100, // 100 requests per minute
}

/**
 * Rate limiting store (in production, use Redis or similar)
 */
class InMemoryRateLimit {
  private store = new Map<string, { count: number; resetTime: number }>()

  check(key: string, max: number, windowMs: number): boolean {
    const now = Date.now()
    const record = this.store.get(key)

    if (!record || now > record.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + windowMs })
      return true
    }

    if (record.count >= max) {
      return false
    }

    record.count++
    return true
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

const rateLimiter = new InMemoryRateLimit()

// Cleanup rate limiter every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000)

/**
 * Core API middleware class
 */
export class ApiMiddleware {
  /**
   * Create request context
   */
  static createContext(request: NextRequest): RequestContext {
    const headersList = headers()
    const forwardedFor = headersList.get("x-forwarded-for")
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"

    return {
      requestId: crypto.randomUUID(),
      startTime: Date.now(),
      ip,
      userAgent,
      path: request.nextUrl.pathname,
      method: request.method,
    }
  }

  /**
   * Apply CORS headers
   */
  static applyCors(
    response: NextResponse,
    request: NextRequest,
    allowedOrigins: string[]
  ): NextResponse {
    const origin = request.headers.get("origin")
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin)
    }

    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
    response.headers.set("Access-Control-Allow-Credentials", "true")
    response.headers.set("Access-Control-Max-Age", "86400")

    return response
  }

  /**
   * Apply security headers
   */
  static applySecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    
    if (process.env.NODE_ENV === "production") {
      response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
      response.headers.set("Content-Security-Policy", "default-src 'self'")
    }

    return response
  }

  /**
   * Check rate limits
   */
  static checkRateLimit(
    context: RequestContext,
    max: number,
    windowMs: number
  ): boolean {
    const key = `${context.ip}:${context.path}`
    return rateLimiter.check(key, max, windowMs)
  }

  /**
   * Validate request size
   */
  static async validateRequestSize(
    request: NextRequest,
    maxSize: number
  ): Promise<void> {
    const contentLength = request.headers.get("content-length")
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      throw ApiErrors.fileTooLarge(`${maxSize / 1024 / 1024}MB`)
    }
  }

  /**
   * Sanitize request data
   */
  static sanitizeRequest(request: NextRequest): NextRequest {
    // Note: In a real implementation, you'd need to carefully handle request body sanitization
    // This is a simplified example showing the concept
    return request
  }

  /**
   * Log request/response for audit and debugging
   */
  static async logRequest(
    context: RequestContext,
    response: NextResponse,
    error?: Error
  ): Promise<void> {
    const duration = Date.now() - context.startTime
    const statusCode = response.status || (error ? 500 : 200)

    const logData = {
      requestId: context.requestId,
      method: context.method,
      path: context.path,
      ip: context.ip,
      userAgent: context.userAgent,
      statusCode,
      duration,
      userId: context.userId,
      userRole: context.userRole,
      timestamp: new Date().toISOString(),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      } : undefined,
    }

    // Console logging
    const logLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info"
    console[logLevel]("API Request:", logData)

    // Audit logging for sensitive operations
    if (context.path.includes("/api/") && context.userId) {
      const dataSensitivity = context.path.includes("phi") || context.path.includes("client") 
        ? DataSensitivity.PHI 
        : DataSensitivity.INTERNAL

      await auditLogger.log({
        eventType: AuditEventType.PHI_READ, // This would be determined by the actual operation
        outcome: statusCode < 400 ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
        timestamp: new Date(),
        userId: context.userId,
        userRole: context.userRole as any,
        ipAddress: context.ip,
        userAgent: context.userAgent,
        resourceType: "API",
        resourceId: context.path,
        dataSensitivity,
        details: {
          method: context.method,
          statusCode,
          duration,
          requestId: context.requestId,
        },
      })
    }
  }
}

/**
 * Higher-order function to wrap API routes with comprehensive middleware
 */
export function withApiMiddleware(
  handler: (request: NextRequest, context: { params?: any }) => Promise<NextResponse>,
  options: MiddlewareOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return async (
    request: NextRequest,
    context: { params?: any } = {}
  ): Promise<NextResponse> => {
    const requestContext = ApiMiddleware.createContext(request)
    let response: NextResponse

    try {
      // Handle OPTIONS requests for CORS
      if (request.method === "OPTIONS") {
        response = new NextResponse(null, { status: 200 })
        if (opts.enableCors) {
          response = ApiMiddleware.applyCors(response, request, opts.allowedOrigins!)
        }
        return response
      }

      // Request size validation
      if (opts.maxRequestSize) {
        await ApiMiddleware.validateRequestSize(request, opts.maxRequestSize)
      }

      // Rate limiting
      if (opts.enableRateLimit) {
        if (!ApiMiddleware.checkRateLimit(requestContext, opts.rateLimitMax!, opts.rateLimitWindow!)) {
          throw ApiErrors.rateLimitExceeded(opts.rateLimitMax!, "1 minute")
        }
      }

      // Request sanitization
      let sanitizedRequest = request
      if (opts.enableSanitization) {
        sanitizedRequest = ApiMiddleware.sanitizeRequest(request)
      }

      // Call the actual handler
      response = await handler(sanitizedRequest, context)

      // Apply CORS headers
      if (opts.enableCors) {
        response = ApiMiddleware.applyCors(response, request, opts.allowedOrigins!)
      }

      // Apply security headers
      if (opts.enableSecurityHeaders) {
        response = ApiMiddleware.applySecurityHeaders(response)
      }

      // Add request ID header
      response.headers.set("X-Request-ID", requestContext.requestId)

      return response
    } catch (error) {
      // Handle errors with standardized error handler
      response = ErrorHandler.handleError(
        error,
        requestContext.requestId,
        requestContext.path,
        requestContext.userId
      )

      // Apply CORS even for errors
      if (opts.enableCors) {
        response = ApiMiddleware.applyCors(response, request, opts.allowedOrigins!)
      }

      return response
    } finally {
      // Log request/response
      if (opts.enableRequestLogging) {
        try {
          await ApiMiddleware.logRequest(requestContext, response!)
        } catch (logError) {
          console.error("Failed to log request:", logError)
        }
      }
    }
  }
}

/**
 * Specialized middleware for different types of API routes
 */
export const ApiMiddlewares = {
  /**
   * Standard API middleware for most routes
   */
  standard: (options?: MiddlewareOptions) => withApiMiddleware(
    async () => { throw new Error("Handler not implemented") },
    options
  ),

  /**
   * High-security middleware for PHI-handling routes
   */
  phi: (options?: MiddlewareOptions) => withApiMiddleware(
    async () => { throw new Error("Handler not implemented") },
    {
      ...options,
      enableRateLimit: true,
      rateLimitMax: 50, // More restrictive rate limiting
      enableRequestLogging: true,
      enableSecurityHeaders: true,
      maxRequestSize: 1024 * 1024, // 1MB limit for PHI routes
    }
  ),

  /**
   * Public API middleware with relaxed restrictions
   */
  public: (options?: MiddlewareOptions) => withApiMiddleware(
    async () => { throw new Error("Handler not implemented") },
    {
      ...options,
      rateLimitMax: 1000, // Higher rate limit for public APIs
      enableRequestLogging: false, // Less logging for public routes
    }
  ),

  /**
   * File upload middleware
   */
  upload: (options?: MiddlewareOptions) => withApiMiddleware(
    async () => { throw new Error("Handler not implemented") },
    {
      ...options,
      maxRequestSize: 50 * 1024 * 1024, // 50MB for file uploads
      rateLimitMax: 10, // Very restrictive for uploads
      rateLimitWindow: 60 * 1000, // 1 minute window
    }
  ),
}

/**
 * Request ID middleware for tracking requests across services
 */
export function addRequestId(response: NextResponse, requestId?: string): NextResponse {
  const id = requestId || crypto.randomUUID()
  response.headers.set("X-Request-ID", id)
  return response
}

/**
 * Health check middleware
 */
export function createHealthCheck(dependencies: { [key: string]: () => Promise<boolean> } = {}) {
  return withApiMiddleware(async (request: NextRequest) => {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {} as Record<string, boolean>,
    }

    // Check dependencies
    for (const [name, check] of Object.entries(dependencies)) {
      try {
        health.dependencies[name] = await check()
      } catch {
        health.dependencies[name] = false
        health.status = "unhealthy"
      }
    }

    const statusCode = health.status === "healthy" ? 200 : 503
    return NextResponse.json(health, { status: statusCode })
  }, {
    enableRateLimit: false,
    enableRequestLogging: false,
  })
}

/**
 * Maintenance mode middleware
 */
export function createMaintenanceMode(isMaintenanceMode: () => boolean) {
  return withApiMiddleware(async (request: NextRequest) => {
    if (isMaintenanceMode()) {
      throw ApiErrors.maintenance("API is currently under maintenance")
    }
    
    // This middleware should be chained with actual handlers
    return new NextResponse("Maintenance mode not active", { status: 200 })
  })
}