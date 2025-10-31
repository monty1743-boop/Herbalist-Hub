import { NextResponse } from "next/server"
import { ZodError, ZodIssue } from "zod"
import { Prisma } from "@prisma/client"
import { auditLogger, AuditEventType, AuditOutcome, DataSensitivity } from "@/lib/audit/logger"

/**
 * Standard API error codes for consistent error handling
 */
export enum ApiErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_TOKEN = "INVALID_TOKEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
  
  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  REQUIRED_FIELD_MISSING = "REQUIRED_FIELD_MISSING",
  
  // Resource Management
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS",
  RESOURCE_CONFLICT = "RESOURCE_CONFLICT",
  RESOURCE_DELETED = "RESOURCE_DELETED",
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
  
  // Business Logic
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED",
  BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
  HIPAA_VIOLATION = "HIPAA_VIOLATION",
  
  // Data & Processing
  DATA_INTEGRITY_ERROR = "DATA_INTEGRITY_ERROR",
  ENCRYPTION_ERROR = "ENCRYPTION_ERROR",
  DECRYPTION_ERROR = "DECRYPTION_ERROR",
  DATA_CORRUPTION = "DATA_CORRUPTION",
  
  // External Services
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  EMAIL_SERVICE_ERROR = "EMAIL_SERVICE_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  
  // System
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  MAINTENANCE_MODE = "MAINTENANCE_MODE",
  
  // File & Upload
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
  UPLOAD_FAILED = "UPLOAD_FAILED",
}

/**
 * Standardized API error response interface
 */
export interface ApiErrorResponse {
  success: false
  error: {
    code: ApiErrorCode
    message: string
    details?: any
    timestamp: string
    requestId?: string
    path?: string
  }
  statusCode: number
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  public readonly code: ApiErrorCode
  public readonly statusCode: number
  public readonly details?: any
  public readonly isOperational: boolean

  constructor(
    code: ApiErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.isOperational = isOperational

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Convert to API response format
   */
  toResponse(requestId?: string, path?: string): ApiErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
        requestId,
        path,
      },
      statusCode: this.statusCode,
    }
  }

  /**
   * Convert to NextResponse
   */
  toNextResponse(requestId?: string, path?: string): NextResponse {
    const response = this.toResponse(requestId, path)
    return NextResponse.json(response, { status: this.statusCode })
  }
}

/**
 * Predefined error factories for common scenarios
 */
export class ApiErrors {
  // Authentication & Authorization
  static unauthorized(message: string = "Authentication required"): ApiError {
    return new ApiError(ApiErrorCode.UNAUTHORIZED, message, 401)
  }

  static forbidden(message: string = "Insufficient permissions"): ApiError {
    return new ApiError(ApiErrorCode.FORBIDDEN, message, 403)
  }

  static emailNotVerified(message: string = "Email verification required"): ApiError {
    return new ApiError(ApiErrorCode.EMAIL_NOT_VERIFIED, message, 403)
  }

  // Validation
  static validation(message: string, details?: ZodIssue[]): ApiError {
    return new ApiError(ApiErrorCode.VALIDATION_ERROR, message, 400, details)
  }

  static invalidInput(message: string, field?: string): ApiError {
    return new ApiError(ApiErrorCode.INVALID_INPUT, message, 400, { field })
  }

  static requiredField(field: string): ApiError {
    return new ApiError(
      ApiErrorCode.REQUIRED_FIELD_MISSING,
      `Required field '${field}' is missing`,
      400,
      { field }
    )
  }

  // Resource Management
  static notFound(resource: string, id?: string): ApiError {
    const message = id 
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`
    return new ApiError(ApiErrorCode.RESOURCE_NOT_FOUND, message, 404, { resource, id })
  }

  static alreadyExists(resource: string, field?: string): ApiError {
    const message = field
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`
    return new ApiError(ApiErrorCode.RESOURCE_ALREADY_EXISTS, message, 409, { resource, field })
  }

  static conflict(message: string, details?: any): ApiError {
    return new ApiError(ApiErrorCode.RESOURCE_CONFLICT, message, 409, details)
  }

  // Rate Limiting
  static rateLimitExceeded(limit: number, window: string): ApiError {
    return new ApiError(
      ApiErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded: ${limit} requests per ${window}`,
      429,
      { limit, window }
    )
  }

  // Business Logic
  static hipaaViolation(message: string, details?: any): ApiError {
    return new ApiError(ApiErrorCode.HIPAA_VIOLATION, message, 403, details)
  }

  static businessRule(message: string, rule?: string): ApiError {
    return new ApiError(ApiErrorCode.BUSINESS_RULE_VIOLATION, message, 400, { rule })
  }

  // Data & Processing
  static dataIntegrity(message: string, details?: any): ApiError {
    return new ApiError(ApiErrorCode.DATA_INTEGRITY_ERROR, message, 422, details)
  }

  static encryptionError(message: string = "Encryption operation failed"): ApiError {
    return new ApiError(ApiErrorCode.ENCRYPTION_ERROR, message, 500)
  }

  static decryptionError(message: string = "Decryption operation failed"): ApiError {
    return new ApiError(ApiErrorCode.DECRYPTION_ERROR, message, 500)
  }

  // System
  static internal(message: string = "Internal server error", details?: any): ApiError {
    return new ApiError(ApiErrorCode.INTERNAL_SERVER_ERROR, message, 500, details, false)
  }

  static serviceUnavailable(message: string = "Service temporarily unavailable"): ApiError {
    return new ApiError(ApiErrorCode.SERVICE_UNAVAILABLE, message, 503)
  }

  static maintenance(message: string = "System under maintenance"): ApiError {
    return new ApiError(ApiErrorCode.MAINTENANCE_MODE, message, 503)
  }

  // File & Upload
  static fileTooLarge(maxSize: string): ApiError {
    return new ApiError(
      ApiErrorCode.FILE_TOO_LARGE,
      `File exceeds maximum size of ${maxSize}`,
      413,
      { maxSize }
    )
  }

  static invalidFileType(allowedTypes: string[]): ApiError {
    return new ApiError(
      ApiErrorCode.INVALID_FILE_TYPE,
      `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
      400,
      { allowedTypes }
    )
  }
}

/**
 * Global error handler that converts various error types to standardized API responses
 */
export class ErrorHandler {
  /**
   * Convert any error to standardized API error response
   */
  static handleError(
    error: unknown,
    requestId?: string,
    path?: string,
    userId?: string
  ): NextResponse {
    let apiError: ApiError

    if (error instanceof ApiError) {
      apiError = error
    } else if (error instanceof ZodError) {
      apiError = this.handleZodError(error)
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      apiError = this.handlePrismaError(error)
    } else if (error instanceof Error) {
      apiError = this.handleGenericError(error)
    } else {
      apiError = ApiErrors.internal("Unknown error occurred")
    }

    // Log error for audit and debugging
    this.logError(apiError, requestId, path, userId)

    return apiError.toNextResponse(requestId, path)
  }

  /**
   * Handle Zod validation errors
   */
  private static handleZodError(error: ZodError): ApiError {
    const issues = error.issues.map(issue => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }))

    return ApiErrors.validation(
      "Validation failed",
      issues
    )
  }

  /**
   * Handle Prisma database errors
   */
  private static handlePrismaError(error: Prisma.PrismaClientKnownRequestError): ApiError {
    switch (error.code) {
      case "P2002":
        // Unique constraint violation
        const target = error.meta?.target as string[] | undefined
        const field = target ? target[0] : "field"
        return ApiErrors.alreadyExists("Resource", field)

      case "P2025":
        // Record not found
        return ApiErrors.notFound("Resource")

      case "P2003":
        // Foreign key constraint violation
        return ApiErrors.dataIntegrity("Referenced resource does not exist")

      case "P2021":
        // Table does not exist
        return ApiErrors.internal("Database configuration error")

      case "P2024":
        // Connection timeout
        return ApiErrors.serviceUnavailable("Database connection timeout")

      default:
        return ApiErrors.internal("Database operation failed", {
          code: error.code,
          meta: error.meta,
        })
    }
  }

  /**
   * Handle generic JavaScript errors
   */
  private static handleGenericError(error: Error): ApiError {
    // Don't expose internal error details in production
    const message = process.env.NODE_ENV === "production"
      ? "Internal server error"
      : error.message

    return ApiErrors.internal(message, {
      name: error.name,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }

  /**
   * Log error for audit and debugging
   */
  private static async logError(
    apiError: ApiError,
    requestId?: string,
    path?: string,
    userId?: string
  ): Promise<void> {
    const logLevel = apiError.statusCode >= 500 ? "error" : "warn"
    const logData = {
      code: apiError.code,
      message: apiError.message,
      statusCode: apiError.statusCode,
      details: apiError.details,
      requestId,
      path,
      userId,
      timestamp: new Date().toISOString(),
    }

    // Console logging
    console[logLevel]("API Error:", logData)

    // Audit logging for security-related errors
    if (this.isSecurityError(apiError.code)) {
      try {
        await auditLogger.log({
          eventType: AuditEventType.UNAUTHORIZED_ACCESS,
          outcome: AuditOutcome.FAILURE,
          timestamp: new Date(),
          userId,
          resourceType: "API",
          resourceId: path,
          dataSensitivity: DataSensitivity.INTERNAL,
          details: {
            errorCode: apiError.code,
            errorMessage: apiError.message,
            requestId,
            path,
          },
        })
      } catch (auditError) {
        console.error("Failed to log security error to audit system:", auditError)
      }
    }
  }

  /**
   * Check if error is security-related and needs audit logging
   */
  private static isSecurityError(code: ApiErrorCode): boolean {
    return [
      ApiErrorCode.UNAUTHORIZED,
      ApiErrorCode.FORBIDDEN,
      ApiErrorCode.HIPAA_VIOLATION,
      ApiErrorCode.INVALID_TOKEN,
      ApiErrorCode.TOKEN_EXPIRED,
      ApiErrorCode.RATE_LIMIT_EXCEEDED,
    ].includes(code)
  }
}

/**
 * Success response helpers
 */
export interface ApiSuccessResponse<T = any> {
  success: true
  data?: T
  message?: string
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    timestamp?: string
    requestId?: string
  }
}

export class ApiResponse {
  /**
   * Create success response
   */
  static success<T>(
    data?: T,
    message?: string,
    meta?: ApiSuccessResponse<T>["meta"]
  ): NextResponse {
    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    }

    return NextResponse.json(response)
  }

  /**
   * Create paginated success response
   */
  static paginated<T>(
    data: T[],
    pagination: {
      page: number
      limit: number
      total: number
    },
    message?: string
  ): NextResponse {
    const totalPages = Math.ceil(pagination.total / pagination.limit)

    return ApiResponse.success(data, message, {
      pagination: {
        ...pagination,
        totalPages,
      },
    })
  }

  /**
   * Create created response (201)
   */
  static created<T>(data?: T, message?: string): NextResponse {
    const response = ApiResponse.success(data, message || "Resource created successfully")
    response.status = 201
    return response
  }

  /**
   * Create no content response (204)
   */
  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 })
  }
}