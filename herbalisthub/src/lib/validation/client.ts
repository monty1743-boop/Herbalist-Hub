import { z } from "zod"

// Client profile schemas (HIPAA-compliant)
export const clientProfileSchema = z.object({
  userId: z.string(),
  
  // Personal information (some fields will be encrypted)
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  emergencyContact: z
    .object({
      name: z.string().min(1, "Emergency contact name is required"),
      relationship: z.string().min(1, "Relationship is required"),
      phone: z
        .string()
        .regex(/^\+?[\d\s\-\(\)]{10,}$/, "Please enter a valid phone number"),
      email: z.string().email().optional(),
    })
    .optional(),
  
  // Health information (encrypted fields)
  allergies: z.array(z.string()).optional(),
  medications: z
    .array(
      z.object({
        name: z.string().min(1, "Medication name is required"),
        dosage: z.string().optional(),
        frequency: z.string().optional(),
        prescribedBy: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        notes: z.string().optional(),
      })
    )
    .optional(),
  conditions: z.array(z.string()).optional(),
  healthGoals: z.string().optional(),
  
  // Preferences
  communicationPrefs: z
    .object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
      phone: z.boolean().default(true),
      preferredTime: z.enum(["morning", "afternoon", "evening"]).optional(),
      language: z.string().default("en"),
    })
    .optional(),
  treatmentPrefs: z
    .object({
      preferredFormats: z.array(z.enum(["tincture", "tea", "capsule", "powder", "topical"])).optional(),
      tasteConcerns: z.boolean().optional(),
      budgetRange: z.enum(["low", "medium", "high"]).optional(),
      followUpFrequency: z.enum(["weekly", "biweekly", "monthly", "as_needed"]).optional(),
    })
    .optional(),
  
  // Consent and legal (required for HIPAA compliance)
  hipaaConsent: z.boolean().refine((val) => val === true, {
    message: "HIPAA consent is required",
  }),
  consentVersion: z.string().min(1, "Consent version is required"),
})

export const clientProfileUpdateSchema = clientProfileSchema.partial().extend({
  id: z.string(),
  // HIPAA consent cannot be revoked via update
  hipaaConsent: z.boolean().optional(),
})

// Consultation note schemas
export const consultationNoteSchema = z.object({
  clientProfileId: z.string(),
  appointmentId: z.string().optional(),
  
  // Consultation details (encrypted)
  chiefComplaint: z.string().min(1, "Chief complaint is required"),
  assessment: z.string().min(1, "Assessment is required"),
  recommendations: z.string().min(1, "Recommendations are required"),
  followUp: z.string().optional(),
  
  // Session information
  sessionDate: z.string().datetime(),
  duration: z.number().min(1, "Session duration must be at least 1 minute").optional(),
  sessionType: z.enum(["in_person", "virtual", "phone"]).optional(),
  
  // Practitioner notes (encrypted, herbalist only)
  privateNotes: z.string().optional(),
})

export const consultationNoteUpdateSchema = consultationNoteSchema.partial().extend({
  id: z.string(),
})

// Treatment plan schemas
export const treatmentPlanSchema = z.object({
  clientProfileId: z.string(),
  name: z.string().min(1, "Treatment plan name is required"),
  description: z.string().min(1, "Treatment plan description is required"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  
  goals: z
    .array(
      z.object({
        description: z.string().min(1, "Goal description is required"),
        targetDate: z.string().datetime().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        status: z.enum(["not_started", "in_progress", "completed", "on_hold"]).default("not_started"),
      })
    )
    .optional(),
  
  protocols: z
    .array(
      z.object({
        name: z.string().min(1, "Protocol name is required"),
        description: z.string().optional(),
        instructions: z.string().min(1, "Protocol instructions are required"),
        frequency: z.string().optional(),
        duration: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .optional(),
})

export const treatmentPlanUpdateSchema = treatmentPlanSchema.partial().extend({
  id: z.string(),
})

// Client search and filter schemas
export const clientFilterSchema = z.object({
  search: z.string().optional(),
  hasActiveAppointments: z.boolean().optional(),
  hasActiveTreatmentPlan: z.boolean().optional(),
  lastVisitAfter: z.string().datetime().optional(),
  lastVisitBefore: z.string().datetime().optional(),
  sortBy: z.enum(["name", "lastVisit", "totalVisits", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
})

// HIPAA audit schemas
export const hipaaAuditSchema = z.object({
  resourceType: z.enum(["ClientProfile", "ConsultationNote", "TreatmentPlan"]),
  resourceId: z.string(),
  action: z.string().min(1, "Action is required"),
  reason: z.string().min(1, "Reason for access is required"),
  clientConsent: z.boolean().default(true),
})

// Data export schemas (for client data portability)
export const clientDataExportSchema = z.object({
  clientId: z.string(),
  includeConsultationNotes: z.boolean().default(true),
  includeTreatmentPlans: z.boolean().default(true),
  includeAppointments: z.boolean().default(true),
  dateRange: z
    .object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    })
    .optional(),
  format: z.enum(["json", "pdf", "csv"]).default("json"),
})

// Type exports
export type ClientProfileInput = z.infer<typeof clientProfileSchema>
export type ClientProfileUpdateInput = z.infer<typeof clientProfileUpdateSchema>
export type ConsultationNoteInput = z.infer<typeof consultationNoteSchema>
export type ConsultationNoteUpdateInput = z.infer<typeof consultationNoteUpdateSchema>
export type TreatmentPlanInput = z.infer<typeof treatmentPlanSchema>
export type TreatmentPlanUpdateInput = z.infer<typeof treatmentPlanUpdateSchema>
export type ClientFilterInput = z.infer<typeof clientFilterSchema>
export type HipaaAuditInput = z.infer<typeof hipaaAuditSchema>
export type ClientDataExportInput = z.infer<typeof clientDataExportSchema>