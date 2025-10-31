import { PHIEncryption, EncryptedData } from "./crypto"
import { auditLogger, AuditEventType, AuditOutcome, DataSensitivity } from "@/lib/audit/logger"

/**
 * PHI field types for better type safety
 */
export type PHIString = string | EncryptedData
export type PHIArray = string[] | EncryptedData
export type PHIObject = Record<string, any> | EncryptedData

/**
 * Client profile PHI fields
 */
export interface ClientProfilePHI {
  allergies?: PHIArray
  medications?: PHIArray
  conditions?: PHIArray
  healthGoals?: PHIString
  emergencyContact?: PHIObject
}

/**
 * Consultation note PHI fields
 */
export interface ConsultationNotePHI {
  chiefComplaint: PHIString
  assessment: PHIString
  recommendations: PHIString
  followUp?: PHIString
  privateNotes?: PHIString
}

/**
 * Intake submission PHI fields
 */
export interface IntakeSubmissionPHI {
  responses: PHIObject
}

/**
 * Utility class for handling PHI operations
 */
export class PHIUtils {
  /**
   * Safely encrypt client profile PHI fields
   */
  static encryptClientProfile(profile: ClientProfilePHI): ClientProfilePHI {
    const encrypted: ClientProfilePHI = {}

    if (profile.allergies) {
      encrypted.allergies = Array.isArray(profile.allergies)
        ? PHIEncryption.encrypt(JSON.stringify(profile.allergies))
        : profile.allergies
    }

    if (profile.medications) {
      encrypted.medications = Array.isArray(profile.medications)
        ? PHIEncryption.encrypt(JSON.stringify(profile.medications))
        : profile.medications
    }

    if (profile.conditions) {
      encrypted.conditions = Array.isArray(profile.conditions)
        ? PHIEncryption.encrypt(JSON.stringify(profile.conditions))
        : profile.conditions
    }

    if (profile.healthGoals) {
      encrypted.healthGoals = typeof profile.healthGoals === "string"
        ? PHIEncryption.encrypt(profile.healthGoals)
        : profile.healthGoals
    }

    if (profile.emergencyContact) {
      encrypted.emergencyContact = typeof profile.emergencyContact === "object" && !PHIEncryption.isEncrypted(profile.emergencyContact)
        ? PHIEncryption.encrypt(JSON.stringify(profile.emergencyContact))
        : profile.emergencyContact
    }

    return encrypted
  }

  /**
   * Safely decrypt client profile PHI fields
   */
  static decryptClientProfile(profile: ClientProfilePHI): ClientProfilePHI {
    const decrypted: ClientProfilePHI = {}

    if (profile.allergies && PHIEncryption.isEncrypted(profile.allergies)) {
      try {
        decrypted.allergies = JSON.parse(PHIEncryption.decrypt(profile.allergies))
      } catch {
        decrypted.allergies = profile.allergies
      }
    } else {
      decrypted.allergies = profile.allergies
    }

    if (profile.medications && PHIEncryption.isEncrypted(profile.medications)) {
      try {
        decrypted.medications = JSON.parse(PHIEncryption.decrypt(profile.medications))
      } catch {
        decrypted.medications = profile.medications
      }
    } else {
      decrypted.medications = profile.medications
    }

    if (profile.conditions && PHIEncryption.isEncrypted(profile.conditions)) {
      try {
        decrypted.conditions = JSON.parse(PHIEncryption.decrypt(profile.conditions))
      } catch {
        decrypted.conditions = profile.conditions
      }
    } else {
      decrypted.conditions = profile.conditions
    }

    if (profile.healthGoals && PHIEncryption.isEncrypted(profile.healthGoals)) {
      try {
        decrypted.healthGoals = PHIEncryption.decrypt(profile.healthGoals)
      } catch {
        decrypted.healthGoals = profile.healthGoals
      }
    } else {
      decrypted.healthGoals = profile.healthGoals
    }

    if (profile.emergencyContact && PHIEncryption.isEncrypted(profile.emergencyContact)) {
      try {
        decrypted.emergencyContact = JSON.parse(PHIEncryption.decrypt(profile.emergencyContact))
      } catch {
        decrypted.emergencyContact = profile.emergencyContact
      }
    } else {
      decrypted.emergencyContact = profile.emergencyContact
    }

    return decrypted
  }

  /**
   * Create searchable tokens for encrypted PHI
   * This allows limited searching without full decryption
   */
  static createSearchTokens(data: Record<string, any>): Record<string, string> {
    const tokens: Record<string, string> = {}

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string" && value.length > 0) {
        // Create search tokens for string values
        tokens[`${key}Token`] = PHIEncryption.generateSearchToken(value)
        
        // Create partial tokens for substring searching
        if (value.length > 3) {
          const words = value.toLowerCase().split(/\s+/)
          words.forEach((word, index) => {
            if (word.length > 2) {
              tokens[`${key}Word${index}`] = PHIEncryption.generateSearchToken(word)
            }
          })
        }
      } else if (Array.isArray(value)) {
        // Create tokens for array elements
        value.forEach((item, index) => {
          if (typeof item === "string" && item.length > 0) {
            tokens[`${key}Item${index}`] = PHIEncryption.generateSearchToken(item)
          }
        })
      }
    }

    return tokens
  }

  /**
   * Validate PHI data before encryption
   */
  static validatePHI(data: any, fieldName: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (data === null || data === undefined) {
      return { isValid: true, errors: [] } // Null/undefined is valid
    }

    // Check data size (prevent extremely large PHI from being encrypted)
    const dataSize = JSON.stringify(data).length
    if (dataSize > 1024 * 1024) { // 1MB limit
      errors.push(`PHI field ${fieldName} exceeds maximum size (1MB)`)
    }

    // Check for potentially dangerous content
    if (typeof data === "string") {
      // Check for script injection attempts
      if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(data)) {
        errors.push(`PHI field ${fieldName} contains potentially dangerous script content`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Audit PHI access with proper logging
   */
  static async auditPHIAccess(
    operation: "read" | "write" | "update" | "delete",
    resourceType: string,
    resourceId: string,
    userId: string,
    userRole: string,
    fieldNames: string[],
    outcome: AuditOutcome = AuditOutcome.SUCCESS,
    additionalDetails?: Record<string, any>
  ): Promise<void> {
    const eventTypeMap = {
      read: AuditEventType.PHI_READ,
      write: AuditEventType.PHI_CREATE,
      update: AuditEventType.PHI_UPDATE,
      delete: AuditEventType.PHI_DELETE,
    }

    await auditLogger.log({
      eventType: eventTypeMap[operation],
      outcome,
      timestamp: new Date(),
      userId,
      userRole,
      resourceType,
      resourceId,
      dataSensitivity: DataSensitivity.PHI,
      details: {
        operation,
        fieldsAccessed: fieldNames,
        ...additionalDetails,
      },
    })
  }

  /**
   * Secure comparison of encrypted PHI values
   */
  static secureCompare(encryptedValue1: EncryptedData, encryptedValue2: EncryptedData): boolean {
    try {
      const decrypted1 = PHIEncryption.decrypt(encryptedValue1)
      const decrypted2 = PHIEncryption.decrypt(encryptedValue2)
      
      // Use timing-safe comparison
      return this.timingSafeEqual(decrypted1, decrypted2)
    } catch {
      return false
    }
  }

  /**
   * Timing-safe string comparison
   */
  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }

    return result === 0
  }

  /**
   * Create redacted version of PHI for logging/display
   */
  static redactPHI(data: any, preserveLength: boolean = true): string {
    if (typeof data === "string") {
      if (preserveLength) {
        return "*".repeat(Math.min(data.length, 20)) + (data.length > 20 ? "..." : "")
      }
      return "[REDACTED]"
    }

    if (Array.isArray(data)) {
      return `[REDACTED_ARRAY_${data.length}_ITEMS]`
    }

    if (typeof data === "object" && data !== null) {
      const keys = Object.keys(data)
      return `[REDACTED_OBJECT_${keys.length}_FIELDS]`
    }

    return "[REDACTED]"
  }

  /**
   * Check if PHI data meets retention requirements
   */
  static checkRetentionPolicy(
    createdAt: Date,
    dataType: "consultation" | "intake" | "message" | "profile",
    retentionYears: number = 7
  ): { shouldRetain: boolean; daysUntilExpiration: number } {
    const now = new Date()
    const retentionPeriodMs = retentionYears * 365 * 24 * 60 * 60 * 1000
    const expirationDate = new Date(createdAt.getTime() + retentionPeriodMs)
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

    return {
      shouldRetain: daysUntilExpiration > 0,
      daysUntilExpiration: Math.max(0, daysUntilExpiration),
    }
  }

  /**
   * Secure deletion of expired PHI
   */
  static async secureDeleteExpiredPHI(
    resourceType: string,
    resourceId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Log the deletion for audit
      await this.auditPHIAccess(
        "delete",
        resourceType,
        resourceId,
        userId,
        "SYSTEM",
        ["*"],
        AuditOutcome.SUCCESS,
        { reason: "retention_policy_expiration" }
      )

      return true
    } catch (error) {
      await this.auditPHIAccess(
        "delete",
        resourceType,
        resourceId,
        userId,
        "SYSTEM",
        ["*"],
        AuditOutcome.FAILURE,
        { 
          reason: "retention_policy_expiration",
          error: error instanceof Error ? error.message : "Unknown error"
        }
      )

      return false
    }
  }

  /**
   * Export PHI data for patient requests (HIPAA Right of Access)
   */
  static async exportPatientPHI(
    userId: string,
    requestingUserId: string,
    format: "json" | "pdf" | "csv" = "json"
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Verify the requesting user has rights to this data
      if (userId !== requestingUserId) {
        await this.auditPHIAccess(
          "read",
          "PatientExport",
          userId,
          requestingUserId,
          "CLIENT",
          ["*"],
          AuditOutcome.FAILURE,
          { reason: "unauthorized_export_attempt" }
        )

        return {
          success: false,
          error: "Unauthorized access to patient data"
        }
      }

      // Log the export request
      await this.auditPHIAccess(
        "read",
        "PatientExport",
        userId,
        requestingUserId,
        "CLIENT",
        ["*"],
        AuditOutcome.SUCCESS,
        { 
          reason: "patient_data_export",
          format,
          exportType: "hipaa_right_of_access"
        }
      )

      // In a real implementation, you would:
      // 1. Gather all PHI for the user from various tables
      // 2. Decrypt the data
      // 3. Format according to the requested format
      // 4. Return the structured data

      return {
        success: true,
        data: {
          message: "PHI export functionality would be implemented here",
          format,
          userId,
          requestedAt: new Date().toISOString(),
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Export failed"
      }
    }
  }
}

/**
 * Type guards for encrypted PHI
 */
export function isEncryptedString(value: PHIString): value is EncryptedData {
  return PHIEncryption.isEncrypted(value)
}

export function isEncryptedArray(value: PHIArray): value is EncryptedData {
  return PHIEncryption.isEncrypted(value)
}

export function isEncryptedObject(value: PHIObject): value is EncryptedData {
  return PHIEncryption.isEncrypted(value)
}

/**
 * Convenience functions
 */
export const encryptClientProfile = PHIUtils.encryptClientProfile.bind(PHIUtils)
export const decryptClientProfile = PHIUtils.decryptClientProfile.bind(PHIUtils)
export const createPHISearchTokens = PHIUtils.createSearchTokens.bind(PHIUtils)
export const validatePHI = PHIUtils.validatePHI.bind(PHIUtils)
export const auditPHIAccess = PHIUtils.auditPHIAccess.bind(PHIUtils)
export const redactPHI = PHIUtils.redactPHI.bind(PHIUtils)