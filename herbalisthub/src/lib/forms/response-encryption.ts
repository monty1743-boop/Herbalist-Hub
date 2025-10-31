import { PHIEncryption, EncryptedData } from "@/lib/encryption/crypto"
import { auditPHIAccess, validatePHI } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

/**
 * Form response encryption utilities for handling PHI in intake forms
 */
export class FormResponseEncryption {
  /**
   * Encrypt form response data, handling PHI fields specially
   */
  static encryptFormResponse(
    formSchema: any,
    responseData: Record<string, any>,
    userId: string
  ): { 
    encryptedData: EncryptedData, 
    fieldMap: Record<string, boolean>,
    errors: string[] 
  } {
    const errors: string[] = []
    const fieldMap: Record<string, boolean> = {} // Maps field IDs to whether they contain PHI
    
    try {
      // Identify PHI fields from form schema
      const phiFields = this.identifyPHIFields(formSchema)
      
      // Validate PHI data before encryption
      for (const fieldId of phiFields) {
        if (responseData[fieldId] !== undefined) {
          fieldMap[fieldId] = true
          const validation = validatePHI(responseData[fieldId], fieldId)
          if (!validation.isValid) {
            errors.push(...validation.errors)
          }
        }
      }
      
      // Mark non-PHI fields
      Object.keys(responseData).forEach(fieldId => {
        if (!phiFields.includes(fieldId)) {
          fieldMap[fieldId] = false
        }
      })
      
      if (errors.length > 0) {
        throw new Error(`PHI validation failed: ${errors.join(', ')}`)
      }
      
      // Encrypt the entire response data
      const encryptedData = PHIEncryption.encrypt(JSON.stringify(responseData))
      
      return {
        encryptedData,
        fieldMap,
        errors: []
      }
    } catch (error) {
      console.error("Error encrypting form response:", error)
      return {
        encryptedData: null as any,
        fieldMap,
        errors: [error instanceof Error ? error.message : "Encryption failed"]
      }
    }
  }
  
  /**
   * Decrypt form response data
   */
  static decryptFormResponse(
    encryptedData: EncryptedData,
    userId: string,
    userRole: string,
    formId: string,
    submissionId: string
  ): { 
    responseData: Record<string, any> | null,
    errors: string[] 
  } {
    const errors: string[] = []
    
    try {
      // Verify user has permission to decrypt this data
      if (!this.canUserAccessPHI(userRole)) {
        errors.push("Insufficient permissions to access PHI data")
        return { responseData: null, errors }
      }
      
      // Decrypt the response data
      const decryptedJson = PHIEncryption.decrypt(encryptedData)
      const responseData = JSON.parse(decryptedJson)
      
      // Audit the decryption access
      auditPHIAccess(
        "read",
        "IntakeSubmission",
        submissionId,
        userId,
        userRole,
        ["form_responses"],
        AuditOutcome.SUCCESS,
        {
          formId,
          decryptionReason: "form_response_access",
          fieldCount: Object.keys(responseData).length
        }
      ).catch(auditError => {
        console.error("Error logging PHI access audit:", auditError)
      })
      
      return {
        responseData,
        errors: []
      }
    } catch (error) {
      console.error("Error decrypting form response:", error)
      
      // Audit the failed decryption attempt
      auditPHIAccess(
        "read",
        "IntakeSubmission",
        submissionId,
        userId,
        userRole,
        ["form_responses"],
        AuditOutcome.FAILURE,
        {
          formId,
          error: error instanceof Error ? error.message : "Decryption failed"
        }
      ).catch(auditError => {
        console.error("Error logging PHI access audit:", auditError)
      })
      
      return {
        responseData: null,
        errors: [error instanceof Error ? error.message : "Decryption failed"]
      }
    }
  }
  
  /**
   * Create redacted version of response for display to unauthorized users
   */
  static createRedactedResponse(
    formSchema: any,
    responseData: Record<string, any>
  ): Record<string, any> {
    const redactedData: Record<string, any> = {}
    const phiFields = this.identifyPHIFields(formSchema)
    
    Object.entries(responseData).forEach(([fieldId, value]) => {
      if (phiFields.includes(fieldId)) {
        // Redact PHI fields
        if (typeof value === "string") {
          redactedData[fieldId] = value.length > 0 ? "[REDACTED]" : ""
        } else if (Array.isArray(value)) {
          redactedData[fieldId] = value.length > 0 ? "[REDACTED_ARRAY]" : []
        } else if (typeof value === "object" && value !== null) {
          redactedData[fieldId] = "[REDACTED_OBJECT]"
        } else {
          redactedData[fieldId] = "[REDACTED]"
        }
      } else {
        // Keep non-PHI fields as-is
        redactedData[fieldId] = value
      }
    })
    
    return redactedData
  }
  
  /**
   * Identify PHI fields from form schema
   */
  static identifyPHIFields(formSchema: any): string[] {
    const phiFields: string[] = []
    
    if (!formSchema?.sections) {
      return phiFields
    }
    
    formSchema.sections.forEach((section: any) => {
      if (section.fields) {
        section.fields.forEach((field: any) => {
          // Check if field is marked as health data
          if (field.metadata?.isHealthData) {
            phiFields.push(field.id)
          }
          
          // Auto-detect potential PHI fields based on field type and name
          if (this.isPotentialPHIField(field)) {
            phiFields.push(field.id)
          }
        })
      }
    })
    
    return [...new Set(phiFields)] // Remove duplicates
  }
  
  /**
   * Auto-detect potential PHI fields based on field characteristics
   */
  static isPotentialPHIField(field: any): boolean {
    const phiKeywords = [
      'health', 'medical', 'symptom', 'condition', 'diagnosis', 'medication',
      'allergy', 'emergency', 'insurance', 'ssn', 'social', 'birth', 'age',
      'weight', 'height', 'blood', 'pressure', 'heart', 'family_history',
      'mental_health', 'substance', 'addiction', 'prescription', 'treatment',
      'surgery', 'hospital', 'doctor', 'physician', 'clinic', 'therapy'
    ]
    
    const fieldName = field.id?.toLowerCase() || ''
    const fieldLabel = field.label?.toLowerCase() || ''
    const fieldDescription = field.description?.toLowerCase() || ''
    
    // Check if any PHI keywords are present
    const containsPHIKeyword = phiKeywords.some(keyword => 
      fieldName.includes(keyword) || 
      fieldLabel.includes(keyword) || 
      fieldDescription.includes(keyword)
    )
    
    // Check field type
    const isPHIFieldType = ['signature', 'file'].includes(field.type) &&
      (fieldLabel.includes('consent') || fieldLabel.includes('medical'))
    
    return containsPHIKeyword || isPHIFieldType
  }
  
  /**
   * Check if user role can access PHI
   */
  static canUserAccessPHI(userRole: string): boolean {
    const authorizedRoles = ['HERBALIST', 'ADMIN']
    return authorizedRoles.includes(userRole.toUpperCase())
  }
  
  /**
   * Create search tokens for encrypted form responses
   */
  static createSearchTokens(
    formSchema: any,
    responseData: Record<string, any>
  ): Record<string, string> {
    const tokens: Record<string, string> = {}
    const phiFields = this.identifyPHIFields(formSchema)
    
    // Create search tokens only for non-PHI fields
    Object.entries(responseData).forEach(([fieldId, value]) => {
      if (!phiFields.includes(fieldId) && typeof value === "string" && value.length > 0) {
        // Create searchable token for non-PHI fields
        tokens[`field_${fieldId}`] = PHIEncryption.generateSearchToken(value.toLowerCase())
        
        // Create word-level tokens for better search
        const words = value.toLowerCase().split(/\s+/).filter(word => word.length > 2)
        words.forEach((word, index) => {
          tokens[`field_${fieldId}_word_${index}`] = PHIEncryption.generateSearchToken(word)
        })
      }
    })
    
    return tokens
  }
  
  /**
   * Migrate form responses when form schema changes
   */
  static migrateResponseData(
    oldSchema: any,
    newSchema: any,
    responseData: Record<string, any>
  ): { 
    migratedData: Record<string, any>,
    warnings: string[],
    errors: string[]
  } {
    const warnings: string[] = []
    const errors: string[] = []
    const migratedData: Record<string, any> = {}
    
    try {
      // Get field mappings from old to new schema
      const oldFields = this.extractFieldIds(oldSchema)
      const newFields = this.extractFieldIds(newSchema)
      
      // Copy existing fields that still exist in new schema
      Object.entries(responseData).forEach(([fieldId, value]) => {
        if (newFields.includes(fieldId)) {
          migratedData[fieldId] = value
        } else if (oldFields.includes(fieldId)) {
          warnings.push(`Field '${fieldId}' was removed from form but data was preserved`)
          migratedData[`_deprecated_${fieldId}`] = value
        }
      })
      
      // Identify new required fields that need default values
      const newRequiredFields = this.getRequiredFields(newSchema)
      newRequiredFields.forEach(fieldId => {
        if (!(fieldId in migratedData)) {
          warnings.push(`New required field '${fieldId}' added - using default value`)
          migratedData[fieldId] = null // or appropriate default
        }
      })
      
    } catch (error) {
      errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    return {
      migratedData,
      warnings,
      errors
    }
  }
  
  /**
   * Extract field IDs from form schema
   */
  static extractFieldIds(schema: any): string[] {
    const fieldIds: string[] = []
    
    if (schema?.sections) {
      schema.sections.forEach((section: any) => {
        if (section.fields) {
          section.fields.forEach((field: any) => {
            if (field.id) {
              fieldIds.push(field.id)
            }
          })
        }
      })
    }
    
    return fieldIds
  }
  
  /**
   * Get required field IDs from form schema
   */
  static getRequiredFields(schema: any): string[] {
    const requiredFields: string[] = []
    
    if (schema?.sections) {
      schema.sections.forEach((section: any) => {
        if (section.fields) {
          section.fields.forEach((field: any) => {
            if (field.required) {
              requiredFields.push(field.id)
            }
          })
        }
      })
    }
    
    return requiredFields
  }
  
  /**
   * Export form responses for patient data requests (HIPAA compliance)
   */
  static exportPatientFormData(
    userId: string,
    submissions: any[],
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): {
    success: boolean,
    data?: any,
    error?: string
  } {
    try {
      const exportData = submissions.map(submission => ({
        submissionId: submission.id,
        formName: submission.form?.name,
        completedAt: submission.completedAt,
        responses: submission.responses, // Should be decrypted before calling this
        createdAt: submission.createdAt,
      }))
      
      switch (format) {
        case 'json':
          return {
            success: true,
            data: {
              patientId: userId,
              exportDate: new Date().toISOString(),
              submissions: exportData,
            }
          }
          
        case 'csv':
          // TODO: Implement CSV export format
          return {
            success: false,
            error: "CSV export not yet implemented"
          }
          
        case 'pdf':
          // TODO: Implement PDF export format
          return {
            success: false,
            error: "PDF export not yet implemented"
          }
          
        default:
          return {
            success: false,
            error: "Unsupported export format"
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
 * Form response analytics with privacy protection
 */
export class FormResponseAnalytics {
  /**
   * Generate analytics without exposing PHI
   */
  static generatePrivacyPreservingAnalytics(
    formSchema: any,
    submissions: any[]
  ): FormAnalytics {
    const phiFields = FormResponseEncryption.identifyPHIFields(formSchema)
    
    return {
      totalSubmissions: submissions.length,
      completedSubmissions: submissions.filter(s => s.completedAt).length,
      averageCompletionTime: this.calculateAverageCompletionTime(submissions),
      fieldCompletionRates: this.calculateFieldCompletionRates(formSchema, submissions, phiFields),
      submissionsByDate: this.getSubmissionsByDate(submissions),
      commonDropoffPoints: this.identifyDropoffPoints(formSchema, submissions, phiFields),
    }
  }
  
  private static calculateAverageCompletionTime(submissions: any[]): number {
    const completedSubmissions = submissions.filter(s => s.completedAt && s.createdAt)
    
    if (completedSubmissions.length === 0) return 0
    
    const totalTime = completedSubmissions.reduce((sum, submission) => {
      const completionTime = new Date(submission.completedAt).getTime() - new Date(submission.createdAt).getTime()
      return sum + completionTime
    }, 0)
    
    return totalTime / completedSubmissions.length / 1000 / 60 // Convert to minutes
  }
  
  private static calculateFieldCompletionRates(
    formSchema: any,
    submissions: any[],
    phiFields: string[]
  ): Record<string, FieldAnalytics> {
    const fieldAnalytics: Record<string, FieldAnalytics> = {}
    
    // Only analyze non-PHI fields for privacy
    const nonPHIFields = FormResponseEncryption.extractFieldIds(formSchema)
      .filter(fieldId => !phiFields.includes(fieldId))
    
    nonPHIFields.forEach(fieldId => {
      const responses = submissions.map(s => s.responses?.[fieldId]).filter(r => r !== undefined)
      const completedResponses = responses.filter(r => r !== null && r !== "")
      
      fieldAnalytics[fieldId] = {
        totalResponses: responses.length,
        completedResponses: completedResponses.length,
        completionRate: responses.length > 0 ? (completedResponses.length / responses.length) * 100 : 0,
        abandonmentRate: responses.length > 0 ? ((responses.length - completedResponses.length) / responses.length) * 100 : 0,
      }
    })
    
    return fieldAnalytics
  }
  
  private static getSubmissionsByDate(submissions: any[]): Record<string, number> {
    const submissionsByDate: Record<string, number> = {}
    
    submissions.forEach(submission => {
      if (submission.completedAt) {
        const date = new Date(submission.completedAt).toISOString().split('T')[0]
        submissionsByDate[date] = (submissionsByDate[date] || 0) + 1
      }
    })
    
    return submissionsByDate
  }
  
  private static identifyDropoffPoints(
    formSchema: any,
    submissions: any[],
    phiFields: string[]
  ): string[] {
    // Identify where users commonly stop filling out the form
    // Only consider non-PHI fields for privacy
    const nonPHIFields = FormResponseEncryption.extractFieldIds(formSchema)
      .filter(fieldId => !phiFields.includes(fieldId))
    
    const dropoffCounts: Record<string, number> = {}
    
    submissions.forEach(submission => {
      if (!submission.completedAt && submission.responses) {
        // Find the last field the user filled out
        let lastCompletedField = null
        nonPHIFields.forEach(fieldId => {
          if (submission.responses[fieldId] && submission.responses[fieldId] !== "") {
            lastCompletedField = fieldId
          }
        })
        
        if (lastCompletedField) {
          dropoffCounts[lastCompletedField] = (dropoffCounts[lastCompletedField] || 0) + 1
        }
      }
    })
    
    // Return fields sorted by dropoff frequency
    return Object.entries(dropoffCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([fieldId]) => fieldId)
      .slice(0, 5) // Top 5 dropoff points
  }
}

export interface FormAnalytics {
  totalSubmissions: number
  completedSubmissions: number
  averageCompletionTime: number
  fieldCompletionRates: Record<string, FieldAnalytics>
  submissionsByDate: Record<string, number>
  commonDropoffPoints: string[]
}

export interface FieldAnalytics {
  totalResponses: number
  completedResponses: number
  completionRate: number
  abandonmentRate: number
}