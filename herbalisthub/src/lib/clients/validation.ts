import { z } from "zod"
import { Role } from "@prisma/client"

/**
 * Healthcare-specific validation schemas for client data
 */

// Common validation patterns
const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/
const ssnRegex = /^(\d{3}-\d{2}-\d{4}|\d{9})$/
const zipCodeRegex = /^\d{5}(-\d{4})?$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Age validation helper
const calculateAge = (dateOfBirth: string): number => {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

// Basic contact information schema
export const contactInfoSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "First name can only contain letters, spaces, hyphens, apostrophes, and periods"),
  
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Last name can only contain letters, spaces, hyphens, apostrophes, and periods"),
  
  middleName: z
    .string()
    .max(50, "Middle name must be 50 characters or less")
    .regex(/^[a-zA-Z\s\-'\.]*$/, "Middle name can only contain letters, spaces, hyphens, apostrophes, and periods")
    .optional(),
  
  email: z
    .string()
    .email("Invalid email format")
    .max(100, "Email must be 100 characters or less")
    .optional(),
  
  phone: z
    .string()
    .regex(phoneRegex, "Invalid phone number format")
    .optional(),
  
  alternatePhone: z
    .string()
    .regex(phoneRegex, "Invalid alternate phone number format")
    .optional(),
})

// Address schema
export const addressSchema = z.object({
  street: z
    .string()
    .max(100, "Street address must be 100 characters or less")
    .optional(),
  
  street2: z
    .string()
    .max(100, "Address line 2 must be 100 characters or less")
    .optional(),
  
  city: z
    .string()
    .max(50, "City must be 50 characters or less")
    .optional(),
  
  state: z
    .string()
    .max(50, "State must be 50 characters or less")
    .optional(),
  
  zipCode: z
    .string()
    .regex(zipCodeRegex, "Invalid ZIP code format (use XXXXX or XXXXX-XXXX)")
    .optional(),
  
  country: z
    .string()
    .max(50, "Country must be 50 characters or less")
    .default("United States"),
})

// Demographics schema
export const demographicsSchema = z.object({
  dateOfBirth: z
    .string()
    .refine((date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const age = calculateAge(date)
      return birthDate <= today && age >= 0 && age <= 150
    }, "Invalid date of birth")
    .optional(),
  
  gender: z
    .enum(["male", "female", "non-binary", "other", "prefer-not-to-say"])
    .optional(),
  
  pronouns: z
    .string()
    .max(20, "Pronouns must be 20 characters or less")
    .optional(),
  
  preferredLanguage: z
    .string()
    .max(30, "Preferred language must be 30 characters or less")
    .default("English"),
  
  maritalStatus: z
    .enum(["single", "married", "divorced", "widowed", "separated", "domestic-partnership"])
    .optional(),
  
  occupation: z
    .string()
    .max(100, "Occupation must be 100 characters or less")
    .optional(),
})

// Emergency contact schema
export const emergencyContactSchema = z.object({
  name: z
    .string()
    .min(1, "Emergency contact name is required")
    .max(100, "Emergency contact name must be 100 characters or less"),
  
  relationship: z
    .string()
    .min(1, "Relationship is required")
    .max(50, "Relationship must be 50 characters or less"),
  
  phone: z
    .string()
    .regex(phoneRegex, "Invalid emergency contact phone number"),
  
  alternatePhone: z
    .string()
    .regex(phoneRegex, "Invalid alternate emergency contact phone number")
    .optional(),
  
  email: z
    .string()
    .email("Invalid emergency contact email")
    .optional(),
  
  address: addressSchema.optional(),
})

// Insurance information schema
export const insuranceSchema = z.object({
  provider: z
    .string()
    .min(1, "Insurance provider is required")
    .max(100, "Insurance provider must be 100 characters or less"),
  
  policyNumber: z
    .string()
    .min(1, "Policy number is required")
    .max(50, "Policy number must be 50 characters or less"),
  
  groupNumber: z
    .string()
    .max(50, "Group number must be 50 characters or less")
    .optional(),
  
  subscriberName: z
    .string()
    .max(100, "Subscriber name must be 100 characters or less")
    .optional(),
  
  effectiveDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid effective date")
    .optional(),
  
  expirationDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid expiration date")
    .optional(),
  
  copay: z
    .number()
    .min(0, "Copay must be positive")
    .max(1000, "Copay seems unusually high")
    .optional(),
  
  deductible: z
    .number()
    .min(0, "Deductible must be positive")
    .max(50000, "Deductible seems unusually high")
    .optional(),
})

// Health information arrays
export const healthArraySchema = z
  .array(z.string().max(200, "Each item must be 200 characters or less"))
  .max(50, "Too many items (maximum 50)")

// Lifestyle information schema
export const lifestyleSchema = z.object({
  diet: z
    .string()
    .max(500, "Diet information must be 500 characters or less")
    .optional(),
  
  exercise: z
    .string()
    .max(500, "Exercise information must be 500 characters or less")
    .optional(),
  
  sleep: z
    .string()
    .max(500, "Sleep information must be 500 characters or less")
    .optional(),
  
  stress: z
    .string()
    .max(500, "Stress information must be 500 characters or less")
    .optional(),
  
  substances: z
    .array(z.string().max(100, "Substance name must be 100 characters or less"))
    .max(20, "Too many substances listed")
    .optional(),
  
  smokingStatus: z
    .enum(["never", "former", "current", "unknown"])
    .optional(),
  
  alcoholUse: z
    .enum(["none", "occasional", "moderate", "heavy", "unknown"])
    .optional(),
})

// Communication preferences schema
export const communicationPreferencesSchema = z.object({
  email: z.boolean().default(true),
  sms: z.boolean().default(false),
  phone: z.boolean().default(false),
  mail: z.boolean().default(false),
  marketing: z.boolean().default(false),
  appointmentReminders: z.boolean().default(true),
  followUpReminders: z.boolean().default(true),
  educationalContent: z.boolean().default(false),
  
  preferredContactTime: z
    .enum(["morning", "afternoon", "evening", "any"])
    .default("any"),
  
  preferredContactMethod: z
    .enum(["email", "sms", "phone", "mail"])
    .default("email"),
  
  language: z
    .string()
    .max(30, "Language preference must be 30 characters or less")
    .default("English"),
})

// Complete client profile schema
export const clientProfileSchema = z.object({
  // Basic information
  ...contactInfoSchema.shape,
  ...demographicsSchema.shape,
  
  // Address information
  address: addressSchema.optional(),
  
  // Emergency contact
  emergencyContact: emergencyContactSchema.optional(),
  
  // Insurance information
  insurance: insuranceSchema.optional(),
  
  // PHI fields (will be encrypted)
  allergies: healthArraySchema.optional(),
  medications: healthArraySchema.optional(),
  conditions: healthArraySchema.optional(),
  symptoms: healthArraySchema.optional(),
  medicalHistory: healthArraySchema.optional(),
  familyMedicalHistory: healthArraySchema.optional(),
  previousTreatments: healthArraySchema.optional(),
  
  // Health goals and notes
  healthGoals: z
    .string()
    .max(2000, "Health goals must be 2000 characters or less")
    .optional(),
  
  // Lifestyle information
  lifestyle: lifestyleSchema.optional(),
  
  // Communication preferences
  communicationPreferences: communicationPreferencesSchema.optional(),
  
  // Additional notes
  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or less")
    .optional(),
  
  // Administrative fields
  status: z
    .enum(["ACTIVE", "INACTIVE", "ARCHIVED"])
    .default("ACTIVE"),
  
  // Sensitive identifier (optional, highly secured)
  socialSecurityNumber: z
    .string()
    .regex(ssnRegex, "Invalid Social Security Number format")
    .optional(),
  
  // Consent and legal
  consentToTreatment: z.boolean().default(false),
  consentToMarketing: z.boolean().default(false),
  hipaaAcknowledgment: z.boolean().default(false),
  
  // Client preferences
  preferredAppointmentLength: z
    .number()
    .min(15, "Minimum appointment length is 15 minutes")
    .max(240, "Maximum appointment length is 4 hours")
    .optional(),
  
  preferredAppointmentTime: z
    .enum(["morning", "afternoon", "evening", "flexible"])
    .optional(),
})

// Update schema (all fields optional except ID)
export const updateClientProfileSchema = clientProfileSchema.partial()

// Search and filter schemas
export const clientSearchSchema = z.object({
  query: z
    .string()
    .min(1, "Search query is required")
    .max(100, "Search query must be 100 characters or less"),
  
  searchFields: z
    .array(z.enum([
      "name", 
      "email", 
      "phone", 
      "allergies", 
      "medications", 
      "conditions", 
      "symptoms",
      "medicalHistory",
      "healthGoals"
    ]))
    .min(1, "At least one search field must be selected")
    .default(["name", "email"]),
  
  filters: z.object({
    status: z.array(z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"])).optional(),
    ageRange: z.object({
      min: z.number().int().min(0).max(150),
      max: z.number().int().min(0).max(150),
    }).optional(),
    gender: z.array(z.enum(["male", "female", "non-binary", "other", "prefer-not-to-say"])).optional(),
    hasConditions: z.array(z.string()).optional(),
    hasMedications: z.array(z.string()).optional(),
    hasAllergies: z.array(z.string()).optional(),
    lastContactSince: z.string().optional(),
    nextAppointmentBefore: z.string().optional(),
    herbalistId: z.string().uuid().optional(),
  }).optional(),
  
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(25),
  }).optional(),
  
  sorting: z.object({
    field: z.enum(["firstName", "lastName", "email", "createdAt", "lastContactAt", "nextAppointmentAt"]).default("lastName"),
    order: z.enum(["asc", "desc"]).default("asc"),
  }).optional(),
})

// Consent management schema
export const consentSchema = z.object({
  type: z.enum([
    "treatment",
    "marketing", 
    "communication",
    "data_sharing",
    "research_participation",
    "photography",
    "telemedicine"
  ]),
  
  granted: z.boolean(),
  
  grantedAt: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid consent date"),
  
  grantedBy: z.string().uuid("Invalid user ID"),
  
  expiresAt: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid expiration date")
    .optional(),
  
  conditions: z
    .string()
    .max(1000, "Consent conditions must be 1000 characters or less")
    .optional(),
  
  witnessedBy: z.string().uuid("Invalid witness user ID").optional(),
  
  documentVersion: z
    .string()
    .max(20, "Document version must be 20 characters or less")
    .default("1.0"),
  
  notes: z
    .string()
    .max(500, "Consent notes must be 500 characters or less")
    .optional(),
})

// Export request schema
export const exportRequestSchema = z.object({
  format: z.enum(["json", "pdf", "csv"]).default("json"),
  
  includeFields: z
    .array(z.string())
    .optional(),
  
  excludeFields: z
    .array(z.string())
    .optional(),
  
  dateRange: z.object({
    start: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid start date"),
    end: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid end date"),
  }).optional(),
  
  includeRelatedData: z.object({
    consultationNotes: z.boolean().default(true),
    appointments: z.boolean().default(true),
    intakeSubmissions: z.boolean().default(true),
    messages: z.boolean().default(false),
  }).optional(),
  
  reason: z
    .string()
    .min(1, "Export reason is required")
    .max(200, "Export reason must be 200 characters or less"),
})

// Validation helper functions
export const validateClientProfile = (data: unknown) => {
  return clientProfileSchema.safeParse(data)
}

export const validateUpdateClientProfile = (data: unknown) => {
  return updateClientProfileSchema.safeParse(data)
}

export const validateClientSearch = (data: unknown) => {
  return clientSearchSchema.safeParse(data)
}

export const validateConsent = (data: unknown) => {
  return consentSchema.safeParse(data)
}

export const validateExportRequest = (data: unknown) => {
  return exportRequestSchema.safeParse(data)
}

// Custom validation helpers
export const validateAge = (dateOfBirth: string): { isValid: boolean; age?: number; isMinor?: boolean } => {
  try {
    const age = calculateAge(dateOfBirth)
    return {
      isValid: age >= 0 && age <= 150,
      age,
      isMinor: age < 18,
    }
  } catch {
    return { isValid: false }
  }
}

export const validatePhoneNumber = (phone: string): boolean => {
  return phoneRegex.test(phone)
}

export const validateEmail = (email: string): boolean => {
  return emailRegex.test(email)
}

export const validateSSN = (ssn: string): boolean => {
  return ssnRegex.test(ssn)
}

// Role-based access validation
export const validateClientAccess = (
  userRole: Role,
  userId: string,
  clientData: { herbalistId?: string; id?: string }
): { hasAccess: boolean; accessLevel: "none" | "read" | "write" | "admin" } => {
  // Admin has full access to all clients
  if (userRole === Role.ADMIN) {
    return { hasAccess: true, accessLevel: "admin" }
  }
  
  // Herbalists can access their own clients
  if (userRole === Role.HERBALIST && clientData.herbalistId === userId) {
    return { hasAccess: true, accessLevel: "write" }
  }
  
  // Clients can read their own profile
  if (userRole === Role.CLIENT && clientData.id === userId) {
    return { hasAccess: true, accessLevel: "read" }
  }
  
  // No access by default
  return { hasAccess: false, accessLevel: "none" }
}

// Export all schemas for easy import
export {
  contactInfoSchema,
  addressSchema,
  demographicsSchema,
  emergencyContactSchema,
  insuranceSchema,
  healthArraySchema,
  lifestyleSchema,
  communicationPreferencesSchema,
}