import { z } from 'zod'
import { FormResponseEncryption, FormResponseData, EncryptedFormResponse } from './response-encryption'
import { FormResponseAudit } from './response-audit'

export interface FormSubmissionRequest {
  formId: string
  clientId: string
  practitionerId: string
  assignmentId?: string
  responses: Record<string, any>
  attachments?: Array<{
    fieldId: string
    file: File
  }>
  metadata: {
    startedAt: string
    timeSpent: number
    deviceInfo: string
    browserInfo: string
    ipAddress?: string
    userAgent?: string
  }
}

export interface FormSubmissionResponse {
  success: boolean
  submissionId?: string
  errors?: string[]
  warnings?: string[]
}

export interface FormResponseRetrievalRequest {
  submissionId: string
  userId: string
  userRole: string
  reason: string
}

export interface FormResponseRetrievalResponse {
  success: boolean
  data?: {
    submission: any
    responses: Record<string, any>
    attachments?: Array<{
      fieldId: string
      filename: string
      url: string
      contentType: string
      size: number
    }>
    metadata: {
      submittedAt: string
      timeSpent: number
      deviceInfo: string
      browserInfo: string
    }
  }
  errors?: string[]
}

export interface BulkResponseExportRequest {
  clientId: string
  practitionerId: string
  dateRange?: {
    start: string
    end: string
  }
  formIds?: string[]
  format: 'json' | 'csv' | 'pdf'
  userId: string
  userRole: string
  reason: string
}

export interface ResponseSearchRequest {
  practitionerId: string
  query: string
  filters?: {
    formIds?: string[]
    clientIds?: string[]
    dateRange?: {
      start: string
      end: string
    }
    status?: 'completed' | 'incomplete' | 'all'
  }
  limit?: number
  offset?: number
}

/**
 * Form Response Handler
 * Manages the entire lifecycle of form responses including submission, storage, retrieval, and processing
 */
export class FormResponseHandler {
  
  /**
   * Handle form submission with validation, encryption, and storage
   */
  static async submitFormResponse(request: FormSubmissionRequest): Promise<FormResponseResponse> {
    try {
      // Validate the submission request
      const validationResult = await this.validateSubmissionRequest(request)
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        }
      }

      // Get form schema for validation and PHI identification
      const formSchema = await this.getFormSchema(request.formId)
      if (!formSchema) {
        return {
          success: false,
          errors: ['Form not found']
        }
      }

      // Process attachments if any
      const processedAttachments = await this.processAttachments(
        request.attachments || [],
        request.clientId,
        request.practitionerId
      )

      // Prepare response data for encryption
      const responseData: FormResponseData = {
        responses: request.responses,
        attachments: processedAttachments,
        metadata: {
          ...request.metadata,
          submittedAt: new Date().toISOString()
        }
      }

      // Validate responses against form schema
      const responseValidation = await this.validateFormResponses(
        formSchema,
        request.responses
      )
      
      if (!responseValidation.isValid) {
        return {
          success: false,
          errors: responseValidation.errors.map(e => e.message),
          warnings: responseValidation.warnings.map(w => w.message)
        }
      }

      // Encrypt the response data
      const encryptedResponse = await FormResponseEncryption.encryptResponse(
        responseData,
        request.clientId,
        request.practitionerId
      )

      // Generate submission ID
      const submissionId = crypto.randomUUID()
      
      // Store the encrypted response
      await this.storeEncryptedResponse({
        ...encryptedResponse,
        id: submissionId,
        formId: request.formId,
        assignmentId: request.assignmentId,
        ipAddress: request.metadata.ipAddress,
        userAgent: request.metadata.userAgent
      })

      // Create audit log entry
      await FormResponseAudit.logResponseSubmission({
        submissionId,
        formId: request.formId,
        clientId: request.clientId,
        practitionerId: request.practitionerId,
        assignmentId: request.assignmentId,
        fieldCount: Object.keys(request.responses).length,
        hasAttachments: Boolean(processedAttachments.length),
        ipAddress: request.metadata.ipAddress,
        userAgent: request.metadata.userAgent,
        submittedAt: new Date().toISOString()
      })

      // Update assignment status if applicable
      if (request.assignmentId) {
        await this.updateAssignmentStatus(request.assignmentId, 'completed')
      }

      // Send completion notifications
      await this.sendCompletionNotifications(request)

      return {
        success: true,
        submissionId,
        warnings: responseValidation.warnings.map(w => w.message)
      }

    } catch (error) {
      console.error('Error submitting form response:', error)
      
      // Create audit log for failed submission
      await FormResponseAudit.logResponseSubmissionFailure({
        formId: request.formId,
        clientId: request.clientId,
        practitionerId: request.practitionerId,
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: request.metadata.ipAddress,
        userAgent: request.metadata.userAgent,
        attemptedAt: new Date().toISOString()
      })

      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Submission failed']
      }
    }
  }

  /**
   * Retrieve form response with proper authorization and audit logging
   */
  static async retrieveFormResponse(request: FormResponseRetrievalRequest): Promise<FormResponseRetrievalResponse> {
    try {
      // Verify user authorization
      const authResult = await this.authorizeResponseAccess(
        request.submissionId,
        request.userId,
        request.userRole
      )
      
      if (!authResult.authorized) {
        return {
          success: false,
          errors: ['Unauthorized access to form response']
        }
      }

      // Get encrypted response from storage
      const encryptedResponse = await this.getEncryptedResponse(request.submissionId)
      if (!encryptedResponse) {
        return {
          success: false,
          errors: ['Form response not found']
        }
      }

      // Decrypt the response data
      const decryptedResponse = await FormResponseEncryption.decryptResponse(encryptedResponse)

      // Process attachments for display
      const processedAttachments = await this.processAttachmentsForDisplay(
        decryptedResponse.data.attachments || [],
        request.userId,
        request.userRole
      )

      // Create audit log entry
      await FormResponseAudit.logResponseAccess({
        submissionId: request.submissionId,
        userId: request.userId,
        userRole: request.userRole,
        reason: request.reason,
        accessedAt: new Date().toISOString(),
        ipAddress: authResult.ipAddress
      })

      return {
        success: true,
        data: {
          submission: {
            id: encryptedResponse.id,
            formId: encryptedResponse.formId,
            clientId: encryptedResponse.clientId,
            practitionerId: encryptedResponse.practitionerId,
            assignmentId: encryptedResponse.assignmentId,
            submittedAt: encryptedResponse.submittedAt
          },
          responses: decryptedResponse.data.responses,
          attachments: processedAttachments,
          metadata: {
            submittedAt: decryptedResponse.data.metadata.submittedAt,
            timeSpent: decryptedResponse.data.metadata.timeSpent,
            deviceInfo: decryptedResponse.data.metadata.deviceInfo,
            browserInfo: decryptedResponse.data.metadata.browserInfo
          }
        }
      }

    } catch (error) {
      console.error('Error retrieving form response:', error)
      
      // Create audit log for failed access
      await FormResponseAudit.logResponseAccessFailure({
        submissionId: request.submissionId,
        userId: request.userId,
        userRole: request.userRole,
        reason: request.reason,
        error: error instanceof Error ? error.message : 'Unknown error',
        attemptedAt: new Date().toISOString()
      })

      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Retrieval failed']
      }
    }
  }

  /**
   * Export form responses in bulk for compliance or analysis
   */
  static async exportFormResponses(request: BulkResponseExportRequest): Promise<any> {
    try {
      // Verify user authorization for bulk export
      const authResult = await this.authorizeBulkExport(
        request.clientId,
        request.practitionerId,
        request.userId,
        request.userRole
      )
      
      if (!authResult.authorized) {
        throw new Error('Unauthorized bulk export access')
      }

      // Get encrypted responses based on filters
      const encryptedResponses = await this.getEncryptedResponsesBulk({
        clientId: request.clientId,
        practitionerId: request.practitionerId,
        dateRange: request.dateRange,
        formIds: request.formIds
      })

      // Decrypt responses
      const decryptedResponses = await Promise.all(
        encryptedResponses.map(async (encrypted) => {
          const decrypted = await FormResponseEncryption.decryptResponse(encrypted)
          return {
            ...decrypted,
            data: this.sanitizeForExport(decrypted.data, request.userRole)
          }
        })
      )

      // Format according to requested format
      const exportData = await this.formatExportData(decryptedResponses, request.format)

      // Create audit log entry
      await FormResponseAudit.logBulkExport({
        userId: request.userId,
        userRole: request.userRole,
        clientId: request.clientId,
        practitionerId: request.practitionerId,
        recordCount: decryptedResponses.length,
        format: request.format,
        reason: request.reason,
        exportedAt: new Date().toISOString()
      })

      return {
        success: true,
        data: exportData,
        recordCount: decryptedResponses.length,
        format: request.format
      }

    } catch (error) {
      console.error('Error exporting form responses:', error)
      
      // Create audit log for failed export
      await FormResponseAudit.logBulkExportFailure({
        userId: request.userId,
        userRole: request.userRole,
        clientId: request.clientId,
        practitionerId: request.practitionerId,
        reason: request.reason,
        error: error instanceof Error ? error.message : 'Unknown error',
        attemptedAt: new Date().toISOString()
      })

      throw error
    }
  }

  /**
   * Search form responses with privacy protection
   */
  static async searchFormResponses(request: ResponseSearchRequest): Promise<any> {
    try {
      // Search using encrypted search tokens (non-PHI fields only)
      const searchResults = await this.performEncryptedSearch(request)

      return {
        success: true,
        results: searchResults.results,
        totalCount: searchResults.totalCount,
        hasMore: searchResults.hasMore
      }

    } catch (error) {
      console.error('Error searching form responses:', error)
      throw error
    }
  }

  // Private helper methods

  private static async validateSubmissionRequest(request: FormSubmissionRequest): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate required fields
    if (!request.formId) errors.push('Form ID is required')
    if (!request.clientId) errors.push('Client ID is required')
    if (!request.practitionerId) errors.push('Practitioner ID is required')
    if (!request.responses || Object.keys(request.responses).length === 0) {
      errors.push('Form responses are required')
    }

    // Validate metadata
    if (!request.metadata?.startedAt) warnings.push('Start time not provided')
    if (!request.metadata?.deviceInfo) warnings.push('Device info not provided')
    if (!request.metadata?.browserInfo) warnings.push('Browser info not provided')

    // Validate file attachments
    if (request.attachments) {
      for (const attachment of request.attachments) {
        if (!attachment.fieldId) errors.push('Attachment field ID is required')
        if (!attachment.file) errors.push('Attachment file is required')
        if (attachment.file.size > 10 * 1024 * 1024) { // 10MB limit
          errors.push(`Attachment ${attachment.fieldId} exceeds 10MB limit`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static async getFormSchema(formId: string): Promise<any> {
    // In a real implementation, this would fetch from database
    // For now, return a mock schema
    try {
      const response = await fetch(`/api/intake-forms/${formId}`)
      if (!response.ok) {
        throw new Error('Form not found')
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching form schema:', error)
      return null
    }
  }

  private static async processAttachments(
    attachments: Array<{ fieldId: string; file: File }>,
    clientId: string,
    practitionerId: string
  ): Promise<Array<{
    fieldId: string
    filename: string
    contentType: string
    size: number
    encryptedContent: string
    checksum: string
  }>> {
    const processedAttachments = []

    for (const attachment of attachments) {
      try {
        // Read file content
        const arrayBuffer = await attachment.file.arrayBuffer()
        const content = new Uint8Array(arrayBuffer)

        // Encrypt file content
        const encryptedContent = await this.encryptFileContent(content, clientId, practitionerId)

        // Generate checksum
        const checksum = await this.generateChecksum(content)

        processedAttachments.push({
          fieldId: attachment.fieldId,
          filename: attachment.file.name,
          contentType: attachment.file.type,
          size: attachment.file.size,
          encryptedContent,
          checksum
        })
      } catch (error) {
        console.error('Error processing attachment:', error)
        throw new Error(`Failed to process attachment for field ${attachment.fieldId}`)
      }
    }

    return processedAttachments
  }

  private static async validateFormResponses(
    formSchema: any,
    responses: Record<string, any>
  ): Promise<{
    isValid: boolean
    errors: Array<{ fieldId: string; message: string; code: string }>
    warnings: Array<{ fieldId: string; message: string; code: string }>
    sanitizedData: Record<string, any>
  }> {
    // Extract validation rules from form schema
    const validationRules = this.extractValidationRules(formSchema)
    
    // Use FormResponseEncryption validation
    return FormResponseEncryption.validateResponses(responses, validationRules)
  }

  private static extractValidationRules(formSchema: any): any[] {
    const rules: any[] = []
    
    if (formSchema?.sections) {
      formSchema.sections.forEach((section: any) => {
        if (section.fields) {
          section.fields.forEach((field: any) => {
            rules.push({
              fieldId: field.id,
              required: field.required || false,
              dataType: this.mapFieldTypeToDataType(field.type),
              minLength: field.validation?.minLength,
              maxLength: field.validation?.maxLength,
              pattern: field.validation?.pattern,
              allowedValues: field.options?.map((opt: any) => opt.value)
            })
          })
        }
      })
    }
    
    return rules
  }

  private static mapFieldTypeToDataType(fieldType: string): string {
    const typeMap: Record<string, string> = {
      'text': 'string',
      'textarea': 'string',
      'email': 'email',
      'phone': 'phone',
      'number': 'number',
      'date': 'date',
      'checkbox': 'boolean',
      'file': 'file'
    }
    
    return typeMap[fieldType] || 'string'
  }

  private static async storeEncryptedResponse(encryptedResponse: EncryptedFormResponse): Promise<void> {
    // In a real implementation, this would store in database
    // For now, we'll simulate storage
    try {
      const response = await fetch('/api/form-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(encryptedResponse),
      })
      
      if (!response.ok) {
        throw new Error('Failed to store encrypted response')
      }
    } catch (error) {
      console.error('Error storing encrypted response:', error)
      throw error
    }
  }

  private static async updateAssignmentStatus(assignmentId: string, status: string): Promise<void> {
    try {
      const response = await fetch(`/api/form-assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update assignment status')
      }
    } catch (error) {
      console.error('Error updating assignment status:', error)
      // Don't throw here as this is not critical to form submission
    }
  }

  private static async sendCompletionNotifications(request: FormSubmissionRequest): Promise<void> {
    try {
      // Send notification to practitioner
      await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'form_completed',
          recipientId: request.practitionerId,
          data: {
            formId: request.formId,
            clientId: request.clientId,
            assignmentId: request.assignmentId
          }
        }),
      })
    } catch (error) {
      console.error('Error sending completion notifications:', error)
      // Don't throw here as this is not critical to form submission
    }
  }

  private static async authorizeResponseAccess(
    submissionId: string,
    userId: string,
    userRole: string
  ): Promise<{ authorized: boolean; ipAddress?: string }> {
    // Check if user has permission to access this specific response
    // This would involve checking database permissions
    const authorizedRoles = ['HERBALIST', 'ADMIN']
    return {
      authorized: authorizedRoles.includes(userRole.toUpperCase()),
      ipAddress: '127.0.0.1' // Would get actual IP in real implementation
    }
  }

  private static async getEncryptedResponse(submissionId: string): Promise<EncryptedFormResponse | null> {
    try {
      const response = await fetch(`/api/form-responses/${submissionId}`)
      if (!response.ok) {
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error getting encrypted response:', error)
      return null
    }
  }

  private static async processAttachmentsForDisplay(
    attachments: Array<any>,
    userId: string,
    userRole: string
  ): Promise<Array<any>> {
    // Process attachments for safe display
    return attachments.map(attachment => ({
      fieldId: attachment.fieldId,
      filename: attachment.filename,
      url: `/api/attachments/${attachment.fieldId}?userId=${userId}`,
      contentType: attachment.contentType,
      size: attachment.size
    }))
  }

  private static async authorizeBulkExport(
    clientId: string,
    practitionerId: string,
    userId: string,
    userRole: string
  ): Promise<{ authorized: boolean }> {
    // Check bulk export permissions
    const authorizedRoles = ['HERBALIST', 'ADMIN']
    return {
      authorized: authorizedRoles.includes(userRole.toUpperCase())
    }
  }

  private static async getEncryptedResponsesBulk(filters: any): Promise<EncryptedFormResponse[]> {
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value != null) {
          queryParams.append(key, String(value))
        }
      })
      
      const response = await fetch(`/api/form-responses?${queryParams}`)
      if (!response.ok) {
        throw new Error('Failed to get bulk responses')
      }
      return await response.json()
    } catch (error) {
      console.error('Error getting bulk responses:', error)
      throw error
    }
  }

  private static sanitizeForExport(data: FormResponseData, userRole: string): FormResponseData {
    // Remove sensitive data based on user role
    if (!FormResponseEncryption.canUserAccessPHI(userRole)) {
      // Remove PHI fields for unauthorized users
      const sanitized = { ...data }
      // Implementation would remove PHI fields here
      return sanitized
    }
    return data
  }

  private static async formatExportData(responses: any[], format: string): Promise<any> {
    switch (format) {
      case 'json':
        return {
          exportDate: new Date().toISOString(),
          responses: responses.map(r => ({
            id: r.id,
            formId: r.formId,
            submittedAt: r.submittedAt,
            responses: r.data.responses,
            metadata: r.data.metadata
          }))
        }
      case 'csv':
        // TODO: Implement CSV formatting
        throw new Error('CSV export not yet implemented')
      case 'pdf':
        // TODO: Implement PDF formatting
        throw new Error('PDF export not yet implemented')
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  private static async performEncryptedSearch(request: ResponseSearchRequest): Promise<any> {
    // Perform search using encrypted search tokens
    // This would query the database for matching encrypted tokens
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('practitionerId', request.practitionerId)
      queryParams.append('query', request.query)
      if (request.limit) queryParams.append('limit', request.limit.toString())
      if (request.offset) queryParams.append('offset', request.offset.toString())
      
      const response = await fetch(`/api/form-responses/search?${queryParams}`)
      if (!response.ok) {
        throw new Error('Search failed')
      }
      return await response.json()
    } catch (error) {
      console.error('Error performing encrypted search:', error)
      throw error
    }
  }

  private static async encryptFileContent(
    content: Uint8Array,
    clientId: string,
    practitionerId: string
  ): Promise<string> {
    // Encrypt file content using same encryption as form responses
    const textContent = new TextDecoder().decode(content)
    const encryptedResponse = await FormResponseEncryption.encryptResponse(
      {
        responses: { file: textContent },
        metadata: {
          startedAt: new Date().toISOString(),
          submittedAt: new Date().toISOString(),
          timeSpent: 0,
          deviceInfo: 'server',
          browserInfo: 'server'
        }
      },
      clientId,
      practitionerId
    )
    return encryptedResponse.encryptedData
  }

  private static async generateChecksum(content: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', content)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}

// Zod schemas for validation
export const FormSubmissionRequestSchema = z.object({
  formId: z.string(),
  clientId: z.string(),
  practitionerId: z.string(),
  assignmentId: z.string().optional(),
  responses: z.record(z.any()),
  attachments: z.array(z.object({
    fieldId: z.string(),
    file: z.any() // File object
  })).optional(),
  metadata: z.object({
    startedAt: z.string(),
    timeSpent: z.number(),
    deviceInfo: z.string(),
    browserInfo: z.string(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional()
  })
})

export const FormResponseRetrievalRequestSchema = z.object({
  submissionId: z.string(),
  userId: z.string(),
  userRole: z.string(),
  reason: z.string()
})

export const BulkResponseExportRequestSchema = z.object({
  clientId: z.string(),
  practitionerId: z.string(),
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  formIds: z.array(z.string()).optional(),
  format: z.enum(['json', 'csv', 'pdf']),
  userId: z.string(),
  userRole: z.string(),
  reason: z.string()
})