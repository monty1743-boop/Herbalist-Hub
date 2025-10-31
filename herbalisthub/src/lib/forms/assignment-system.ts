/**
 * Form Assignment System
 * 
 * Provides utilities for assigning forms to clients, tracking completion status,
 * and managing form deadlines and reminders.
 */

export interface FormAssignment {
  id: string
  formId: string
  clientId: string
  assignedBy: string
  assignedAt: string
  dueDate?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: FormAssignmentStatus
  completedAt?: string
  notificationsSent: number
  lastReminderSent?: string
  metadata: {
    appointmentId?: string
    appointmentType?: string
    notes?: string
    requiredBeforeAppointment?: boolean
    autoAssign?: boolean
    templateId?: string
  }
  settings: {
    allowLateSubmission?: boolean
    sendReminders?: boolean
    reminderIntervals?: number[] // Days before due date
    maxReminders?: number
    notificationPreferences?: NotificationPreferences
  }
}

export enum FormAssignmentStatus {
  ASSIGNED = 'assigned',
  VIEWED = 'viewed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface NotificationPreferences {
  email?: boolean
  sms?: boolean
  inApp?: boolean
  emailTemplate?: string
  smsTemplate?: string
  customMessage?: string
}

export interface AssignmentTemplate {
  id: string
  name: string
  description: string
  appointmentTypes: string[]
  formIds: string[]
  defaultDueDays: number
  defaultPriority: 'low' | 'medium' | 'high' | 'urgent'
  autoAssign: boolean
  settings: {
    sendReminders: boolean
    reminderIntervals: number[]
    maxReminders: number
    notificationPreferences: NotificationPreferences
  }
  conditions?: {
    clientTags?: string[]
    minimumDaysBefore?: number
    requirePreviousCompletion?: boolean
  }
}

export interface BulkAssignmentRequest {
  formIds: string[]
  clientIds: string[]
  dueDate?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  settings: Partial<FormAssignment['settings']>
  metadata: Partial<FormAssignment['metadata']>
}

export interface AssignmentAnalytics {
  totalAssigned: number
  completionRate: number
  averageCompletionTime: number // in hours
  overdueCount: number
  byStatus: Record<FormAssignmentStatus, number>
  byPriority: Record<string, number>
  clientEngagement: {
    clientId: string
    assignedCount: number
    completedCount: number
    averageResponseTime: number
    lastActivity: string
  }[]
  formPerformance: {
    formId: string
    formName: string
    assignedCount: number
    completedCount: number
    averageCompletionTime: number
    dropOffPoints: string[]
  }[]
}

export class FormAssignmentSystem {
  private assignments: Map<string, FormAssignment> = new Map()
  private templates: Map<string, AssignmentTemplate> = new Map()

  /**
   * Create a new form assignment
   */
  async createAssignment(assignment: Omit<FormAssignment, 'id' | 'assignedAt' | 'status' | 'notificationsSent'>): Promise<FormAssignment> {
    const newAssignment: FormAssignment = {
      ...assignment,
      id: this.generateAssignmentId(),
      assignedAt: new Date().toISOString(),
      status: FormAssignmentStatus.ASSIGNED,
      notificationsSent: 0
    }

    // Validate assignment
    await this.validateAssignment(newAssignment)

    // Store assignment
    this.assignments.set(newAssignment.id, newAssignment)

    // Schedule initial notification
    if (newAssignment.settings.sendReminders !== false) {
      await this.scheduleNotification(newAssignment.id, 'assignment')
    }

    return newAssignment
  }

  /**
   * Create multiple assignments from template
   */
  async createAssignmentsFromTemplate(
    templateId: string, 
    clientIds: string[], 
    overrides?: Partial<FormAssignment>
  ): Promise<FormAssignment[]> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    const assignments: FormAssignment[] = []

    for (const clientId of clientIds) {
      for (const formId of template.formIds) {
        const dueDate = this.calculateDueDate(template.defaultDueDays)
        
        const assignment = await this.createAssignment({
          formId,
          clientId,
          assignedBy: overrides?.assignedBy || '',
          dueDate,
          priority: template.defaultPriority,
          metadata: {
            ...overrides?.metadata,
            templateId: template.id,
            autoAssign: template.autoAssign
          },
          settings: {
            ...template.settings,
            ...overrides?.settings
          }
        })

        assignments.push(assignment)
      }
    }

    return assignments
  }

  /**
   * Bulk assign forms to multiple clients
   */
  async bulkAssignForms(request: BulkAssignmentRequest, assignedBy: string): Promise<FormAssignment[]> {
    const assignments: FormAssignment[] = []

    for (const clientId of request.clientIds) {
      for (const formId of request.formIds) {
        const assignment = await this.createAssignment({
          formId,
          clientId,
          assignedBy,
          dueDate: request.dueDate,
          priority: request.priority,
          metadata: request.metadata,
          settings: request.settings
        })

        assignments.push(assignment)
      }
    }

    return assignments
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(assignmentId: string, status: FormAssignmentStatus, metadata?: any): Promise<void> {
    const assignment = this.assignments.get(assignmentId)
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`)
    }

    const previousStatus = assignment.status
    assignment.status = status

    // Update completion timestamp
    if (status === FormAssignmentStatus.COMPLETED && !assignment.completedAt) {
      assignment.completedAt = new Date().toISOString()
    }

    // Handle status-specific logic
    switch (status) {
      case FormAssignmentStatus.VIEWED:
        if (previousStatus === FormAssignmentStatus.ASSIGNED) {
          // Track first view
          await this.logAssignmentEvent(assignmentId, 'viewed', metadata)
        }
        break

      case FormAssignmentStatus.IN_PROGRESS:
        if (previousStatus === FormAssignmentStatus.ASSIGNED || previousStatus === FormAssignmentStatus.VIEWED) {
          // Track form start
          await this.logAssignmentEvent(assignmentId, 'started', metadata)
        }
        break

      case FormAssignmentStatus.COMPLETED:
        // Cancel any pending reminders
        await this.cancelReminders(assignmentId)
        await this.logAssignmentEvent(assignmentId, 'completed', metadata)
        break

      case FormAssignmentStatus.CANCELLED:
        await this.cancelReminders(assignmentId)
        await this.logAssignmentEvent(assignmentId, 'cancelled', metadata)
        break
    }

    this.assignments.set(assignmentId, assignment)
  }

  /**
   * Get assignments for a client
   */
  getClientAssignments(clientId: string, filters?: {
    status?: FormAssignmentStatus[]
    formId?: string
    dateRange?: { start: string; end: string }
  }): FormAssignment[] {
    let assignments = Array.from(this.assignments.values())
      .filter(assignment => assignment.clientId === clientId)

    if (filters?.status) {
      assignments = assignments.filter(assignment => 
        filters.status!.includes(assignment.status)
      )
    }

    if (filters?.formId) {
      assignments = assignments.filter(assignment => 
        assignment.formId === filters.formId
      )
    }

    if (filters?.dateRange) {
      assignments = assignments.filter(assignment => {
        const assignedDate = new Date(assignment.assignedAt)
        const start = new Date(filters.dateRange!.start)
        const end = new Date(filters.dateRange!.end)
        return assignedDate >= start && assignedDate <= end
      })
    }

    return assignments.sort((a, b) => 
      new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    )
  }

  /**
   * Get overdue assignments
   */
  getOverdueAssignments(): FormAssignment[] {
    const now = new Date()
    
    return Array.from(this.assignments.values())
      .filter(assignment => {
        if (!assignment.dueDate) return false
        if (assignment.status === FormAssignmentStatus.COMPLETED) return false
        if (assignment.status === FormAssignmentStatus.CANCELLED) return false
        
        const dueDate = new Date(assignment.dueDate)
        return dueDate < now
      })
      .map(assignment => {
        // Update status to overdue if not already
        if (assignment.status !== FormAssignmentStatus.OVERDUE) {
          assignment.status = FormAssignmentStatus.OVERDUE
          this.assignments.set(assignment.id, assignment)
        }
        return assignment
      })
  }

  /**
   * Get assignments due for reminders
   */
  getAssignmentsDueForReminders(): FormAssignment[] {
    const now = new Date()
    
    return Array.from(this.assignments.values())
      .filter(assignment => {
        if (!assignment.dueDate) return false
        if (assignment.status === FormAssignmentStatus.COMPLETED) return false
        if (assignment.status === FormAssignmentStatus.CANCELLED) return false
        if (!assignment.settings.sendReminders) return false

        const dueDate = new Date(assignment.dueDate)
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
        
        // Check if we should send a reminder based on intervals
        const reminderIntervals = assignment.settings.reminderIntervals || [24, 48, 168] // 1 day, 2 days, 1 week
        const maxReminders = assignment.settings.maxReminders || 3

        if (assignment.notificationsSent >= maxReminders) return false

        // Check if it's time for the next reminder
        for (const interval of reminderIntervals) {
          if (hoursUntilDue <= interval && hoursUntilDue > (interval - 24)) {
            // Check if we already sent this reminder
            const lastReminderDate = assignment.lastReminderSent ? new Date(assignment.lastReminderSent) : null
            if (!lastReminderDate || (now.getTime() - lastReminderDate.getTime()) > (23 * 60 * 60 * 1000)) {
              return true
            }
          }
        }

        return false
      })
  }

  /**
   * Process reminders for assignments
   */
  async processReminders(): Promise<{ sent: number; failed: number }> {
    const assignmentsDue = this.getAssignmentsDueForReminders()
    let sent = 0
    let failed = 0

    for (const assignment of assignmentsDue) {
      try {
        await this.sendReminder(assignment)
        
        // Update reminder tracking
        assignment.notificationsSent++
        assignment.lastReminderSent = new Date().toISOString()
        this.assignments.set(assignment.id, assignment)
        
        sent++
      } catch (error) {
        console.error(`Failed to send reminder for assignment ${assignment.id}:`, error)
        failed++
      }
    }

    return { sent, failed }
  }

  /**
   * Generate assignment analytics
   */
  generateAnalytics(filters?: {
    dateRange?: { start: string; end: string }
    assignedBy?: string
    clientIds?: string[]
  }): AssignmentAnalytics {
    let assignments = Array.from(this.assignments.values())

    // Apply filters
    if (filters?.dateRange) {
      const start = new Date(filters.dateRange.start)
      const end = new Date(filters.dateRange.end)
      assignments = assignments.filter(assignment => {
        const assignedDate = new Date(assignment.assignedAt)
        return assignedDate >= start && assignedDate <= end
      })
    }

    if (filters?.assignedBy) {
      assignments = assignments.filter(assignment => 
        assignment.assignedBy === filters.assignedBy
      )
    }

    if (filters?.clientIds) {
      assignments = assignments.filter(assignment => 
        filters.clientIds!.includes(assignment.clientId)
      )
    }

    // Calculate basic metrics
    const totalAssigned = assignments.length
    const completedAssignments = assignments.filter(a => a.status === FormAssignmentStatus.COMPLETED)
    const completionRate = totalAssigned > 0 ? (completedAssignments.length / totalAssigned) * 100 : 0

    // Calculate average completion time
    const completionTimes = completedAssignments
      .filter(a => a.completedAt)
      .map(a => {
        const assigned = new Date(a.assignedAt)
        const completed = new Date(a.completedAt!)
        return (completed.getTime() - assigned.getTime()) / (1000 * 60 * 60) // hours
      })

    const averageCompletionTime = completionTimes.length > 0 
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
      : 0

    // Count by status
    const byStatus = Object.values(FormAssignmentStatus).reduce((acc, status) => {
      acc[status] = assignments.filter(a => a.status === status).length
      return acc
    }, {} as Record<FormAssignmentStatus, number>)

    // Count by priority
    const byPriority = ['low', 'medium', 'high', 'urgent'].reduce((acc, priority) => {
      acc[priority] = assignments.filter(a => a.priority === priority).length
      return acc
    }, {} as Record<string, number>)

    // Overdue count
    const overdueCount = assignments.filter(a => a.status === FormAssignmentStatus.OVERDUE).length

    return {
      totalAssigned,
      completionRate,
      averageCompletionTime,
      overdueCount,
      byStatus,
      byPriority,
      clientEngagement: this.calculateClientEngagement(assignments),
      formPerformance: this.calculateFormPerformance(assignments)
    }
  }

  /**
   * Create assignment template
   */
  createAssignmentTemplate(template: Omit<AssignmentTemplate, 'id'>): AssignmentTemplate {
    const newTemplate: AssignmentTemplate = {
      ...template,
      id: this.generateTemplateId()
    }

    this.templates.set(newTemplate.id, newTemplate)
    return newTemplate
  }

  /**
   * Get assignment templates
   */
  getAssignmentTemplates(filters?: {
    appointmentType?: string
    autoAssign?: boolean
  }): AssignmentTemplate[] {
    let templates = Array.from(this.templates.values())

    if (filters?.appointmentType) {
      templates = templates.filter(template => 
        template.appointmentTypes.includes(filters.appointmentType!)
      )
    }

    if (filters?.autoAssign !== undefined) {
      templates = templates.filter(template => 
        template.autoAssign === filters.autoAssign
      )
    }

    return templates
  }

  /**
   * Auto-assign forms based on appointment scheduling
   */
  async autoAssignFormsForAppointment(
    appointmentId: string,
    appointmentType: string,
    clientId: string,
    appointmentDate: string,
    assignedBy: string
  ): Promise<FormAssignment[]> {
    const applicableTemplates = this.getAssignmentTemplates({
      appointmentType,
      autoAssign: true
    })

    const assignments: FormAssignment[] = []

    for (const template of applicableTemplates) {
      // Check template conditions
      if (template.conditions?.minimumDaysBefore) {
        const appointmentDateTime = new Date(appointmentDate)
        const now = new Date()
        const daysDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysDifference < template.conditions.minimumDaysBefore) {
          continue // Skip this template
        }
      }

      // Calculate due date (before appointment)
      const appointmentDateTime = new Date(appointmentDate)
      const dueDate = new Date(appointmentDateTime.getTime() - (template.defaultDueDays * 24 * 60 * 60 * 1000))

      for (const formId of template.formIds) {
        const assignment = await this.createAssignment({
          formId,
          clientId,
          assignedBy,
          dueDate: dueDate.toISOString(),
          priority: template.defaultPriority,
          metadata: {
            appointmentId,
            appointmentType,
            requiredBeforeAppointment: true,
            autoAssign: true,
            templateId: template.id
          },
          settings: template.settings
        })

        assignments.push(assignment)
      }
    }

    return assignments
  }

  /**
   * Private helper methods
   */
  private generateAssignmentId(): string {
    return `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private calculateDueDate(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString()
  }

  private async validateAssignment(assignment: FormAssignment): Promise<void> {
    // Validate required fields
    if (!assignment.formId) throw new Error('Form ID is required')
    if (!assignment.clientId) throw new Error('Client ID is required')
    if (!assignment.assignedBy) throw new Error('Assigned by is required')

    // Validate due date
    if (assignment.dueDate) {
      const dueDate = new Date(assignment.dueDate)
      const now = new Date()
      if (dueDate < now) {
        throw new Error('Due date cannot be in the past')
      }
    }

    // Check for duplicate assignments
    const existingAssignment = Array.from(this.assignments.values())
      .find(a => 
        a.formId === assignment.formId && 
        a.clientId === assignment.clientId && 
        a.status !== FormAssignmentStatus.COMPLETED &&
        a.status !== FormAssignmentStatus.CANCELLED
      )

    if (existingAssignment) {
      throw new Error('Client already has an active assignment for this form')
    }
  }

  private async scheduleNotification(assignmentId: string, type: 'assignment' | 'reminder'): Promise<void> {
    // Implementation would integrate with notification system
    console.log(`Scheduled ${type} notification for assignment ${assignmentId}`)
  }

  private async sendReminder(assignment: FormAssignment): Promise<void> {
    // Implementation would integrate with notification system
    console.log(`Sending reminder for assignment ${assignment.id}`)
  }

  private async cancelReminders(assignmentId: string): Promise<void> {
    // Implementation would cancel scheduled reminders
    console.log(`Cancelled reminders for assignment ${assignmentId}`)
  }

  private async logAssignmentEvent(assignmentId: string, event: string, metadata?: any): Promise<void> {
    // Implementation would log to audit trail
    console.log(`Assignment ${assignmentId}: ${event}`, metadata)
  }

  private calculateClientEngagement(assignments: FormAssignment[]): AssignmentAnalytics['clientEngagement'] {
    const clientStats = new Map<string, {
      assignedCount: number
      completedCount: number
      responseTimes: number[]
      lastActivity: string
    }>()

    assignments.forEach(assignment => {
      if (!clientStats.has(assignment.clientId)) {
        clientStats.set(assignment.clientId, {
          assignedCount: 0,
          completedCount: 0,
          responseTimes: [],
          lastActivity: assignment.assignedAt
        })
      }

      const stats = clientStats.get(assignment.clientId)!
      stats.assignedCount++

      if (assignment.status === FormAssignmentStatus.COMPLETED && assignment.completedAt) {
        stats.completedCount++
        const responseTime = (new Date(assignment.completedAt).getTime() - new Date(assignment.assignedAt).getTime()) / (1000 * 60 * 60)
        stats.responseTimes.push(responseTime)
      }

      if (assignment.completedAt && assignment.completedAt > stats.lastActivity) {
        stats.lastActivity = assignment.completedAt
      }
    })

    return Array.from(clientStats.entries()).map(([clientId, stats]) => ({
      clientId,
      assignedCount: stats.assignedCount,
      completedCount: stats.completedCount,
      averageResponseTime: stats.responseTimes.length > 0 
        ? stats.responseTimes.reduce((sum, time) => sum + time, 0) / stats.responseTimes.length 
        : 0,
      lastActivity: stats.lastActivity
    }))
  }

  private calculateFormPerformance(assignments: FormAssignment[]): AssignmentAnalytics['formPerformance'] {
    const formStats = new Map<string, {
      formName: string
      assignedCount: number
      completedCount: number
      completionTimes: number[]
    }>()

    assignments.forEach(assignment => {
      if (!formStats.has(assignment.formId)) {
        formStats.set(assignment.formId, {
          formName: assignment.formId, // Would be replaced with actual form name
          assignedCount: 0,
          completedCount: 0,
          completionTimes: []
        })
      }

      const stats = formStats.get(assignment.formId)!
      stats.assignedCount++

      if (assignment.status === FormAssignmentStatus.COMPLETED && assignment.completedAt) {
        stats.completedCount++
        const completionTime = (new Date(assignment.completedAt).getTime() - new Date(assignment.assignedAt).getTime()) / (1000 * 60 * 60)
        stats.completionTimes.push(completionTime)
      }
    })

    return Array.from(formStats.entries()).map(([formId, stats]) => ({
      formId,
      formName: stats.formName,
      assignedCount: stats.assignedCount,
      completedCount: stats.completedCount,
      averageCompletionTime: stats.completionTimes.length > 0 
        ? stats.completionTimes.reduce((sum, time) => sum + time, 0) / stats.completionTimes.length 
        : 0,
      dropOffPoints: [] // Would be calculated from form analytics
    }))
  }
}