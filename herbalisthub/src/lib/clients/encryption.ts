import { PHIEncryption, EncryptedData } from "@/lib/encryption/crypto"
import { PHIUtils, ClientProfilePHI } from "@/lib/encryption/phi-utils"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

/**
 * Client-specific encryption utilities
 * Extends the base PHI encryption with client-focused functionality
 */

export interface ClientEncryptionContext {
  userId: string
  userRole: string
  clientId: string
  operation: "create" | "read" | "update" | "delete"
}

/**
 * Enhanced client PHI with additional fields
 */
export interface ExtendedClientPHI extends ClientProfilePHI {
  // Additional sensitive client information
  socialSecurityNumber?: string
  insuranceInfo?: {
    provider: string
    policyNumber: string
    groupNumber?: string
    effectiveDate?: string
    expirationDate?: string
  }
  medicalHistory?: string[]
  familyMedicalHistory?: string[]
  lifestyle?: {
    diet: string
    exercise: string
    sleep: string
    stress: string
    substances?: string[]
  }
  symptoms?: string[]
  previousTreatments?: string[]
}

/**
 * Client-specific encryption service
 */
export class ClientEncryption {
  /**
   * Encrypt all PHI fields in a client profile
   */
  static async encryptClientPHI(
    clientData: ExtendedClientPHI,
    context: ClientEncryptionContext
  ): Promise<{ encrypted: ExtendedClientPHI; searchTokens: Record<string, string> }> {
    try {
      // Validate all PHI fields before encryption
      await this.validateClientPHI(clientData)

      // Use base PHI encryption for standard fields
      const baseEncrypted = PHIUtils.encryptClientProfile(clientData)

      // Handle extended fields
      const extended: ExtendedClientPHI = { ...baseEncrypted }

      if (clientData.socialSecurityNumber) {
        extended.socialSecurityNumber = PHIEncryption.encrypt(clientData.socialSecurityNumber)
      }

      if (clientData.insuranceInfo) {
        extended.insuranceInfo = PHIEncryption.encrypt(JSON.stringify(clientData.insuranceInfo))
      }

      if (clientData.medicalHistory) {
        extended.medicalHistory = PHIEncryption.encrypt(JSON.stringify(clientData.medicalHistory))
      }

      if (clientData.familyMedicalHistory) {
        extended.familyMedicalHistory = PHIEncryption.encrypt(JSON.stringify(clientData.familyMedicalHistory))
      }

      if (clientData.lifestyle) {
        extended.lifestyle = PHIEncryption.encrypt(JSON.stringify(clientData.lifestyle))
      }

      if (clientData.symptoms) {
        extended.symptoms = PHIEncryption.encrypt(JSON.stringify(clientData.symptoms))
      }

      if (clientData.previousTreatments) {
        extended.previousTreatments = PHIEncryption.encrypt(JSON.stringify(clientData.previousTreatments))
      }

      // Generate comprehensive search tokens
      const searchTokens = this.generateClientSearchTokens(clientData)

      // Audit the encryption operation
      await auditPHIAccess(
        context.operation === "create" ? "write" : "update",
        "ClientPHI",
        context.clientId,
        context.userId,
        context.userRole,
        Object.keys(clientData).filter(key => clientData[key as keyof ExtendedClientPHI] !== undefined),
        AuditOutcome.SUCCESS,
        {
          operation: "encrypt_client_phi",
          fieldCount: Object.keys(clientData).length,
          hasExtendedFields: this.hasExtendedFields(clientData),
        }
      )

      return {
        encrypted: extended,
        searchTokens,
      }
    } catch (error) {
      // Audit the failed encryption
      await auditPHIAccess(
        context.operation === "create" ? "write" : "update",
        "ClientPHI",
        context.clientId,
        context.userId,
        context.userRole,
        ["encryption_attempt"],
        AuditOutcome.FAILURE,
        {
          operation: "encrypt_client_phi",
          error: error instanceof Error ? error.message : "Unknown error",
        }
      )

      throw error
    }
  }

  /**
   * Decrypt all PHI fields in a client profile
   */
  static async decryptClientPHI(
    encryptedData: ExtendedClientPHI,
    context: ClientEncryptionContext
  ): Promise<ExtendedClientPHI> {
    try {
      // Use base PHI decryption for standard fields
      const baseDecrypted = PHIUtils.decryptClientProfile(encryptedData)

      // Handle extended fields
      const decrypted: ExtendedClientPHI = { ...baseDecrypted }

      if (encryptedData.socialSecurityNumber && PHIEncryption.isEncrypted(encryptedData.socialSecurityNumber)) {
        try {
          decrypted.socialSecurityNumber = PHIEncryption.decrypt(encryptedData.socialSecurityNumber)
        } catch {
          decrypted.socialSecurityNumber = encryptedData.socialSecurityNumber as string
        }
      }

      if (encryptedData.insuranceInfo && PHIEncryption.isEncrypted(encryptedData.insuranceInfo)) {
        try {
          decrypted.insuranceInfo = JSON.parse(PHIEncryption.decrypt(encryptedData.insuranceInfo))
        } catch {
          decrypted.insuranceInfo = encryptedData.insuranceInfo as any
        }
      }

      if (encryptedData.medicalHistory && PHIEncryption.isEncrypted(encryptedData.medicalHistory)) {
        try {
          decrypted.medicalHistory = JSON.parse(PHIEncryption.decrypt(encryptedData.medicalHistory))
        } catch {
          decrypted.medicalHistory = encryptedData.medicalHistory as string[]
        }
      }

      if (encryptedData.familyMedicalHistory && PHIEncryption.isEncrypted(encryptedData.familyMedicalHistory)) {
        try {
          decrypted.familyMedicalHistory = JSON.parse(PHIEncryption.decrypt(encryptedData.familyMedicalHistory))
        } catch {
          decrypted.familyMedicalHistory = encryptedData.familyMedicalHistory as string[]
        }
      }

      if (encryptedData.lifestyle && PHIEncryption.isEncrypted(encryptedData.lifestyle)) {
        try {
          decrypted.lifestyle = JSON.parse(PHIEncryption.decrypt(encryptedData.lifestyle))
        } catch {
          decrypted.lifestyle = encryptedData.lifestyle as any
        }
      }

      if (encryptedData.symptoms && PHIEncryption.isEncrypted(encryptedData.symptoms)) {
        try {
          decrypted.symptoms = JSON.parse(PHIEncryption.decrypt(encryptedData.symptoms))
        } catch {
          decrypted.symptoms = encryptedData.symptoms as string[]
        }
      }

      if (encryptedData.previousTreatments && PHIEncryption.isEncrypted(encryptedData.previousTreatments)) {
        try {
          decrypted.previousTreatments = JSON.parse(PHIEncryption.decrypt(encryptedData.previousTreatments))
        } catch {
          decrypted.previousTreatments = encryptedData.previousTreatments as string[]
        }
      }

      // Audit the decryption operation
      await auditPHIAccess(
        "read",
        "ClientPHI",
        context.clientId,
        context.userId,
        context.userRole,
        Object.keys(decrypted).filter(key => decrypted[key as keyof ExtendedClientPHI] !== undefined),
        AuditOutcome.SUCCESS,
        {
          operation: "decrypt_client_phi",
          fieldCount: Object.keys(decrypted).length,
          hasExtendedFields: this.hasExtendedFields(decrypted),
        }
      )

      return decrypted
    } catch (error) {
      // Audit the failed decryption
      await auditPHIAccess(
        "read",
        "ClientPHI",
        context.clientId,
        context.userId,
        context.userRole,
        ["decryption_attempt"],
        AuditOutcome.FAILURE,
        {
          operation: "decrypt_client_phi",
          error: error instanceof Error ? error.message : "Unknown error",
        }
      )

      throw error
    }
  }

  /**
   * Generate comprehensive search tokens for client data
   */
  static generateClientSearchTokens(clientData: ExtendedClientPHI): Record<string, string> {
    const tokens: Record<string, string> = {}

    // Base PHI search tokens
    const basePHI = {
      allergies: Array.isArray(clientData.allergies) ? clientData.allergies.join(" ") : "",
      medications: Array.isArray(clientData.medications) ? clientData.medications.join(" ") : "",
      conditions: Array.isArray(clientData.conditions) ? clientData.conditions.join(" ") : "",
      healthGoals: clientData.healthGoals || "",
    }

    Object.assign(tokens, PHIUtils.createSearchTokens(basePHI))

    // Extended field search tokens
    if (clientData.medicalHistory) {
      const medicalHistoryText = Array.isArray(clientData.medicalHistory) 
        ? clientData.medicalHistory.join(" ") 
        : clientData.medicalHistory
      Object.assign(tokens, PHIUtils.createSearchTokens({ medicalHistory: medicalHistoryText }))
    }

    if (clientData.familyMedicalHistory) {
      const familyHistoryText = Array.isArray(clientData.familyMedicalHistory)
        ? clientData.familyMedicalHistory.join(" ")
        : clientData.familyMedicalHistory
      Object.assign(tokens, PHIUtils.createSearchTokens({ familyMedicalHistory: familyHistoryText }))
    }

    if (clientData.symptoms) {
      const symptomsText = Array.isArray(clientData.symptoms)
        ? clientData.symptoms.join(" ")
        : clientData.symptoms
      Object.assign(tokens, PHIUtils.createSearchTokens({ symptoms: symptomsText }))
    }

    if (clientData.previousTreatments) {
      const treatmentsText = Array.isArray(clientData.previousTreatments)
        ? clientData.previousTreatments.join(" ")
        : clientData.previousTreatments
      Object.assign(tokens, PHIUtils.createSearchTokens({ previousTreatments: treatmentsText }))
    }

    if (clientData.lifestyle) {
      const lifestyleText = typeof clientData.lifestyle === "object"
        ? Object.values(clientData.lifestyle).filter(v => typeof v === "string").join(" ")
        : String(clientData.lifestyle)
      Object.assign(tokens, PHIUtils.createSearchTokens({ lifestyle: lifestyleText }))
    }

    return tokens
  }

  /**
   * Validate client PHI data
   */
  static async validateClientPHI(clientData: ExtendedClientPHI): Promise<void> {
    const errors: string[] = []

    // Validate base PHI fields
    for (const [fieldName, fieldValue] of Object.entries(clientData)) {
      if (fieldValue !== undefined && fieldValue !== null) {
        const validation = PHIUtils.validatePHI(fieldValue, fieldName)
        if (!validation.isValid) {
          errors.push(...validation.errors)
        }
      }
    }

    // Additional client-specific validations
    if (clientData.socialSecurityNumber) {
      if (!/^\d{3}-\d{2}-\d{4}$/.test(clientData.socialSecurityNumber) && 
          !/^\d{9}$/.test(clientData.socialSecurityNumber)) {
        errors.push("Social Security Number must be in format XXX-XX-XXXX or XXXXXXXXX")
      }
    }

    if (clientData.insuranceInfo) {
      if (!clientData.insuranceInfo.provider || !clientData.insuranceInfo.policyNumber) {
        errors.push("Insurance information must include provider and policy number")
      }
    }

    if (errors.length > 0) {
      throw new Error(`Client PHI validation failed: ${errors.join(", ")}`)
    }
  }

  /**
   * Check if client data contains extended PHI fields
   */
  static hasExtendedFields(clientData: ExtendedClientPHI): boolean {
    return !!(
      clientData.socialSecurityNumber ||
      clientData.insuranceInfo ||
      clientData.medicalHistory ||
      clientData.familyMedicalHistory ||
      clientData.lifestyle ||
      clientData.symptoms ||
      clientData.previousTreatments
    )
  }

  /**
   * Create a redacted version of client data for logging
   */
  static redactClientData(clientData: ExtendedClientPHI): Record<string, string> {
    const redacted: Record<string, string> = {}

    Object.keys(clientData).forEach(key => {
      const value = clientData[key as keyof ExtendedClientPHI]
      if (value !== undefined && value !== null) {
        redacted[key] = PHIUtils.redactPHI(value, false)
      }
    })

    return redacted
  }

  /**
   * Check client data retention requirements
   */
  static checkClientRetention(
    createdAt: Date,
    lastContactAt?: Date,
    isMinor?: boolean
  ): {
    shouldRetain: boolean
    daysUntilExpiration: number
    retentionReason: string
  } {
    // Extended retention for minors (until age of majority + 7 years)
    const retentionYears = isMinor ? 25 : 7

    const relevantDate = lastContactAt || createdAt
    const retentionCheck = PHIUtils.checkRetentionPolicy(relevantDate, "profile", retentionYears)

    return {
      ...retentionCheck,
      retentionReason: isMinor ? "minor_extended_retention" : "standard_retention",
    }
  }

  /**
   * Prepare client data for secure export
   */
  static async prepareClientExport(
    clientId: string,
    encryptedData: ExtendedClientPHI,
    context: ClientEncryptionContext,
    format: "json" | "pdf" | "csv" = "json"
  ): Promise<{ data: any; metadata: any }> {
    try {
      // Decrypt the data for export
      const decryptedData = await this.decryptClientPHI(encryptedData, {
        ...context,
        operation: "read",
      })

      // Remove undefined values and format for export
      const exportData: Record<string, any> = {}
      
      Object.entries(decryptedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          exportData[key] = value
        }
      })

      const metadata = {
        exportedAt: new Date().toISOString(),
        exportedBy: context.userId,
        clientId,
        format,
        dataVersion: "1.0",
        complianceNote: "This export contains Protected Health Information (PHI) and must be handled according to HIPAA regulations.",
      }

      // Audit the export preparation
      await auditPHIAccess(
        "read",
        "ClientExport",
        clientId,
        context.userId,
        context.userRole,
        Object.keys(exportData),
        AuditOutcome.SUCCESS,
        {
          operation: "prepare_client_export",
          format,
          fieldCount: Object.keys(exportData).length,
          exportMetadata: metadata,
        }
      )

      return {
        data: exportData,
        metadata,
      }
    } catch (error) {
      // Audit the failed export preparation
      await auditPHIAccess(
        "read",
        "ClientExport",
        clientId,
        context.userId,
        context.userRole,
        ["export_preparation_attempt"],
        AuditOutcome.FAILURE,
        {
          operation: "prepare_client_export",
          format,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      )

      throw error
    }
  }
}

/**
 * Convenience functions for common client encryption operations
 */
export const encryptClientProfile = ClientEncryption.encryptClientPHI.bind(ClientEncryption)
export const decryptClientProfile = ClientEncryption.decryptClientPHI.bind(ClientEncryption)
export const generateClientTokens = ClientEncryption.generateClientSearchTokens.bind(ClientEncryption)
export const validateClientPHI = ClientEncryption.validateClientPHI.bind(ClientEncryption)
export const redactClientData = ClientEncryption.redactClientData.bind(ClientEncryption)
export const checkClientRetention = ClientEncryption.checkClientRetention.bind(ClientEncryption)
export const prepareClientExport = ClientEncryption.prepareClientExport.bind(ClientEncryption)