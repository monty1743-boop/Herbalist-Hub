import { z } from "zod"
import { ZodError } from "zod"

// Common validation utilities
export const emailSchema = z.string().email("Please enter a valid email address")

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]{10,}$/, "Please enter a valid phone number")

export const urlSchema = z.string().url("Please enter a valid URL")

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
  )

// Date validation helpers
export const dateStringSchema = z.string().datetime("Please enter a valid date")

export const futureDateSchema = z
  .string()
  .datetime("Please enter a valid date")
  .refine(
    (date) => new Date(date) > new Date(),
    "Date must be in the future"
  )

export const pastDateSchema = z
  .string()
  .datetime("Please enter a valid date")
  .refine(
    (date) => new Date(date) < new Date(),
    "Date must be in the past"
  )

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().min(1, "Page must be at least 1").default(1),
  limit: z.number().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(10),
})

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
})

export const searchSchema = z.object({
  search: z.string().optional(),
  filters: z.record(z.any()).optional(),
})

// File upload schemas
export const imageUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(5 * 1024 * 1024), // 5MB default
  allowedTypes: z.array(z.string()).default(["image/jpeg", "image/png", "image/webp"]),
})

export const documentUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB default
  allowedTypes: z.array(z.string()).default([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ]),
})

// Healthcare-specific validation
export const hipaaCompliantStringSchema = z
  .string()
  .refine(
    (value) => {
      // Check for common patterns that might be PHI
      const ssnPattern = /\b\d{3}-?\d{2}-?\d{4}\b/
      const creditCardPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/
      const phonePattern = /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/
      
      return !ssnPattern.test(value) && !creditCardPattern.test(value)
    },
    "This field may contain sensitive information that should not be stored in plain text"
  )

// Common error message formatters
export function formatZodError(error: ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {}
  
  error.errors.forEach((err) => {
    const path = err.path.join(".")
    formattedErrors[path] = err.message
  })
  
  return formattedErrors
}

export function getFirstZodError(error: ZodError): string {
  return error.errors[0]?.message || "Validation error"
}

// Validation middleware helper
export function validateWithSchema<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string> } => {
    try {
      const validData = schema.parse(data)
      return { success: true, data: validData }
    } catch (error) {
      if (error instanceof ZodError) {
        return { success: false, errors: formatZodError(error) }
      }
      return { success: false, errors: { general: "Validation failed" } }
    }
  }
}

// Custom validation helpers
export const optionalString = z.string().optional().or(z.literal(""))
export const optionalNumber = z.number().optional().or(z.nan().transform(() => undefined))
export const optionalDate = z.string().datetime().optional().or(z.literal(""))

// ID validation
export const cuidSchema = z.string().cuid("Invalid ID format")
export const uuidSchema = z.string().uuid("Invalid UUID format")

// Percentage validation
export const percentageSchema = z.number().min(0, "Percentage cannot be negative").max(100, "Percentage cannot exceed 100")

// Currency validation
export const currencySchema = z.number().min(0, "Amount cannot be negative").multipleOf(0.01, "Amount must be in cents")

// Safe JSON parsing
export const jsonSchema = z.string().transform((str, ctx) => {
  try {
    return JSON.parse(str)
  } catch (e) {
    ctx.addIssue({ code: "custom", message: "Invalid JSON format" })
    return z.NEVER
  }
})

// Array of strings validation
export const stringArraySchema = z.array(z.string()).default([])

// Boolean with string coercion
export const booleanStringSchema = z
  .string()
  .transform((val) => val === "true" || val === "1")
  .or(z.boolean())

// Number with string coercion
export const numberStringSchema = z
  .string()
  .transform((val) => {
    const num = parseFloat(val)
    if (isNaN(num)) {
      throw new Error("Invalid number")
    }
    return num
  })
  .or(z.number())

// Sanitization helpers
export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - in production, use a proper library like DOMPurify
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
}

// Type exports
export type PaginationInput = z.infer<typeof paginationSchema>
export type SortInput = z.infer<typeof sortSchema>
export type SearchInput = z.infer<typeof searchSchema>
export type ImageUploadInput = z.infer<typeof imageUploadSchema>
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>