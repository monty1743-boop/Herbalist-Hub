import { z } from "zod"

/**
 * Form field types and their validation schemas
 */
export enum FormFieldType {
  TEXT = "text",
  TEXTAREA = "textarea",
  EMAIL = "email",
  PHONE = "phone",
  NUMBER = "number",
  DATE = "date",
  DATETIME = "datetime",
  TIME = "time",
  SELECT = "select",
  RADIO = "radio",
  CHECKBOX = "checkbox",
  MULTI_CHECKBOX = "multi_checkbox",
  FILE = "file",
  SIGNATURE = "signature",
  RATING = "rating",
  SCALE = "scale",
  RANGE = "range",
  ADDRESS = "address",
  URL = "url",
  PASSWORD = "password",
  COLOR = "color",
}

/**
 * Conditional logic operators
 */
export enum ConditionalOperator {
  EQUALS = "equals",
  NOT_EQUALS = "not_equals",
  CONTAINS = "contains",
  NOT_CONTAINS = "not_contains",
  GREATER_THAN = "greater_than",
  LESS_THAN = "less_than",
  GREATER_EQUAL = "greater_equal",
  LESS_EQUAL = "less_equal",
  IS_EMPTY = "is_empty",
  IS_NOT_EMPTY = "is_not_empty",
  STARTS_WITH = "starts_with",
  ENDS_WITH = "ends_with",
  IN_LIST = "in_list",
  NOT_IN_LIST = "not_in_list",
}

/**
 * Field validation rule schema
 */
export const fieldValidationSchema = z.object({
  minLength: z.number().min(0).optional(),
  maxLength: z.number().min(1).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  customMessage: z.string().optional(),
  allowedExtensions: z.array(z.string()).optional(), // For file fields
  maxFileSize: z.number().optional(), // In bytes
  required: z.boolean().default(false),
})

/**
 * Conditional logic rule schema
 */
export const conditionalRuleSchema = z.object({
  fieldId: z.string(),
  operator: z.nativeEnum(ConditionalOperator),
  value: z.any(),
  logicalOperator: z.enum(["AND", "OR"]).optional().default("AND"),
})

/**
 * Form field option schema (for select, radio, checkbox fields)
 */
export const fieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
  conditionalLogic: z.object({
    showFields: z.array(z.string()).optional(),
    hideFields: z.array(z.string()).optional(),
  }).optional(),
})

/**
 * Form field schema
 */
export const formFieldSchema = z.object({
  id: z.string().min(1),
  type: z.nativeEnum(FormFieldType),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean().default(false),
  validation: fieldValidationSchema.optional(),
  options: z.array(fieldOptionSchema).optional(),
  conditionalLogic: z.object({
    showIf: z.array(conditionalRuleSchema).optional(),
    hideIf: z.array(conditionalRuleSchema).optional(),
    requiredIf: z.array(conditionalRuleSchema).optional(),
  }).optional(),
  styling: z.object({
    width: z.enum(["full", "half", "third", "quarter", "auto"]).default("full"),
    className: z.string().optional(),
    inline: z.boolean().default(false),
  }).optional(),
  metadata: z.object({
    isHealthData: z.boolean().default(false),
    category: z.string().optional(),
    order: z.number().optional(),
    internalNotes: z.string().optional(),
  }).optional(),
  // Field-specific properties
  properties: z.record(z.any()).optional(),
})

/**
 * Form section schema
 */
export const formSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(formFieldSchema),
  conditionalLogic: z.object({
    showIf: z.array(conditionalRuleSchema).optional(),
    hideIf: z.array(conditionalRuleSchema).optional(),
  }).optional(),
  styling: z.object({
    layout: z.enum(["single_column", "two_column", "grid"]).default("single_column"),
    className: z.string().optional(),
  }).optional(),
  order: z.number().optional(),
})

/**
 * Form settings schema
 */
export const formSettingsSchema = z.object({
  allowSaveProgress: z.boolean().default(true),
  allowMultipleSubmissions: z.boolean().default(false),
  requiresAuthentication: z.boolean().default(true),
  maxSubmissions: z.number().min(1).optional(),
  submissionDeadline: z.string().datetime().optional(),
  notificationEmails: z.array(z.string().email()).optional(),
  confirmationMessage: z.string().optional(),
  redirectUrl: z.string().url().optional(),
  autoSaveInterval: z.number().min(30).optional(), // seconds
  styling: z.object({
    theme: z.enum(["default", "modern", "minimal", "medical", "custom"]).default("default"),
    primaryColor: z.string().optional(),
    fontFamily: z.string().optional(),
    customCSS: z.string().optional(),
  }).optional(),
  accessibility: z.object({
    enableScreenReader: z.boolean().default(true),
    enableKeyboardNavigation: z.boolean().default(true),
    enableHighContrast: z.boolean().default(false),
  }).optional(),
})

/**
 * Complete form schema
 */
export const intakeFormSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  sections: z.array(formSectionSchema).min(1),
  settings: formSettingsSchema.optional().default({}),
  metadata: z.object({
    category: z.string().optional(),
    estimatedTime: z.number().min(1).optional(), // minutes
    tags: z.array(z.string()).optional(),
    isTemplate: z.boolean().default(false),
    templateCategory: z.string().optional(),
    version: z.string().optional(),
    author: z.string().optional(),
    lastModified: z.string().datetime().optional(),
  }).optional().default({}),
})

/**
 * Form response validation utilities
 */
export class FormValidator {
  /**
   * Validate a form response against the form schema
   */
  static validateResponse(
    formData: any,
    responseData: Record<string, any>
  ): { isValid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = []
    
    // Parse form structure
    const form = intakeFormSchema.parse(formData)
    
    // Validate each section and field
    for (const section of form.sections) {
      for (const field of section.fields) {
        const fieldErrors = this.validateField(field, responseData[field.id])
        errors.push(...fieldErrors)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    }
  }
  
  /**
   * Validate a single field response
   */
  static validateField(
    field: z.infer<typeof formFieldSchema>,
    value: any
  ): ValidationError[] {
    const errors: ValidationError[] = []
    
    // Check if field is required
    if (field.required && (value === undefined || value === null || value === "")) {
      errors.push({
        fieldId: field.id,
        fieldLabel: field.label,
        type: "required",
        message: `${field.label} is required`,
      })
      return errors // Don't continue validation if required field is empty
    }
    
    // Skip validation if field is empty and not required
    if (value === undefined || value === null || value === "") {
      return errors
    }
    
    // Type-specific validation
    switch (field.type) {
      case FormFieldType.EMAIL:
        if (!this.isValidEmail(value)) {
          errors.push({
            fieldId: field.id,
            fieldLabel: field.label,
            type: "format",
            message: "Please enter a valid email address",
          })
        }
        break
        
      case FormFieldType.PHONE:
        if (!this.isValidPhone(value)) {
          errors.push({
            fieldId: field.id,
            fieldLabel: field.label,
            type: "format",
            message: "Please enter a valid phone number",
          })
        }
        break
        
      case FormFieldType.NUMBER:
        if (isNaN(Number(value))) {
          errors.push({
            fieldId: field.id,
            fieldLabel: field.label,
            type: "format",
            message: "Please enter a valid number",
          })
        }
        break
        
      case FormFieldType.DATE:
      case FormFieldType.DATETIME:
        if (!this.isValidDate(value)) {
          errors.push({
            fieldId: field.id,
            fieldLabel: field.label,
            type: "format",
            message: "Please enter a valid date",
          })
        }
        break
        
      case FormFieldType.URL:
        if (!this.isValidURL(value)) {
          errors.push({
            fieldId: field.id,
            fieldLabel: field.label,
            type: "format",
            message: "Please enter a valid URL",
          })
        }
        break
    }
    
    // Validation rules
    if (field.validation) {
      const validation = field.validation
      
      // String length validation
      if (typeof value === "string") {
        if (validation.minLength && value.length < validation.minLength) {
          errors.push({
            fieldId: field.id,
            fieldLabel: field.label,
            type: "minLength",
            message: `${field.label} must be at least ${validation.minLength} characters`,
          })
        }
        
        if (validation.maxLength && value.length > validation.maxLength) {
          errors.push({
            fieldId: field.id,
            fieldLabel: field.label,
            type: "maxLength",
            message: `${field.label} must be no more than ${validation.maxLength} characters`,
          })
        }
        
        // Pattern validation
        if (validation.pattern) {
          try {
            const regex = new RegExp(validation.pattern)
            if (!regex.test(value)) {
              errors.push({
                fieldId: field.id,
                fieldLabel: field.label,
                type: "pattern",
                message: validation.customMessage || `${field.label} format is invalid`,
              })
            }
          } catch (e) {
            console.error("Invalid regex pattern:", validation.pattern)
          }
        }
      }
      
      // Numeric validation
      if (typeof value === "number" || !isNaN(Number(value))) {
        const numValue = Number(value)
        
        if (validation.min !== undefined && numValue < validation.min) {
          errors.push({
            fieldId: field.id,
            fieldLabel: field.label,
            type: "min",
            message: `${field.label} must be at least ${validation.min}`,
          })
        }
        
        if (validation.max !== undefined && numValue > validation.max) {
          errors.push({
            fieldId: field.id,
            fieldLabel: field.label,
            type: "max",
            message: `${field.label} must be no more than ${validation.max}`,
          })
        }
      }
    }
    
    return errors
  }
  
  /**
   * Evaluate conditional logic
   */
  static evaluateConditions(
    conditions: z.infer<typeof conditionalRuleSchema>[],
    responseData: Record<string, any>
  ): boolean {
    if (!conditions || conditions.length === 0) return true
    
    const results = conditions.map(condition => {
      const fieldValue = responseData[condition.fieldId]
      return this.evaluateCondition(condition, fieldValue)
    })
    
    // For now, use AND logic (all conditions must be true)
    // TODO: Implement proper logical operators
    return results.every(result => result)
  }
  
  /**
   * Evaluate a single condition
   */
  static evaluateCondition(
    condition: z.infer<typeof conditionalRuleSchema>,
    fieldValue: any
  ): boolean {
    switch (condition.operator) {
      case ConditionalOperator.EQUALS:
        return fieldValue === condition.value
      case ConditionalOperator.NOT_EQUALS:
        return fieldValue !== condition.value
      case ConditionalOperator.CONTAINS:
        return typeof fieldValue === "string" && fieldValue.includes(condition.value)
      case ConditionalOperator.NOT_CONTAINS:
        return typeof fieldValue === "string" && !fieldValue.includes(condition.value)
      case ConditionalOperator.GREATER_THAN:
        return Number(fieldValue) > Number(condition.value)
      case ConditionalOperator.LESS_THAN:
        return Number(fieldValue) < Number(condition.value)
      case ConditionalOperator.GREATER_EQUAL:
        return Number(fieldValue) >= Number(condition.value)
      case ConditionalOperator.LESS_EQUAL:
        return Number(fieldValue) <= Number(condition.value)
      case ConditionalOperator.IS_EMPTY:
        return !fieldValue || fieldValue === "" || fieldValue === null || fieldValue === undefined
      case ConditionalOperator.IS_NOT_EMPTY:
        return fieldValue !== "" && fieldValue !== null && fieldValue !== undefined
      case ConditionalOperator.STARTS_WITH:
        return typeof fieldValue === "string" && fieldValue.startsWith(condition.value)
      case ConditionalOperator.ENDS_WITH:
        return typeof fieldValue === "string" && fieldValue.endsWith(condition.value)
      case ConditionalOperator.IN_LIST:
        return Array.isArray(condition.value) && condition.value.includes(fieldValue)
      case ConditionalOperator.NOT_IN_LIST:
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue)
      default:
        return false
    }
  }
  
  // Helper validation methods
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  private static isValidPhone(phone: string): boolean {
    // Simple phone validation - can be enhanced based on requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, "")
    return phoneRegex.test(cleanPhone)
  }
  
  private static isValidDate(date: string): boolean {
    const parsedDate = new Date(date)
    return !isNaN(parsedDate.getTime())
  }
  
  private static isValidURL(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Validation error interface
 */
export interface ValidationError {
  fieldId: string
  fieldLabel: string
  type: "required" | "format" | "minLength" | "maxLength" | "min" | "max" | "pattern" | "custom"
  message: string
}

/**
 * Form analytics utilities
 */
export class FormAnalytics {
  /**
   * Calculate form completion metrics
   */
  static calculateCompletionMetrics(responses: any[]): FormCompletionMetrics {
    const totalSubmissions = responses.length
    const completedSubmissions = responses.filter(r => r.completedAt).length
    const draftSubmissions = totalSubmissions - completedSubmissions
    
    return {
      totalSubmissions,
      completedSubmissions,
      draftSubmissions,
      completionRate: totalSubmissions > 0 ? (completedSubmissions / totalSubmissions) * 100 : 0,
      averageTimeToComplete: this.calculateAverageCompletionTime(responses),
    }
  }
  
  /**
   * Calculate field completion rates
   */
  static calculateFieldMetrics(
    formSchema: any,
    responses: any[]
  ): Record<string, FieldMetrics> {
    const fieldMetrics: Record<string, FieldMetrics> = {}
    
    // Extract all field IDs from form schema
    const fieldIds = new Set<string>()
    formSchema.sections?.forEach((section: any) => {
      section.fields?.forEach((field: any) => {
        fieldIds.add(field.id)
      })
    })
    
    // Calculate metrics for each field
    fieldIds.forEach(fieldId => {
      const fieldResponses = responses.map(r => r.responses?.[fieldId]).filter(v => v !== undefined)
      const emptyResponses = fieldResponses.filter(v => !v || v === "").length
      const filledResponses = fieldResponses.length - emptyResponses
      
      fieldMetrics[fieldId] = {
        totalResponses: fieldResponses.length,
        filledResponses,
        emptyResponses,
        fillRate: fieldResponses.length > 0 ? (filledResponses / fieldResponses.length) * 100 : 0,
        abandonmentRate: fieldResponses.length > 0 ? (emptyResponses / fieldResponses.length) * 100 : 0,
      }
    })
    
    return fieldMetrics
  }
  
  private static calculateAverageCompletionTime(responses: any[]): number {
    const completionTimes = responses
      .filter(r => r.completedAt && r.createdAt)
      .map(r => new Date(r.completedAt).getTime() - new Date(r.createdAt).getTime())
      .filter(time => time > 0)
    
    return completionTimes.length > 0
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length / 1000 / 60 // Convert to minutes
      : 0
  }
}

export interface FormCompletionMetrics {
  totalSubmissions: number
  completedSubmissions: number
  draftSubmissions: number
  completionRate: number
  averageTimeToComplete: number
}

export interface FieldMetrics {
  totalResponses: number
  filledResponses: number
  emptyResponses: number
  fillRate: number
  abandonmentRate: number
}