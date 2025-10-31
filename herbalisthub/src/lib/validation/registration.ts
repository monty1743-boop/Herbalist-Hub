import { z } from "zod"
import { Role } from "@prisma/client"

/**
 * Comprehensive registration validation schemas for different user types
 */

// Base user information (required for all users)
export const baseRegistrationSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  email: z.string()
    .email("Please enter a valid email address")
    .max(255, "Email cannot exceed 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  confirmPassword: z.string(),
  role: z.nativeEnum(Role),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]{10,}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
})

// Practice information for herbalists
export const practiceInfoSchema = z.object({
  licenseNumber: z.string()
    .min(1, "License number is required for herbalist accounts")
    .max(50, "License number cannot exceed 50 characters")
    .regex(/^[A-Z0-9\-]+$/, "License number can only contain uppercase letters, numbers, and hyphens"),
  licenseState: z.string()
    .min(2, "License state is required")
    .max(50, "License state cannot exceed 50 characters"),
  licenseExpiration: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date (YYYY-MM-DD)")
    .refine((date) => {
      const expDate = new Date(date)
      const today = new Date()
      return expDate > today
    }, "License must not be expired"),
  certifications: z.array(z.string().min(1).max(100))
    .min(1, "At least one certification is required")
    .max(10, "Maximum 10 certifications allowed"),
  businessName: z.string()
    .min(1, "Business name is required")
    .max(200, "Business name cannot exceed 200 characters"),
  businessAddress: z.object({
    street: z.string().min(1, "Street address is required").max(100),
    city: z.string().min(1, "City is required").max(50),
    state: z.string().min(2, "State is required").max(50),
    zipCode: z.string()
      .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code"),
    country: z.string().default("United States"),
  }),
  website: z.string()
    .url("Please enter a valid website URL")
    .optional()
    .or(z.literal("")),
  specialties: z.array(z.string().min(1).max(50))
    .max(5, "Maximum 5 specialties allowed")
    .optional(),
  yearsExperience: z.number()
    .min(0, "Years of experience cannot be negative")
    .max(50, "Years of experience cannot exceed 50")
    .optional(),
  professionalBio: z.string()
    .max(1000, "Professional bio cannot exceed 1000 characters")
    .optional(),
})

// Terms and consent
export const consentSchema = z.object({
  termsOfService: z.boolean()
    .refine(val => val === true, "You must accept the Terms of Service"),
  privacyPolicy: z.boolean()
    .refine(val => val === true, "You must accept the Privacy Policy"),
  hipaaConsent: z.boolean()
    .refine(val => val === true, "HIPAA consent is required for healthcare platform access"),
  communicationConsent: z.boolean()
    .default(false), // Optional marketing communications
  dataProcessingConsent: z.boolean()
    .refine(val => val === true, "Data processing consent is required"),
})

// File upload validation
export const fileUploadSchema = z.object({
  licenseDocument: z.object({
    file: z.instanceof(File)
      .refine(file => file.size <= 5 * 1024 * 1024, "File size must be less than 5MB")
      .refine(
        file => ["application/pdf", "image/jpeg", "image/png"].includes(file.type),
        "Only PDF, JPEG, and PNG files are allowed"
      ),
    fileName: z.string(),
    fileSize: z.number(),
  }).optional(),
  insuranceDocument: z.object({
    file: z.instanceof(File)
      .refine(file => file.size <= 5 * 1024 * 1024, "File size must be less than 5MB")
      .refine(
        file => ["application/pdf", "image/jpeg", "image/png"].includes(file.type),
        "Only PDF, JPEG, and PNG files are allowed"
      ),
    fileName: z.string(),
    fileSize: z.number(),
  }).optional(),
})

// Complete herbalist registration schema
export const herbalistRegistrationSchema = baseRegistrationSchema
  .extend({
    role: z.literal(Role.HERBALIST),
    practiceInfo: practiceInfoSchema,
    consent: consentSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

// Client registration schema (simplified)
export const clientRegistrationSchema = baseRegistrationSchema
  .extend({
    role: z.literal(Role.CLIENT),
    consent: consentSchema.omit({ hipaaConsent: true }).extend({
      hipaaConsent: z.boolean().default(true), // Auto-consent for clients
    }),
    dateOfBirth: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date (YYYY-MM-DD)")
      .optional(),
    emergencyContact: z.object({
      name: z.string().min(1, "Emergency contact name is required").max(100),
      phone: z.string()
        .regex(/^\+?[\d\s\-\(\)]{10,}$/, "Please enter a valid phone number"),
      relationship: z.string().min(1, "Relationship is required").max(50),
    }).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

// Public user registration schema (minimal)
export const publicRegistrationSchema = baseRegistrationSchema
  .extend({
    role: z.literal(Role.PUBLIC),
    consent: consentSchema.omit({ hipaaConsent: true }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

// Multi-step registration state
export const registrationStepSchema = z.object({
  currentStep: z.number().min(1).max(4),
  completedSteps: z.array(z.number()),
  role: z.nativeEnum(Role),
})

// Common validation patterns
export const ValidationPatterns = {
  licenseNumber: /^[A-Z0-9\-]+$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  phone: /^\+?[\d\s\-\(\)]{10,}$/,
  businessName: /^[a-zA-Z0-9\s&.,'-]+$/,
  specialty: /^[a-zA-Z\s&,'-]+$/,
}

// Predefined options for form fields
export const RegistrationOptions = {
  certifications: [
    "Certified Master Herbalist",
    "Clinical Herbalist",
    "Registered Herbalist",
    "Ayurvedic Practitioner",
    "Traditional Chinese Medicine Practitioner",
    "Naturopathic Doctor",
    "Holistic Nutritionist",
    "Aromatherapist",
    "Homeopathic Practitioner",
    "Botanical Medicine Specialist",
  ] as const,
  
  specialties: [
    "Women's Health",
    "Digestive Health",
    "Mental Health & Stress",
    "Immune Support",
    "Pain Management",
    "Cardiovascular Health",
    "Respiratory Health",
    "Skin Conditions",
    "Hormonal Balance",
    "Pediatric Herbalism",
  ] as const,
  
  states: [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming",
  ] as const,
}

// Type exports
export type BaseRegistrationInput = z.infer<typeof baseRegistrationSchema>
export type PracticeInfoInput = z.infer<typeof practiceInfoSchema>
export type ConsentInput = z.infer<typeof consentSchema>
export type FileUploadInput = z.infer<typeof fileUploadSchema>
export type HerbalistRegistrationInput = z.infer<typeof herbalistRegistrationSchema>
export type ClientRegistrationInput = z.infer<typeof clientRegistrationSchema>
export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema>
export type RegistrationStepInput = z.infer<typeof registrationStepSchema>

// Registration type union
export type RegistrationInput = 
  | HerbalistRegistrationInput 
  | ClientRegistrationInput 
  | PublicRegistrationInput