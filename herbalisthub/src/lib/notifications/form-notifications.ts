/**
 * Form Notification System
 * 
 * Handles automated notifications for form assignments, reminders, and completion updates.
 * Integrates with email, SMS, and in-app notification channels.
 */

import { FormAssignment, FormAssignmentStatus } from "@/lib/forms/assignment-system"

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  channel: NotificationChannel[]
  subject: string
  content: string
  variables: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export enum NotificationType {
  FORM_ASSIGNED = 'form_assigned',
  FORM_REMINDER = 'form_reminder',
  FORM_OVERDUE = 'form_overdue',
  FORM_COMPLETED = 'form_completed',
  FORM_CANCELLED = 'form_cancelled',
  APPOINTMENT_FORM_REMINDER = 'appointment_form_reminder'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
  PUSH = 'push'
}

export interface NotificationRequest {
  recipientId: string
  recipientType: 'client' | 'herbalist' | 'admin'
  templateId?: string
  type: NotificationType
  channels: NotificationChannel[]
  subject: string
  content: string
  variables?: Record<string, any>
  scheduledFor?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  metadata?: {
    assignmentId?: string
    formId?: string
    appointmentId?: string
  }
}

export interface NotificationHistory {
  id: string
  request: NotificationRequest
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled'
  sentAt?: string
  deliveredAt?: string
  failureReason?: string
  retryCount: number
  maxRetries: number
}

export interface NotificationPreferences {
  clientId: string
  emailEnabled: boolean
  smsEnabled: boolean
  inAppEnabled: boolean
  pushEnabled: boolean
  emailAddress?: string
  phoneNumber?: string
  quietHours?: {
    enabled: boolean
    startTime: string // HH:MM format
    endTime: string
    timezone: string
  }
  frequency?: {
    immediate: boolean
    daily: boolean
    weekly: boolean
  }
  formNotifications: {
    assignments: boolean
    reminders: boolean
    completions: boolean
  }
}

export class FormNotificationService {
  private templates: Map<string, NotificationTemplate> = new Map()
  private preferences: Map<string, NotificationPreferences> = new Map()
  private history: Map<string, NotificationHistory> = new Map()

  constructor() {
    this.initializeDefaultTemplates()
  }

  /**
   * Send form assignment notification
   */
  async sendFormAssignmentNotification(assignment: FormAssignment, formName: string): Promise<void> {
    const preferences = this.getClientPreferences(assignment.clientId)
    
    if (!preferences.formNotifications.assignments) {
      console.log(`Client ${assignment.clientId} has disabled assignment notifications`)
      return
    }

    const template = this.getTemplate(NotificationType.FORM_ASSIGNED)
    const channels = this.getEnabledChannels(preferences)

    if (channels.length === 0) {
      console.log(`No enabled notification channels for client ${assignment.clientId}`)
      return
    }

    const variables = {
      clientName: await this.getClientName(assignment.clientId),
      formName,
      dueDate: assignment.dueDate ? this.formatDate(assignment.dueDate) : 'No deadline',
      priority: assignment.priority,
      formUrl: this.generateFormUrl(assignment.formId, assignment.clientId),
      practitionerName: await this.getPractitionerName(assignment.assignedBy),
      estimatedTime: await this.getFormEstimatedTime(assignment.formId)
    }

    const request: NotificationRequest = {
      recipientId: assignment.clientId,
      recipientType: 'client',
      templateId: template.id,
      type: NotificationType.FORM_ASSIGNED,
      channels,
      subject: this.processTemplate(template.subject, variables),
      content: this.processTemplate(template.content, variables),
      variables,
      priority: assignment.priority,
      metadata: {
        assignmentId: assignment.id,
        formId: assignment.formId,
        appointmentId: assignment.metadata.appointmentId
      }
    }

    await this.sendNotification(request)
  }

  /**
   * Send form reminder notification
   */
  async sendFormReminderNotification(assignment: FormAssignment, formName: string): Promise<void> {
    const preferences = this.getClientPreferences(assignment.clientId)
    
    if (!preferences.formNotifications.reminders) {
      console.log(`Client ${assignment.clientId} has disabled reminder notifications`)
      return
    }

    const template = this.getTemplate(NotificationType.FORM_REMINDER)
    const channels = this.getEnabledChannels(preferences)

    if (channels.length === 0) return

    const timeUntilDue = assignment.dueDate 
      ? this.calculateTimeUntilDue(assignment.dueDate)
      : null

    const variables = {
      clientName: await this.getClientName(assignment.clientId),
      formName,
      dueDate: assignment.dueDate ? this.formatDate(assignment.dueDate) : 'No deadline',
      timeUntilDue: timeUntilDue || 'Soon',
      formUrl: this.generateFormUrl(assignment.formId, assignment.clientId),
      practitionerName: await this.getPractitionerName(assignment.assignedBy),
      reminderNumber: assignment.notificationsSent + 1
    }

    const request: NotificationRequest = {
      recipientId: assignment.clientId,
      recipientType: 'client',
      templateId: template.id,
      type: NotificationType.FORM_REMINDER,
      channels,
      subject: this.processTemplate(template.subject, variables),
      content: this.processTemplate(template.content, variables),
      variables,
      priority: this.getReminder_priority(assignment, timeUntilDue),
      metadata: {
        assignmentId: assignment.id,
        formId: assignment.formId
      }
    }

    await this.sendNotification(request)
  }

  /**
   * Send overdue notification
   */
  async sendOverdueNotification(assignment: FormAssignment, formName: string): Promise<void> {
    const preferences = this.getClientPreferences(assignment.clientId)
    const template = this.getTemplate(NotificationType.FORM_OVERDUE)
    const channels = this.getEnabledChannels(preferences)

    if (channels.length === 0) return

    const daysPastDue = assignment.dueDate 
      ? this.calculateDaysPastDue(assignment.dueDate)
      : 0

    const variables = {
      clientName: await this.getClientName(assignment.clientId),
      formName,
      dueDate: assignment.dueDate ? this.formatDate(assignment.dueDate) : 'No deadline',
      daysPastDue: daysPastDue.toString(),
      formUrl: this.generateFormUrl(assignment.formId, assignment.clientId),
      practitionerName: await this.getPractitionerName(assignment.assignedBy)
    }

    const request: NotificationRequest = {
      recipientId: assignment.clientId,
      recipientType: 'client',
      templateId: template.id,
      type: NotificationType.FORM_OVERDUE,
      channels,
      subject: this.processTemplate(template.subject, variables),
      content: this.processTemplate(template.content, variables),
      variables,
      priority: 'high',
      metadata: {
        assignmentId: assignment.id,
        formId: assignment.formId
      }
    }

    await this.sendNotification(request)
  }

  /**
   * Send completion notification to practitioner
   */
  async sendCompletionNotification(assignment: FormAssignment, formName: string): Promise<void> {
    const template = this.getTemplate(NotificationType.FORM_COMPLETED)
    
    const variables = {
      clientName: await this.getClientName(assignment.clientId),
      formName,
      completedAt: assignment.completedAt ? this.formatDateTime(assignment.completedAt) : 'Just now',
      formResponsesUrl: this.generateResponsesUrl(assignment.formId, assignment.clientId),
      practitionerName: await this.getPractitionerName(assignment.assignedBy)
    }

    const request: NotificationRequest = {
      recipientId: assignment.assignedBy,
      recipientType: 'herbalist',
      templateId: template.id,
      type: NotificationType.FORM_COMPLETED,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      subject: this.processTemplate(template.subject, variables),
      content: this.processTemplate(template.content, variables),
      variables,
      priority: 'medium',
      metadata: {
        assignmentId: assignment.id,
        formId: assignment.formId
      }
    }

    await this.sendNotification(request)
  }

  /**
   * Send appointment-specific form reminder
   */
  async sendAppointmentFormReminder(
    assignment: FormAssignment, 
    formName: string, 
    appointmentDate: string
  ): Promise<void> {
    const preferences = this.getClientPreferences(assignment.clientId)
    const template = this.getTemplate(NotificationType.APPOINTMENT_FORM_REMINDER)
    const channels = this.getEnabledChannels(preferences)

    if (channels.length === 0) return

    const variables = {
      clientName: await this.getClientName(assignment.clientId),
      formName,
      appointmentDate: this.formatDateTime(appointmentDate),
      appointmentType: assignment.metadata.appointmentType || 'Appointment',
      formUrl: this.generateFormUrl(assignment.formId, assignment.clientId),
      practitionerName: await this.getPractitionerName(assignment.assignedBy),
      timeUntilAppointment: this.calculateTimeUntilAppointment(appointmentDate)
    }

    const request: NotificationRequest = {
      recipientId: assignment.clientId,
      recipientType: 'client',
      templateId: template.id,
      type: NotificationType.APPOINTMENT_FORM_REMINDER,
      channels,
      subject: this.processTemplate(template.subject, variables),
      content: this.processTemplate(template.content, variables),
      variables,
      priority: 'high',
      metadata: {
        assignmentId: assignment.id,
        formId: assignment.formId,
        appointmentId: assignment.metadata.appointmentId
      }
    }

    await this.sendNotification(request)
  }

  /**
   * Bulk send notifications
   */
  async sendBulkNotifications(requests: NotificationRequest[]): Promise<{
    sent: number
    failed: number
    results: { requestId: string; success: boolean; error?: string }[]
  }> {
    let sent = 0
    let failed = 0
    const results: { requestId: string; success: boolean; error?: string }[] = []

    for (const request of requests) {
      try {
        await this.sendNotification(request)
        sent++
        results.push({ requestId: request.recipientId, success: true })
      } catch (error) {
        failed++
        results.push({ 
          requestId: request.recipientId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return { sent, failed, results }
  }

  /**
   * Manage notification preferences
   */
  updateClientPreferences(clientId: string, preferences: Partial<NotificationPreferences>): void {
    const existing = this.preferences.get(clientId) || this.getDefaultPreferences(clientId)
    const updated = { ...existing, ...preferences }
    this.preferences.set(clientId, updated)
  }

  getClientPreferences(clientId: string): NotificationPreferences {
    return this.preferences.get(clientId) || this.getDefaultPreferences(clientId)
  }

  /**
   * Template management
   */
  createTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): NotificationTemplate {
    const newTemplate: NotificationTemplate = {
      ...template,
      id: this.generateTemplateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.templates.set(newTemplate.id, newTemplate)
    return newTemplate
  }

  updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): void {
    const template = this.templates.get(templateId)
    if (!template) throw new Error(`Template ${templateId} not found`)

    const updated = {
      ...template,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    this.templates.set(templateId, updated)
  }

  getTemplate(type: NotificationType): NotificationTemplate {
    const template = Array.from(this.templates.values())
      .find(t => t.type === type && t.isActive)
    
    if (!template) {
      throw new Error(`No active template found for type: ${type}`)
    }

    return template
  }

  /**
   * Notification history and analytics
   */
  getNotificationHistory(filters?: {
    recipientId?: string
    type?: NotificationType
    status?: string
    dateRange?: { start: string; end: string }
  }): NotificationHistory[] {
    let history = Array.from(this.history.values())

    if (filters?.recipientId) {
      history = history.filter(h => h.request.recipientId === filters.recipientId)
    }

    if (filters?.type) {
      history = history.filter(h => h.request.type === filters.type)
    }

    if (filters?.status) {
      history = history.filter(h => h.status === filters.status)
    }

    if (filters?.dateRange) {
      const start = new Date(filters.dateRange.start)
      const end = new Date(filters.dateRange.end)
      history = history.filter(h => {
        const sentDate = h.sentAt ? new Date(h.sentAt) : new Date()
        return sentDate >= start && sentDate <= end
      })
    }

    return history.sort((a, b) => {
      const aDate = a.sentAt || '0'
      const bDate = b.sentAt || '0'
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })
  }

  /**
   * Private methods
   */
  private async sendNotification(request: NotificationRequest): Promise<void> {
    const historyId = this.generateHistoryId()
    
    // Create history record
    const history: NotificationHistory = {
      id: historyId,
      request,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3
    }

    this.history.set(historyId, history)

    try {
      // Check quiet hours
      if (request.recipientType === 'client') {
        const preferences = this.getClientPreferences(request.recipientId)
        if (this.isInQuietHours(preferences)) {
          // Schedule for later
          const nextAvailableTime = this.getNextAvailableTime(preferences)
          request.scheduledFor = nextAvailableTime
          history.status = 'pending'
          this.history.set(historyId, history)
          return
        }
      }

      // Send notifications through each channel
      for (const channel of request.channels) {
        await this.sendThroughChannel(request, channel)
      }

      // Update history
      history.status = 'sent'
      history.sentAt = new Date().toISOString()
      this.history.set(historyId, history)

    } catch (error) {
      history.status = 'failed'
      history.failureReason = error instanceof Error ? error.message : 'Unknown error'
      this.history.set(historyId, history)
      throw error
    }
  }

  private async sendThroughChannel(request: NotificationRequest, channel: NotificationChannel): Promise<void> {
    switch (channel) {
      case NotificationChannel.EMAIL:
        await this.sendEmail(request)
        break
      case NotificationChannel.SMS:
        await this.sendSMS(request)
        break
      case NotificationChannel.IN_APP:
        await this.sendInAppNotification(request)
        break
      case NotificationChannel.PUSH:
        await this.sendPushNotification(request)
        break
    }
  }

  private async sendEmail(request: NotificationRequest): Promise<void> {
    // Implementation would integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`Sending email to ${request.recipientId}:`, {
      subject: request.subject,
      content: request.content
    })
  }

  private async sendSMS(request: NotificationRequest): Promise<void> {
    // Implementation would integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`Sending SMS to ${request.recipientId}:`, request.content)
  }

  private async sendInAppNotification(request: NotificationRequest): Promise<void> {
    // Implementation would create in-app notification record
    console.log(`Creating in-app notification for ${request.recipientId}:`, request.content)
  }

  private async sendPushNotification(request: NotificationRequest): Promise<void> {
    // Implementation would send push notification
    console.log(`Sending push notification to ${request.recipientId}:`, request.content)
  }

  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      processed = processed.replace(regex, String(value))
    })

    return processed
  }

  private getEnabledChannels(preferences: NotificationPreferences): NotificationChannel[] {
    const channels: NotificationChannel[] = []
    
    if (preferences.emailEnabled && preferences.emailAddress) {
      channels.push(NotificationChannel.EMAIL)
    }
    
    if (preferences.smsEnabled && preferences.phoneNumber) {
      channels.push(NotificationChannel.SMS)
    }
    
    if (preferences.inAppEnabled) {
      channels.push(NotificationChannel.IN_APP)
    }
    
    if (preferences.pushEnabled) {
      channels.push(NotificationChannel.PUSH)
    }

    return channels
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours?.enabled) return false

    const now = new Date()
    const startTime = this.parseTime(preferences.quietHours.startTime)
    const endTime = this.parseTime(preferences.quietHours.endTime)

    // Handle timezone conversion if needed
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = currentHour * 60 + currentMinute

    return currentTime >= startTime && currentTime <= endTime
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  }

  private getNextAvailableTime(preferences: NotificationPreferences): string {
    if (!preferences.quietHours?.enabled) {
      return new Date().toISOString()
    }

    const now = new Date()
    const endTime = this.parseTime(preferences.quietHours.endTime)
    const endHour = Math.floor(endTime / 60)
    const endMinute = endTime % 60

    const nextAvailable = new Date(now)
    nextAvailable.setHours(endHour, endMinute, 0, 0)

    if (nextAvailable <= now) {
      nextAvailable.setDate(nextAvailable.getDate() + 1)
    }

    return nextAvailable.toISOString()
  }

  private getReminder_priority(assignment: FormAssignment, timeUntilDue: string | null): 'low' | 'medium' | 'high' | 'urgent' {
    if (!timeUntilDue) return assignment.priority

    if (timeUntilDue.includes('hour')) return 'urgent'
    if (timeUntilDue.includes('1 day')) return 'high'
    if (timeUntilDue.includes('day')) return 'medium'
    
    return assignment.priority
  }

  private calculateTimeUntilDue(dueDate: string): string {
    const due = new Date(dueDate)
    const now = new Date()
    const diffMs = due.getTime() - now.getTime()
    
    if (diffMs < 0) return 'Overdue'
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`
    } else {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`
    }
  }

  private calculateDaysPastDue(dueDate: string): number {
    const due = new Date(dueDate)
    const now = new Date()
    const diffMs = now.getTime() - due.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }

  private calculateTimeUntilAppointment(appointmentDate: string): string {
    const appointment = new Date(appointmentDate)
    const now = new Date()
    const diffMs = appointment.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`
    } else {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`
    }
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString()
  }

  private formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString()
  }

  private generateFormUrl(formId: string, clientId: string): string {
    return `${process.env.NEXT_PUBLIC_APP_URL}/forms/${formId}?client=${clientId}`
  }

  private generateResponsesUrl(formId: string, clientId: string): string {
    return `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/forms/${formId}/responses?client=${clientId}`
  }

  private async getClientName(clientId: string): Promise<string> {
    // Implementation would fetch from database
    return `Client ${clientId}`
  }

  private async getPractitionerName(practitionerId: string): Promise<string> {
    // Implementation would fetch from database
    return `Dr. ${practitionerId}`
  }

  private async getFormEstimatedTime(formId: string): Promise<string> {
    // Implementation would fetch from database
    return '10-15 minutes'
  }

  private getDefaultPreferences(clientId: string): NotificationPreferences {
    return {
      clientId,
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      pushEnabled: true,
      formNotifications: {
        assignments: true,
        reminders: true,
        completions: false
      }
    }
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateHistoryId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeDefaultTemplates(): void {
    // Form Assignment Template
    this.createTemplate({
      name: 'Form Assignment',
      type: NotificationType.FORM_ASSIGNED,
      channel: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      subject: 'New Form Assignment from {{practitionerName}}',
      content: `Hi {{clientName}},

You have been assigned a new form: "{{formName}}"

Please complete this form by {{dueDate}}. The estimated completion time is {{estimatedTime}}.

Priority: {{priority}}

Click here to complete the form: {{formUrl}}

If you have any questions, please contact {{practitionerName}}.

Best regards,
Your Healthcare Team`,
      variables: ['clientName', 'formName', 'dueDate', 'estimatedTime', 'priority', 'formUrl', 'practitionerName'],
      isActive: true
    })

    // Form Reminder Template
    this.createTemplate({
      name: 'Form Reminder',
      type: NotificationType.FORM_REMINDER,
      channel: [NotificationChannel.EMAIL, NotificationChannel.SMS],
      subject: 'Reminder: Please complete "{{formName}}"',
      content: `Hi {{clientName}},

This is reminder #{{reminderNumber}} about your pending form: "{{formName}}"

Due: {{dueDate}} ({{timeUntilDue}} remaining)

Complete your form here: {{formUrl}}

Thank you,
{{practitionerName}}`,
      variables: ['clientName', 'formName', 'dueDate', 'timeUntilDue', 'formUrl', 'practitionerName', 'reminderNumber'],
      isActive: true
    })

    // Overdue Template
    this.createTemplate({
      name: 'Form Overdue',
      type: NotificationType.FORM_OVERDUE,
      channel: [NotificationChannel.EMAIL, NotificationChannel.SMS],
      subject: 'URGENT: Overdue Form - "{{formName}}"',
      content: `Hi {{clientName}},

Your form "{{formName}}" is now {{daysPastDue}} day(s) overdue.

Original due date: {{dueDate}}

Please complete it as soon as possible: {{formUrl}}

If you need assistance, please contact {{practitionerName}} immediately.

Urgent regards,
{{practitionerName}}`,
      variables: ['clientName', 'formName', 'daysPastDue', 'dueDate', 'formUrl', 'practitionerName'],
      isActive: true
    })

    // Completion Notification Template
    this.createTemplate({
      name: 'Form Completed',
      type: NotificationType.FORM_COMPLETED,
      channel: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      subject: 'Form Completed: {{clientName}} - {{formName}}',
      content: `{{clientName}} has completed the form "{{formName}}" at {{completedAt}}.

View responses: {{formResponsesUrl}}

Best regards,
System Notification`,
      variables: ['clientName', 'formName', 'completedAt', 'formResponsesUrl'],
      isActive: true
    })

    // Appointment Form Reminder Template
    this.createTemplate({
      name: 'Appointment Form Reminder',
      type: NotificationType.APPOINTMENT_FORM_REMINDER,
      channel: [NotificationChannel.EMAIL, NotificationChannel.SMS],
      subject: 'Complete Form Before Your {{appointmentType}}',
      content: `Hi {{clientName}},

You have an upcoming {{appointmentType}} with {{practitionerName}} in {{timeUntilAppointment}}.

Please complete the required form "{{formName}}" before your appointment: {{formUrl}}

Appointment: {{appointmentDate}}

Thank you,
{{practitionerName}}`,
      variables: ['clientName', 'appointmentType', 'practitionerName', 'timeUntilAppointment', 'formName', 'formUrl', 'appointmentDate'],
      isActive: true
    })
  }
}