import { z } from 'zod'

export interface FormResponseAuditEntry {
  id: string
  timestamp: string
  operation: 'submit' | 'access' | 'export' | 'update' | 'delete' | 'decrypt'
  userId: string
  userRole: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  formId?: string
  clientId?: string
  practitionerId?: string
  submissionId?: string
  assignmentId?: string
  outcome: 'success' | 'failure' | 'warning'
  details: {
    fieldCount?: number
    hasAttachments?: boolean
    reason?: string
    error?: string
    updatedFields?: string[]
    exportFormat?: string
    recordCount?: number
    accessDuration?: number
  }
  metadata: {
    version: string
    source: string
    correlationId?: string
    parentAuditId?: string
  }
}

export interface AuditQuery {
  userId?: string
  userRole?: string
  operation?: string
  outcome?: string
  formId?: string
  clientId?: string
  practitionerId?: string
  submissionId?: string
  dateRange?: {
    start: string
    end: string
  }
  ipAddress?: string
  limit?: number
  offset?: number
  sortBy?: 'timestamp' | 'operation' | 'outcome'
  sortOrder?: 'asc' | 'desc'
}

export interface AuditReport {
  summary: {
    totalEntries: number
    operations: Record<string, number>
    outcomes: Record<string, number>
    uniqueUsers: number
    dateRange: {
      start: string
      end: string
    }
  }
  patterns: {
    mostActiveUsers: Array<{
      userId: string
      userRole: string
      operationCount: number
    }>
    commonOperations: Array<{
      operation: string
      count: number
      successRate: number
    }>
    errorPatterns: Array<{
      error: string
      count: number
      firstOccurrence: string
      lastOccurrence: string
    }>
    suspiciousActivity: Array<{
      type: 'unusual_access_pattern' | 'bulk_access' | 'failed_attempts' | 'unauthorized_access'
      description: string
      userId: string
      timestamp: string
      severity: 'low' | 'medium' | 'high'
    }>
  }
  compliance: {
    phiAccess: {
      totalAccesses: number
      authorizedAccesses: number
      unauthorizedAttempts: number
      averageAccessDuration: number
    }
    dataRetention: {
      oldestEntry: string
      entriesNearingRetentionLimit: number
      retentionPolicy: string
    }
    encryption: {
      totalEncryptedSubmissions: number
      encryptionFailures: number
      decryptionAttempts: number
      decryptionFailures: number
    }
  }
}

export interface ComplianceAlert {
  id: string
  type: 'unauthorized_access' | 'bulk_export' | 'encryption_failure' | 'suspicious_pattern' | 'data_breach'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  affectedEntities: {
    userIds?: string[]
    clientIds?: string[]
    submissionIds?: string[]
    formIds?: string[]
  }
  detectedAt: string
  auditEntries: string[]
  recommendedActions: string[]
  status: 'active' | 'investigating' | 'resolved' | 'false_positive'
  assignedTo?: string
  resolvedAt?: string
  resolutionNotes?: string
}

/**
 * Form Response Audit Service
 * Handles comprehensive audit logging for all form response operations
 */
export class FormResponseAudit {
  private static readonly VERSION = '1.0'
  private static readonly SOURCE = 'form-response-system'

  /**
   * Log form response submission
   */
  static async logResponseSubmission(data: {
    submissionId: string
    formId: string
    clientId: string
    practitionerId: string
    assignmentId?: string
    fieldCount: number
    hasAttachments: boolean
    ipAddress?: string
    userAgent?: string
    submittedAt: string
  }): Promise<void> {
    const auditEntry: FormResponseAuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation: 'submit',
      userId: data.clientId, // Client is the user submitting
      userRole: 'CLIENT',
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      formId: data.formId,
      clientId: data.clientId,
      practitionerId: data.practitionerId,
      submissionId: data.submissionId,
      assignmentId: data.assignmentId,
      outcome: 'success',
      details: {
        fieldCount: data.fieldCount,
        hasAttachments: data.hasAttachments,
        reason: 'Form submission completed'
      },
      metadata: {
        version: this.VERSION,
        source: this.SOURCE,
        correlationId: data.submissionId
      }
    }

    await this.storeAuditEntry(auditEntry)
    await this.checkComplianceRules(auditEntry)
  }

  /**
   * Log failed form response submission
   */
  static async logResponseSubmissionFailure(data: {
    formId: string
    clientId: string
    practitionerId: string
    error: string
    ipAddress?: string
    userAgent?: string
    attemptedAt: string
  }): Promise<void> {
    const auditEntry: FormResponseAuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation: 'submit',
      userId: data.clientId,
      userRole: 'CLIENT',
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      formId: data.formId,
      clientId: data.clientId,
      practitionerId: data.practitionerId,
      outcome: 'failure',
      details: {
        error: data.error,
        reason: 'Form submission failed'
      },
      metadata: {
        version: this.VERSION,
        source: this.SOURCE
      }
    }

    await this.storeAuditEntry(auditEntry)
    await this.checkComplianceRules(auditEntry)
  }

  /**
   * Log form response access
   */
  static async logResponseAccess(data: {
    submissionId: string
    userId: string
    userRole: string
    reason: string
    accessedAt: string
    ipAddress?: string
    sessionId?: string
  }): Promise<void> {
    const auditEntry: FormResponseAuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation: 'access',
      userId: data.userId,
      userRole: data.userRole,
      sessionId: data.sessionId,
      ipAddress: data.ipAddress,
      submissionId: data.submissionId,
      outcome: 'success',
      details: {
        reason: data.reason
      },
      metadata: {
        version: this.VERSION,
        source: this.SOURCE,
        correlationId: data.submissionId
      }
    }

    await this.storeAuditEntry(auditEntry)
    await this.checkComplianceRules(auditEntry)
  }

  /**
   * Log failed form response access
   */
  static async logResponseAccessFailure(data: {
    submissionId: string
    userId: string
    userRole: string
    reason: string
    error: string
    attemptedAt: string
    ipAddress?: string
    sessionId?: string
  }): Promise<void> {
    const auditEntry: FormResponseAuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation: 'access',
      userId: data.userId,
      userRole: data.userRole,
      sessionId: data.sessionId,
      ipAddress: data.ipAddress,
      submissionId: data.submissionId,
      outcome: 'failure',
      details: {
        reason: data.reason,
        error: data.error
      },
      metadata: {
        version: this.VERSION,
        source: this.SOURCE,
        correlationId: data.submissionId
      }
    }

    await this.storeAuditEntry(auditEntry)
    await this.checkComplianceRules(auditEntry)
  }

  /**
   * Log bulk export operation
   */
  static async logBulkExport(data: {
    userId: string
    userRole: string
    clientId: string
    practitionerId: string
    recordCount: number
    format: string
    reason: string
    exportedAt: string
    ipAddress?: string
    sessionId?: string
  }): Promise<void> {
    const auditEntry: FormResponseAuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation: 'export',
      userId: data.userId,
      userRole: data.userRole,
      sessionId: data.sessionId,
      ipAddress: data.ipAddress,
      clientId: data.clientId,
      practitionerId: data.practitionerId,
      outcome: 'success',
      details: {
        recordCount: data.recordCount,
        exportFormat: data.format,
        reason: data.reason
      },
      metadata: {
        version: this.VERSION,
        source: this.SOURCE
      }
    }

    await this.storeAuditEntry(auditEntry)
    await this.checkComplianceRules(auditEntry)
  }

  /**
   * Log failed bulk export operation
   */
  static async logBulkExportFailure(data: {
    userId: string
    userRole: string
    clientId: string
    practitionerId: string
    reason: string
    error: string
    attemptedAt: string
    ipAddress?: string
    sessionId?: string
  }): Promise<void> {
    const auditEntry: FormResponseAuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation: 'export',
      userId: data.userId,
      userRole: data.userRole,
      sessionId: data.sessionId,
      ipAddress: data.ipAddress,
      clientId: data.clientId,
      practitionerId: data.practitionerId,
      outcome: 'failure',
      details: {
        reason: data.reason,
        error: data.error
      },
      metadata: {
        version: this.VERSION,
        source: this.SOURCE
      }
    }

    await this.storeAuditEntry(auditEntry)
    await this.checkComplianceRules(auditEntry)
  }

  /**
   * Log profile update from form response
   */
  static async logProfileUpdate(data: {
    clientId: string
    practitionerId: string
    userId: string
    userRole: string
    updatedFields: string[]
    updateReason: string
    formSubmissionId: string
    updatedAt: string
    ipAddress?: string
    sessionId?: string
  }): Promise<void> {
    const auditEntry: FormResponseAuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation: 'update',
      userId: data.userId,
      userRole: data.userRole,
      sessionId: data.sessionId,
      ipAddress: data.ipAddress,
      clientId: data.clientId,
      practitionerId: data.practitionerId,
      outcome: 'success',
      details: {
        updatedFields: data.updatedFields,
        reason: data.updateReason
      },
      metadata: {
        version: this.VERSION,
        source: this.SOURCE,
        correlationId: data.formSubmissionId
      }
    }

    await this.storeAuditEntry(auditEntry)
    await this.checkComplianceRules(auditEntry)
  }

  /**
   * Log failed profile update
   */
  static async logProfileUpdateFailure(data: {
    clientId: string
    practitionerId: string
    userId: string
    userRole: string
    updateReason: string
    error: string
    attemptedAt: string
    ipAddress?: string
    sessionId?: string
  }): Promise<void> {
    const auditEntry: FormResponseAuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation: 'update',
      userId: data.userId,
      userRole: data.userRole,
      sessionId: data.sessionId,
      ipAddress: data.ipAddress,
      clientId: data.clientId,
      practitionerId: data.practitionerId,
      outcome: 'failure',
      details: {
        reason: data.updateReason,
        error: data.error
      },
      metadata: {
        version: this.VERSION,
        source: this.SOURCE
      }
    }

    await this.storeAuditEntry(auditEntry)
    await this.checkComplianceRules(auditEntry)
  }

  /**
   * Query audit entries
   */
  static async queryAuditEntries(query: AuditQuery): Promise<{
    entries: FormResponseAuditEntry[]
    totalCount: number
    hasMore: boolean
  }> {
    try {
      const queryParams = new URLSearchParams()
      
      Object.entries(query).forEach(([key, value]) => {
        if (value != null) {
          if (typeof value === 'object' && 'start' in value && 'end' in value) {
            queryParams.append(`${key}.start`, value.start)
            queryParams.append(`${key}.end`, value.end)
          } else {
            queryParams.append(key, String(value))
          }
        }
      })

      const response = await fetch(`/api/audit/form-responses?${queryParams}`)
      if (!response.ok) {
        throw new Error('Failed to query audit entries')
      }

      const result = await response.json()
      return {
        entries: result.entries,
        totalCount: result.totalCount,
        hasMore: result.hasMore
      }
    } catch (error) {
      console.error('Error querying audit entries:', error)
      throw error
    }
  }

  /**
   * Generate audit report
   */
  static async generateAuditReport(
    startDate: string,
    endDate: string,
    filters?: Partial<AuditQuery>
  ): Promise<AuditReport> {
    try {
      const query: AuditQuery = {
        ...filters,
        dateRange: { start: startDate, end: endDate },
        limit: 10000 // Large limit for comprehensive report
      }

      const { entries } = await this.queryAuditEntries(query)

      return this.processAuditEntriesForReport(entries, startDate, endDate)
    } catch (error) {
      console.error('Error generating audit report:', error)
      throw error
    }
  }

  /**
   * Get compliance alerts
   */
  static async getComplianceAlerts(
    status?: ComplianceAlert['status'],
    severity?: ComplianceAlert['severity']
  ): Promise<ComplianceAlert[]> {
    try {
      const queryParams = new URLSearchParams()
      if (status) queryParams.append('status', status)
      if (severity) queryParams.append('severity', severity)

      const response = await fetch(`/api/audit/compliance-alerts?${queryParams}`)
      if (!response.ok) {
        throw new Error('Failed to get compliance alerts')
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting compliance alerts:', error)
      return []
    }
  }

  /**
   * Create compliance alert
   */
  static async createComplianceAlert(alert: Omit<ComplianceAlert, 'id' | 'detectedAt' | 'status'>): Promise<string> {
    try {
      const fullAlert: ComplianceAlert = {
        ...alert,
        id: crypto.randomUUID(),
        detectedAt: new Date().toISOString(),
        status: 'active'
      }

      const response = await fetch('/api/audit/compliance-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullAlert),
      })

      if (!response.ok) {
        throw new Error('Failed to create compliance alert')
      }

      const result = await response.json()
      return result.id
    } catch (error) {
      console.error('Error creating compliance alert:', error)
      throw error
    }
  }

  // Private helper methods

  private static async storeAuditEntry(entry: FormResponseAuditEntry): Promise<void> {
    try {
      const response = await fetch('/api/audit/form-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      })

      if (!response.ok) {
        throw new Error('Failed to store audit entry')
      }
    } catch (error) {
      console.error('Error storing audit entry:', error)
      // In production, this should be handled more robustly
      // e.g., queue for retry, alert administrators, etc.
      throw error
    }
  }

  private static async checkComplianceRules(entry: FormResponseAuditEntry): Promise<void> {
    try {
      // Check for suspicious activity patterns
      await this.detectSuspiciousActivity(entry)
      
      // Check for unauthorized access attempts
      if (entry.outcome === 'failure' && entry.operation === 'access') {
        await this.handleUnauthorizedAccess(entry)
      }
      
      // Check for bulk operations
      if (entry.operation === 'export' && entry.details.recordCount && entry.details.recordCount > 100) {
        await this.handleBulkOperation(entry)
      }
      
      // Check for encryption failures
      if (entry.outcome === 'failure' && entry.details.error?.includes('encryption')) {
        await this.handleEncryptionFailure(entry)
      }
    } catch (error) {
      console.error('Error checking compliance rules:', error)
      // Don't throw here as compliance checking is supplementary
    }
  }

  private static async detectSuspiciousActivity(entry: FormResponseAuditEntry): Promise<void> {
    // Get recent entries from same user
    const recentEntries = await this.queryAuditEntries({
      userId: entry.userId,
      dateRange: {
        start: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Last hour
        end: new Date().toISOString()
      }
    })

    // Check for unusual access patterns
    if (recentEntries.entries.length > 50) { // More than 50 operations in an hour
      await this.createComplianceAlert({
        type: 'suspicious_pattern',
        severity: 'medium',
        title: 'Unusual Access Pattern Detected',
        description: `User ${entry.userId} performed ${recentEntries.entries.length} operations in the last hour`,
        affectedEntities: { userIds: [entry.userId] },
        auditEntries: recentEntries.entries.map(e => e.id),
        recommendedActions: [
          'Review user activity',
          'Verify user identity',
          'Check for compromised account'
        ]
      })
    }

    // Check for rapid bulk accesses
    const bulkAccesses = recentEntries.entries.filter(e => 
      e.operation === 'access' && e.outcome === 'success'
    )
    
    if (bulkAccesses.length > 20) { // More than 20 accesses in an hour
      await this.createComplianceAlert({
        type: 'bulk_access',
        severity: 'high',
        title: 'Bulk Data Access Detected',
        description: `User ${entry.userId} accessed ${bulkAccesses.length} form responses in the last hour`,
        affectedEntities: { 
          userIds: [entry.userId],
          submissionIds: bulkAccesses.map(e => e.submissionId).filter(Boolean) as string[]
        },
        auditEntries: bulkAccesses.map(e => e.id),
        recommendedActions: [
          'Verify legitimate business need',
          'Review data access permissions',
          'Contact user to confirm activity'
        ]
      })
    }
  }

  private static async handleUnauthorizedAccess(entry: FormResponseAuditEntry): Promise<void> {
    // Count failed access attempts from this user/IP
    const failedAttempts = await this.queryAuditEntries({
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      operation: 'access',
      outcome: 'failure',
      dateRange: {
        start: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // Last 15 minutes
        end: new Date().toISOString()
      }
    })

    if (failedAttempts.entries.length >= 5) { // 5 or more failed attempts
      await this.createComplianceAlert({
        type: 'unauthorized_access',
        severity: 'high',
        title: 'Multiple Failed Access Attempts',
        description: `${failedAttempts.entries.length} failed access attempts from user ${entry.userId} (IP: ${entry.ipAddress})`,
        affectedEntities: { userIds: [entry.userId] },
        auditEntries: failedAttempts.entries.map(e => e.id),
        recommendedActions: [
          'Block user account temporarily',
          'Investigate IP address',
          'Review access logs',
          'Contact user to verify identity'
        ]
      })
    }
  }

  private static async handleBulkOperation(entry: FormResponseAuditEntry): Promise<void> {
    await this.createComplianceAlert({
      type: 'bulk_export',
      severity: 'medium',
      title: 'Bulk Data Export Performed',
      description: `User ${entry.userId} exported ${entry.details.recordCount} records in ${entry.details.exportFormat} format`,
      affectedEntities: { 
        userIds: [entry.userId],
        clientIds: entry.clientId ? [entry.clientId] : undefined
      },
      auditEntries: [entry.id],
      recommendedActions: [
        'Verify business justification',
        'Confirm data handling procedures',
        'Review export contents if necessary'
      ]
    })
  }

  private static async handleEncryptionFailure(entry: FormResponseAuditEntry): Promise<void> {
    await this.createComplianceAlert({
      type: 'encryption_failure',
      severity: 'critical',
      title: 'Encryption Failure Detected',
      description: `Encryption failure during ${entry.operation} operation: ${entry.details.error}`,
      affectedEntities: { 
        userIds: [entry.userId],
        submissionIds: entry.submissionId ? [entry.submissionId] : undefined,
        formIds: entry.formId ? [entry.formId] : undefined
      },
      auditEntries: [entry.id],
      recommendedActions: [
        'Investigate encryption system',
        'Check data integrity',
        'Review security protocols',
        'Notify security team immediately'
      ]
    })
  }

  private static processAuditEntriesForReport(
    entries: FormResponseAuditEntry[],
    startDate: string,
    endDate: string
  ): AuditReport {
    // Process entries for summary statistics
    const operations = entries.reduce((acc, entry) => {
      acc[entry.operation] = (acc[entry.operation] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const outcomes = entries.reduce((acc, entry) => {
      acc[entry.outcome] = (acc[entry.outcome] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const uniqueUsers = new Set(entries.map(e => e.userId)).size

    // Most active users
    const userActivity = entries.reduce((acc, entry) => {
      const key = `${entry.userId}:${entry.userRole}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostActiveUsers = Object.entries(userActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userKey, count]) => {
        const [userId, userRole] = userKey.split(':')
        return { userId, userRole, operationCount: count }
      })

    // Common operations with success rates
    const commonOperations = Object.entries(operations).map(([operation, count]) => {
      const successes = entries.filter(e => e.operation === operation && e.outcome === 'success').length
      return {
        operation,
        count,
        successRate: (successes / count) * 100
      }
    }).sort((a, b) => b.count - a.count)

    // Error patterns
    const errorCounts = entries
      .filter(e => e.outcome === 'failure' && e.details.error)
      .reduce((acc, entry) => {
        const error = entry.details.error!
        if (!acc[error]) {
          acc[error] = {
            count: 0,
            firstOccurrence: entry.timestamp,
            lastOccurrence: entry.timestamp
          }
        }
        acc[error].count++
        if (entry.timestamp < acc[error].firstOccurrence) {
          acc[error].firstOccurrence = entry.timestamp
        }
        if (entry.timestamp > acc[error].lastOccurrence) {
          acc[error].lastOccurrence = entry.timestamp
        }
        return acc
      }, {} as Record<string, { count: number; firstOccurrence: string; lastOccurrence: string }>)

    const errorPatterns = Object.entries(errorCounts).map(([error, data]) => ({
      error,
      ...data
    }))

    // PHI access statistics
    const phiAccesses = entries.filter(e => e.operation === 'access')
    const authorizedRoles = ['HERBALIST', 'ADMIN']
    const authorizedAccesses = phiAccesses.filter(e => authorizedRoles.includes(e.userRole))
    const unauthorizedAttempts = phiAccesses.filter(e => !authorizedRoles.includes(e.userRole))

    // Encryption statistics
    const encryptedSubmissions = entries.filter(e => 
      e.operation === 'submit' && e.outcome === 'success'
    )
    const encryptionFailures = entries.filter(e => 
      e.outcome === 'failure' && e.details.error?.includes('encryption')
    )
    const decryptionAttempts = entries.filter(e => e.operation === 'decrypt')
    const decryptionFailures = decryptionAttempts.filter(e => e.outcome === 'failure')

    return {
      summary: {
        totalEntries: entries.length,
        operations,
        outcomes,
        uniqueUsers,
        dateRange: { start: startDate, end: endDate }
      },
      patterns: {
        mostActiveUsers,
        commonOperations,
        errorPatterns,
        suspiciousActivity: [] // Would be populated from compliance alerts
      },
      compliance: {
        phiAccess: {
          totalAccesses: phiAccesses.length,
          authorizedAccesses: authorizedAccesses.length,
          unauthorizedAttempts: unauthorizedAttempts.length,
          averageAccessDuration: 0 // Would calculate from access duration tracking
        },
        dataRetention: {
          oldestEntry: entries.length > 0 ? 
            entries.reduce((oldest, entry) => 
              entry.timestamp < oldest ? entry.timestamp : oldest, 
              entries[0].timestamp
            ) : new Date().toISOString(),
          entriesNearingRetentionLimit: 0, // Would check against retention policy
          retentionPolicy: '7 years' // Configurable
        },
        encryption: {
          totalEncryptedSubmissions: encryptedSubmissions.length,
          encryptionFailures: encryptionFailures.length,
          decryptionAttempts: decryptionAttempts.length,
          decryptionFailures: decryptionFailures.length
        }
      }
    }
  }
}

// Zod schemas for validation
export const FormResponseAuditEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  operation: z.enum(['submit', 'access', 'export', 'update', 'delete', 'decrypt']),
  userId: z.string(),
  userRole: z.string(),
  sessionId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  formId: z.string().optional(),
  clientId: z.string().optional(),
  practitionerId: z.string().optional(),
  submissionId: z.string().optional(),
  assignmentId: z.string().optional(),
  outcome: z.enum(['success', 'failure', 'warning']),
  details: z.object({
    fieldCount: z.number().optional(),
    hasAttachments: z.boolean().optional(),
    reason: z.string().optional(),
    error: z.string().optional(),
    updatedFields: z.array(z.string()).optional(),
    exportFormat: z.string().optional(),
    recordCount: z.number().optional(),
    accessDuration: z.number().optional()
  }),
  metadata: z.object({
    version: z.string(),
    source: z.string(),
    correlationId: z.string().optional(),
    parentAuditId: z.string().optional()
  })
})

export const ComplianceAlertSchema = z.object({
  id: z.string(),
  type: z.enum(['unauthorized_access', 'bulk_export', 'encryption_failure', 'suspicious_pattern', 'data_breach']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  description: z.string(),
  affectedEntities: z.object({
    userIds: z.array(z.string()).optional(),
    clientIds: z.array(z.string()).optional(),
    submissionIds: z.array(z.string()).optional(),
    formIds: z.array(z.string()).optional()
  }),
  detectedAt: z.string(),
  auditEntries: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  status: z.enum(['active', 'investigating', 'resolved', 'false_positive']),
  assignedTo: z.string().optional(),
  resolvedAt: z.string().optional(),
  resolutionNotes: z.string().optional()
})