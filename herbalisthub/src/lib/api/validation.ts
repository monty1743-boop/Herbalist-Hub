import { z, ZodSchema, ZodError } from "zod"
import { NextRequest } from "next/server"
import { ApiErrors, ApiError } from "./errors"

/**
 * Common validation patterns and schemas
 */
export const CommonValidation = {
  // IDs and identifiers
  id: z.string().cuid("Invalid ID format"),
  uuid: z.string().uuid("Invalid UUID format"),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),

  // Strings with constraints
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  content: z.string().min(1, "Content is required"),

  // Email and contact
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]{10,}$/, "Invalid phone number").optional(),
  url: z.string().url("Invalid URL format").optional(),

  // Dates and times
  date: z.string().datetime("Invalid date format").or(z.date()),
  dateOnly: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),

  // Numbers and pagination
  positiveInt: z.number().int().positive("Must be a positive integer"),
  nonNegativeInt: z.number().int().min(0, "Must be non-negative"),
  page: z.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(20),

  // Enums and choices
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["active", "inactive", "pending", "archived"]),

  // File validation
  fileSize: z.number().max(10 * 1024 * 1024, "File size cannot exceed 10MB"),
  imageType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  documentType: z.enum(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),

  // Search and filtering
  searchQuery: z.string().min(2, "Search query must be at least 2 characters").max(100, "Search query too long").optional(),
  tags: z.array(z.string().min(1)).max(10, "Too many tags").optional(),
}

/**
 * Query parameter validation schemas
 */
export const QueryValidation = {
  pagination: z.object({
    page: CommonValidation.page,
    limit: CommonValidation.limit,
  }),

  search: z.object({
    q: CommonValidation.searchQuery,
    sort: z.string().optional(),
    order: CommonValidation.sortOrder,
  }),

  dateRange: z.object({
    startDate: CommonValidation.date.optional(),
    endDate: CommonValidation.date.optional(),
  }).refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate)
      }
      return true
    },
    { message: "Start date must be before or equal to end date" }
  ),

  filter: z.object({
    status: CommonValidation.status.optional(),
    tags: CommonValidation.tags,
    category: z.string().optional(),
  }),
}

/**
 * Request body validation utilities
 */
export class RequestValidator {
  /**
   * Validate request body against schema
   */
  static async validateBody<T>(
    request: NextRequest,
    schema: ZodSchema<T>
  ): Promise<T> {
    try {
      const body = await request.json()
      return schema.parse(body)
    } catch (error) {
      if (error instanceof ZodError) {
        throw ApiErrors.validation("Invalid request body", error.issues)
      }
      if (error instanceof SyntaxError) {
        throw ApiErrors.invalidInput("Invalid JSON in request body")
      }
      throw error
    }
  }

  /**
   * Validate query parameters against schema
   */
  static validateQuery<T>(
    request: NextRequest,
    schema: ZodSchema<T>
  ): T {
    try {
      const { searchParams } = new URL(request.url)
      const params: Record<string, any> = {}

      // Convert URLSearchParams to object
      for (const [key, value] of searchParams.entries()) {
        // Handle array parameters (e.g., tags=tag1&tags=tag2)
        if (params[key]) {
          if (Array.isArray(params[key])) {
            params[key].push(value)
          } else {
            params[key] = [params[key], value]
          }
        } else {
          // Try to parse numbers and booleans
          if (value === "true") params[key] = true
          else if (value === "false") params[key] = false
          else if (!isNaN(Number(value)) && value !== "") params[key] = Number(value)
          else params[key] = value
        }
      }

      return schema.parse(params)
    } catch (error) {
      if (error instanceof ZodError) {
        throw ApiErrors.validation("Invalid query parameters", error.issues)
      }
      throw error
    }
  }

  /**
   * Validate path parameters against schema
   */
  static validateParams<T>(
    params: Record<string, string | string[]>,
    schema: ZodSchema<T>
  ): T {
    try {
      return schema.parse(params)
    } catch (error) {
      if (error instanceof ZodError) {
        throw ApiErrors.validation("Invalid path parameters", error.issues)
      }
      throw error
    }
  }

  /**
   * Validate form data (multipart/form-data)
   */
  static async validateFormData<T>(
    request: NextRequest,
    schema: ZodSchema<T>
  ): Promise<T> {
    try {
      const formData = await request.formData()
      const data: Record<string, any> = {}

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          data[key] = value
        } else {
          // Handle multiple values with same key
          if (data[key]) {
            if (Array.isArray(data[key])) {
              data[key].push(value)
            } else {
              data[key] = [data[key], value]
            }
          } else {
            data[key] = value
          }
        }
      }

      return schema.parse(data)
    } catch (error) {
      if (error instanceof ZodError) {
        throw ApiErrors.validation("Invalid form data", error.issues)
      }
      throw error
    }
  }
}

/**
 * Higher-order function for API route validation
 */
export function withValidation<
  TBody = any,
  TQuery = any,
  TParams = any
>(options: {
  body?: ZodSchema<TBody>
  query?: ZodSchema<TQuery>
  params?: ZodSchema<TParams>
}) {
  return function <T extends any[]>(
    handler: (
      request: NextRequest,
      context: { params?: any },
      validated: {
        body?: TBody
        query?: TQuery
        params?: TParams
      },
      ...args: T
    ) => Promise<Response>
  ) {
    return async (
      request: NextRequest,
      context: { params?: any } = {},
      ...args: T
    ): Promise<Response> => {
      const validated: {
        body?: TBody
        query?: TQuery
        params?: TParams
      } = {}

      try {
        // Validate request body
        if (options.body) {
          validated.body = await RequestValidator.validateBody(request, options.body)
        }

        // Validate query parameters
        if (options.query) {
          validated.query = RequestValidator.validateQuery(request, options.query)
        }

        // Validate path parameters
        if (options.params && context.params) {
          validated.params = RequestValidator.validateParams(context.params, options.params)
        }

        return await handler(request, context, validated, ...args)
      } catch (error) {
        if (error instanceof ApiError) {
          return error.toNextResponse()
        }
        throw error
      }
    }
  }
}

/**
 * Specialized validation schemas for different use cases
 */
export const ValidationSchemas = {
  // User management
  createUser: z.object({
    name: CommonValidation.name,
    email: CommonValidation.email,
    role: z.enum(["ADMIN", "HERBALIST", "CLIENT", "PUBLIC"]).default("CLIENT"),
    phone: CommonValidation.phone,
  }),

  updateUser: z.object({
    name: CommonValidation.name.optional(),
    phone: CommonValidation.phone,
    image: CommonValidation.url,
  }),

  // Client profile (with PHI validation)
  clientProfile: z.object({
    dateOfBirth: CommonValidation.date.optional(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    allergies: z.array(z.string().min(1)).max(20, "Too many allergies listed").optional(),
    medications: z.array(z.string().min(1)).max(50, "Too many medications listed").optional(),
    conditions: z.array(z.string().min(1)).max(30, "Too many conditions listed").optional(),
    healthGoals: z.string().max(2000, "Health goals too long").optional(),
    emergencyContact: z.object({
      name: CommonValidation.name,
      phone: CommonValidation.phone.optional(),
      relationship: z.string().min(1, "Relationship is required"),
    }).optional(),
    communicationPrefs: z.object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
      phone: z.boolean().default(false),
    }).optional(),
  }),

  // Consultation notes
  consultationNote: z.object({
    chiefComplaint: z.string().min(1, "Chief complaint is required").max(1000),
    assessment: z.string().min(1, "Assessment is required").max(2000),
    recommendations: z.string().min(1, "Recommendations are required").max(2000),
    followUp: z.string().max(1000).optional(),
    privateNotes: z.string().max(1000).optional(),
    sessionDate: CommonValidation.date,
    duration: z.number().int().min(1).max(480).optional(), // Max 8 hours
    sessionType: z.enum(["in_person", "virtual", "phone"]).default("in_person"),
  }),

  // Appointments
  appointment: z.object({
    startTime: CommonValidation.date,
    endTime: CommonValidation.date,
    title: CommonValidation.title,
    description: CommonValidation.description,
    type: z.enum(["INITIAL_CONSULTATION", "FOLLOW_UP", "PHONE_CONSULT", "VIDEO_CONSULT", "GROUP_SESSION", "WORKSHOP"]),
    location: z.string().max(200).optional(),
    isVirtual: z.boolean().default(false),
  }).refine(
    (data) => new Date(data.startTime) < new Date(data.endTime),
    { message: "Start time must be before end time" }
  ),

  // Content management
  blogPost: z.object({
    title: CommonValidation.title,
    slug: CommonValidation.slug.optional(),
    excerpt: z.string().max(300).optional(),
    content: CommonValidation.content,
    metaTitle: z.string().max(60).optional(),
    metaDescription: z.string().max(160).optional(),
    keywords: z.array(z.string().min(1)).max(10).optional(),
    featuredImage: CommonValidation.url,
    published: z.boolean().default(false),
    scheduledAt: CommonValidation.date.optional(),
  }),

  // File uploads
  fileUpload: z.object({
    file: z.instanceof(File),
    category: z.enum(["profile", "consultation", "document", "image"]).default("document"),
    isPublic: z.boolean().default(false),
  }).refine(
    (data) => data.file.size <= 10 * 1024 * 1024,
    { message: "File size cannot exceed 10MB" }
  ),
}

/**
 * Request sanitization utilities
 */
export class RequestSanitizer {
  /**
   * Sanitize string input to prevent XSS
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, "") // Remove angle brackets
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers
      .trim()
  }

  /**
   * Sanitize HTML content (allow safe tags only)
   */
  static sanitizeHtml(input: string): string {
    // In production, use a proper HTML sanitization library like DOMPurify
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^>]*>/gi, "")
      .replace(/<object\b[^>]*>/gi, "")
      .replace(/<embed\b[^>]*>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+=/gi, "")
  }

  /**
   * Sanitize search query
   */
  static sanitizeSearchQuery(query: string): string {
    return query
      .replace(/[^\w\s\-_.]/g, "") // Only allow word chars, spaces, hyphens, underscores, dots
      .replace(/\s+/g, " ") // Normalize spaces
      .trim()
      .substring(0, 100) // Limit length
  }

  /**
   * Sanitize entire object recursively
   */
  static sanitizeObject(obj: any): any {
    if (typeof obj === "string") {
      return this.sanitizeString(obj)
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item))
    }
    
    if (obj && typeof obj === "object") {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value)
      }
      return sanitized
    }
    
    return obj
  }
}

/**
 * Business rule validation utilities
 */
export class BusinessRuleValidator {
  /**
   * Validate appointment scheduling rules
   */
  static validateAppointmentScheduling(
    startTime: Date,
    endTime: Date,
    userRole: string
  ): void {
    const now = new Date()
    const duration = endTime.getTime() - startTime.getTime()
    const hours = duration / (1000 * 60 * 60)

    // Cannot schedule in the past
    if (startTime <= now) {
      throw ApiErrors.businessRule("Cannot schedule appointments in the past")
    }

    // Duration limits
    if (hours > 4) {
      throw ApiErrors.businessRule("Appointment cannot exceed 4 hours")
    }

    if (hours < 0.25) {
      throw ApiErrors.businessRule("Appointment must be at least 15 minutes")
    }

    // Business hours (9 AM to 6 PM)
    const startHour = startTime.getHours()
    const endHour = endTime.getHours()

    if (startHour < 9 || endHour > 18) {
      throw ApiErrors.businessRule("Appointments must be scheduled during business hours (9 AM - 6 PM)")
    }

    // No weekend appointments for regular users
    const dayOfWeek = startTime.getDay()
    if ((dayOfWeek === 0 || dayOfWeek === 6) && userRole !== "ADMIN") {
      throw ApiErrors.businessRule("Weekend appointments require admin approval")
    }
  }

  /**
   * Validate user permissions for resource access
   */
  static validateResourceAccess(
    userRole: string,
    resourceOwnerId: string,
    requestingUserId: string,
    resourceType: string
  ): void {
    // Admin can access everything
    if (userRole === "ADMIN") return

    // Users can access their own resources
    if (resourceOwnerId === requestingUserId) return

    // Herbalists can access client resources
    if (userRole === "HERBALIST" && resourceType.includes("Client")) return

    throw ApiErrors.forbidden("Insufficient permissions to access this resource")
  }

  /**
   * Validate data retention policies
   */
  static validateDataRetention(
    createdAt: Date,
    dataType: string,
    operation: "read" | "update" | "delete"
  ): void {
    const now = new Date()
    const ageInYears = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365)

    // HIPAA requires 6-year retention for most health records
    const retentionYears = dataType.includes("health") || dataType.includes("consultation") ? 6 : 3

    if (ageInYears > retentionYears && operation !== "delete") {
      throw ApiErrors.businessRule(
        `Data older than ${retentionYears} years cannot be ${operation === "read" ? "accessed" : "modified"}`
      )
    }
  }
}