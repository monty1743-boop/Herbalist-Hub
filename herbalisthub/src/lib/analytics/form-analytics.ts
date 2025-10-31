import { z } from 'zod'

export interface FormAnalyticsData {
  formId: string
  formName: string
  period: {
    start: string
    end: string
  }
  overview: {
    totalAssignments: number
    totalSubmissions: number
    completionRate: number
    averageCompletionTime: number // in minutes
    abandonmentRate: number
    uniqueUsers: number
  }
  completion: {
    byDate: Array<{
      date: string
      assignments: number
      submissions: number
      completionRate: number
    }>
    byTimeOfDay: Array<{
      hour: number
      submissions: number
      averageTime: number
    }>
    byDayOfWeek: Array<{
      day: string
      submissions: number
      completionRate: number
    }>
  }
  performance: {
    fieldAnalytics: Array<{
      fieldId: string
      fieldName: string
      fieldType: string
      completionRate: number
      averageTime: number
      dropOffRate: number
      validationErrors: number
    }>
    sectionAnalytics: Array<{
      sectionId: string
      sectionName: string
      completionRate: number
      averageTime: number
      dropOffRate: number
    }>
    progressFlow: Array<{
      step: number
      stepName: string
      reached: number
      completed: number
      dropped: number
      averageTime: number
    }>
  }
  engagement: {
    deviceTypes: Array<{
      type: string
      count: number
      completionRate: number
    }>
    browsers: Array<{
      browser: string
      count: number
      completionRate: number
    }>
    sessionDuration: {
      average: number
      median: number
      min: number
      max: number
      distribution: Array<{
        range: string
        count: number
      }>
    }
    returningUsers: {
      firstTimeUsers: number
      returningUsers: number
      multipleSubmissions: number
    }
  }
  optimization: {
    recommendations: Array<{
      type: 'reduce_fields' | 'improve_validation' | 'simplify_language' | 'add_progress_indicator' | 'optimize_mobile'
      priority: 'low' | 'medium' | 'high'
      title: string
      description: string
      expectedImpact: string
      effort: 'low' | 'medium' | 'high'
    }>
    abtests: Array<{
      testId: string
      name: string
      status: 'active' | 'completed' | 'paused'
      variants: Array<{
        name: string
        traffic: number
        conversions: number
        conversionRate: number
      }>
      startDate: string
      endDate?: string
    }>
  }
  trends: {
    completionRateTrend: {
      direction: 'up' | 'down' | 'stable'
      percentage: number
      period: string
    }
    volumeTrend: {
      direction: 'up' | 'down' | 'stable'
      percentage: number
      period: string
    }
    qualityTrend: {
      direction: 'up' | 'down' | 'stable'
      percentage: number
      period: string
    }
  }
}

export interface CompletionTrackingData {
  submissionId: string
  formId: string
  clientId: string
  practitionerId: string
  assignmentId?: string
  startedAt: string
  lastActivity: string
  completedAt?: string
  currentStep: number
  totalSteps: number
  progress: number // 0-100
  timeSpent: number // in seconds
  fieldProgress: Record<string, {
    visited: boolean
    completed: boolean
    timeSpent: number
    attempts: number
    lastModified: string
  }>
  sessionData: {
    deviceType: string
    browser: string
    ipAddress?: string
    userAgent?: string
    screenResolution?: string
    timezone?: string
  }
  events: Array<{
    timestamp: string
    type: 'field_focus' | 'field_blur' | 'field_change' | 'validation_error' | 'section_enter' | 'section_exit' | 'form_save' | 'form_submit'
    fieldId?: string
    sectionId?: string
    value?: any
    error?: string
    metadata?: Record<string, any>
  }>
}

export interface AnalyticsQuery {
  formIds?: string[]
  practitionerId?: string
  clientIds?: string[]
  dateRange: {
    start: string
    end: string
  }
  groupBy?: 'day' | 'week' | 'month'
  includeIncomplete?: boolean
  filters?: {
    deviceType?: string
    browser?: string
    completionStatus?: 'completed' | 'incomplete' | 'abandoned'
    assignmentSource?: string
  }
}

export interface AnalyticsReport {
  id: string
  name: string
  description: string
  type: 'completion' | 'performance' | 'engagement' | 'optimization' | 'custom'
  practitionerId: string
  formIds: string[]
  dateRange: {
    start: string
    end: string
  }
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string
    timezone: string
    enabled: boolean
  }
  recipients: Array<{
    email: string
    role: string
  }>
  createdAt: string
  lastGenerated?: string
  nextGeneration?: string
}

/**
 * Form Analytics Engine
 * Provides comprehensive analytics and insights for form performance and user behavior
 */
export class FormAnalyticsEngine {
  
  /**
   * Generate comprehensive analytics for a form
   */
  static async generateFormAnalytics(
    formId: string,
    practitionerId: string,
    dateRange: { start: string; end: string }
  ): Promise<FormAnalyticsData> {
    try {
      // Get form metadata
      const formMetadata = await this.getFormMetadata(formId)
      
      // Get completion tracking data
      const trackingData = await this.getCompletionTrackingData({
        formIds: [formId],
        practitionerId,
        dateRange,
        includeIncomplete: true
      })

      // Get assignment data
      const assignmentData = await this.getAssignmentData(formId, practitionerId, dateRange)

      // Calculate overview metrics
      const overview = await this.calculateOverviewMetrics(trackingData, assignmentData)

      // Calculate completion patterns
      const completion = await this.calculateCompletionPatterns(trackingData, dateRange)

      // Calculate performance metrics
      const performance = await this.calculatePerformanceMetrics(trackingData, formMetadata)

      // Calculate engagement metrics
      const engagement = await this.calculateEngagementMetrics(trackingData)

      // Generate optimization recommendations
      const optimization = await this.generateOptimizationRecommendations(
        trackingData,
        formMetadata,
        overview
      )

      // Calculate trends
      const trends = await this.calculateTrends(formId, practitionerId, dateRange)

      return {
        formId,
        formName: formMetadata.name,
        period: dateRange,
        overview,
        completion,
        performance,
        engagement,
        optimization,
        trends
      }

    } catch (error) {
      console.error('Error generating form analytics:', error)
      throw error
    }
  }

  /**
   * Track form completion progress in real-time
   */
  static async trackFormProgress(
    submissionId: string,
    event: {
      type: string
      fieldId?: string
      sectionId?: string
      value?: any
      error?: string
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    try {
      // Get current tracking data
      const currentTracking = await this.getCompletionTracking(submissionId)
      if (!currentTracking) {
        throw new Error('Completion tracking not found')
      }

      // Update tracking data based on event
      const updatedTracking = await this.updateTrackingData(currentTracking, event)

      // Store updated tracking data
      await this.storeCompletionTracking(updatedTracking)

      // Check for completion milestones
      await this.checkCompletionMilestones(updatedTracking)

    } catch (error) {
      console.error('Error tracking form progress:', error)
      throw error
    }
  }

  /**
   * Start completion tracking for a new form session
   */
  static async startCompletionTracking(data: {
    submissionId: string
    formId: string
    clientId: string
    practitionerId: string
    assignmentId?: string
    sessionData: CompletionTrackingData['sessionData']
  }): Promise<CompletionTrackingData> {
    try {
      // Get form metadata to determine total steps
      const formMetadata = await this.getFormMetadata(data.formId)
      const totalSteps = this.calculateTotalSteps(formMetadata)

      const trackingData: CompletionTrackingData = {
        submissionId: data.submissionId,
        formId: data.formId,
        clientId: data.clientId,
        practitionerId: data.practitionerId,
        assignmentId: data.assignmentId,
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        currentStep: 0,
        totalSteps,
        progress: 0,
        timeSpent: 0,
        fieldProgress: {},
        sessionData: data.sessionData,
        events: [{
          timestamp: new Date().toISOString(),
          type: 'form_start',
          metadata: { formId: data.formId }
        }]
      }

      // Initialize field progress
      if (formMetadata.sections) {
        formMetadata.sections.forEach((section: any) => {
          if (section.fields) {
            section.fields.forEach((field: any) => {
              trackingData.fieldProgress[field.id] = {
                visited: false,
                completed: false,
                timeSpent: 0,
                attempts: 0,
                lastModified: ''
              }
            })
          }
        })
      }

      // Store initial tracking data
      await this.storeCompletionTracking(trackingData)

      return trackingData
    } catch (error) {
      console.error('Error starting completion tracking:', error)
      throw error
    }
  }

  /**
   * Complete form tracking
   */
  static async completeFormTracking(
    submissionId: string,
    completionData: {
      responses: Record<string, any>
      timeSpent: number
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    try {
      const trackingData = await this.getCompletionTracking(submissionId)
      if (!trackingData) {
        throw new Error('Completion tracking not found')
      }

      // Update tracking data for completion
      trackingData.completedAt = new Date().toISOString()
      trackingData.lastActivity = new Date().toISOString()
      trackingData.timeSpent = completionData.timeSpent
      trackingData.progress = 100
      trackingData.currentStep = trackingData.totalSteps

      // Add completion event
      trackingData.events.push({
        timestamp: new Date().toISOString(),
        type: 'form_submit',
        metadata: {
          totalTime: completionData.timeSpent,
          fieldCount: Object.keys(completionData.responses).length,
          ...completionData.metadata
        }
      })

      // Mark all fields as completed
      Object.keys(completionData.responses).forEach(fieldId => {
        if (trackingData.fieldProgress[fieldId]) {
          trackingData.fieldProgress[fieldId].completed = true
          trackingData.fieldProgress[fieldId].lastModified = new Date().toISOString()
        }
      })

      // Store final tracking data
      await this.storeCompletionTracking(trackingData)

      // Generate completion analytics
      await this.processCompletionAnalytics(trackingData)

    } catch (error) {
      console.error('Error completing form tracking:', error)
      throw error
    }
  }

  /**
   * Get analytics for multiple forms
   */
  static async getMultiFormAnalytics(query: AnalyticsQuery): Promise<{
    summary: {
      totalForms: number
      totalSubmissions: number
      averageCompletionRate: number
      totalTimeSpent: number
    }
    formComparison: Array<{
      formId: string
      formName: string
      submissions: number
      completionRate: number
      averageTime: number
      rank: number
    }>
    trends: Array<{
      date: string
      submissions: number
      completions: number
      completionRate: number
    }>
  }> {
    try {
      const trackingData = await this.getCompletionTrackingData(query)
      const formsData = await this.getFormsMetadata(query.formIds || [])

      // Calculate summary metrics
      const completedSubmissions = trackingData.filter(t => t.completedAt)
      const summary = {
        totalForms: formsData.length,
        totalSubmissions: trackingData.length,
        averageCompletionRate: trackingData.length > 0 ? 
          (completedSubmissions.length / trackingData.length) * 100 : 0,
        totalTimeSpent: trackingData.reduce((sum, t) => sum + t.timeSpent, 0)
      }

      // Calculate form comparison
      const formComparison = formsData.map(form => {
        const formSubmissions = trackingData.filter(t => t.formId === form.id)
        const formCompletions = formSubmissions.filter(t => t.completedAt)
        const completionRate = formSubmissions.length > 0 ? 
          (formCompletions.length / formSubmissions.length) * 100 : 0
        const averageTime = formCompletions.length > 0 ?
          formCompletions.reduce((sum, t) => sum + t.timeSpent, 0) / formCompletions.length : 0

        return {
          formId: form.id,
          formName: form.name,
          submissions: formSubmissions.length,
          completionRate,
          averageTime: averageTime / 60, // Convert to minutes
          rank: 0 // Will be calculated after sorting
        }
      }).sort((a, b) => b.completionRate - a.completionRate)
      .map((form, index) => ({ ...form, rank: index + 1 }))

      // Calculate trends
      const trends = await this.calculateMultiFormTrends(trackingData, query.dateRange, query.groupBy || 'day')

      return {
        summary,
        formComparison,
        trends
      }

    } catch (error) {
      console.error('Error getting multi-form analytics:', error)
      throw error
    }
  }

  /**
   * Generate automated analytics report
   */
  static async generateAnalyticsReport(reportConfig: AnalyticsReport): Promise<{
    report: any
    format: 'json' | 'pdf' | 'csv'
    generatedAt: string
  }> {
    try {
      const analytics = await Promise.all(
        reportConfig.formIds.map(formId => 
          this.generateFormAnalytics(formId, reportConfig.practitionerId, reportConfig.dateRange)
        )
      )

      const multiFormAnalytics = await this.getMultiFormAnalytics({
        formIds: reportConfig.formIds,
        practitionerId: reportConfig.practitionerId,
        dateRange: reportConfig.dateRange
      })

      const report = {
        id: reportConfig.id,
        name: reportConfig.name,
        description: reportConfig.description,
        generatedAt: new Date().toISOString(),
        dateRange: reportConfig.dateRange,
        summary: multiFormAnalytics.summary,
        forms: analytics,
        trends: multiFormAnalytics.trends,
        insights: await this.generateReportInsights(analytics, multiFormAnalytics),
        recommendations: await this.generateReportRecommendations(analytics)
      }

      // Update report generation timestamp
      await this.updateReportGeneration(reportConfig.id)

      return {
        report,
        format: 'json', // Could be configurable
        generatedAt: new Date().toISOString()
      }

    } catch (error) {
      console.error('Error generating analytics report:', error)
      throw error
    }
  }

  // Private helper methods

  private static async getFormMetadata(formId: string): Promise<any> {
    const response = await fetch(`/api/intake-forms/${formId}`)
    if (!response.ok) {
      throw new Error('Failed to get form metadata')
    }
    return await response.json()
  }

  private static async getCompletionTrackingData(query: AnalyticsQuery): Promise<CompletionTrackingData[]> {
    const queryParams = new URLSearchParams()
    
    Object.entries(query).forEach(([key, value]) => {
      if (value != null) {
        if (typeof value === 'object' && 'start' in value) {
          queryParams.append(`${key}.start`, value.start)
          queryParams.append(`${key}.end`, value.end)
        } else if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, String(v)))
        } else {
          queryParams.append(key, String(value))
        }
      }
    })

    const response = await fetch(`/api/analytics/completion-tracking?${queryParams}`)
    if (!response.ok) {
      throw new Error('Failed to get completion tracking data')
    }
    return await response.json()
  }

  private static async getAssignmentData(
    formId: string,
    practitionerId: string,
    dateRange: { start: string; end: string }
  ): Promise<any[]> {
    const queryParams = new URLSearchParams({
      formId,
      practitionerId,
      'dateRange.start': dateRange.start,
      'dateRange.end': dateRange.end
    })

    const response = await fetch(`/api/form-assignments?${queryParams}`)
    if (!response.ok) {
      throw new Error('Failed to get assignment data')
    }
    return await response.json()
  }

  private static async calculateOverviewMetrics(
    trackingData: CompletionTrackingData[],
    assignmentData: any[]
  ): Promise<FormAnalyticsData['overview']> {
    const totalSubmissions = trackingData.length
    const completedSubmissions = trackingData.filter(t => t.completedAt).length
    const abandonedSubmissions = trackingData.filter(t => !t.completedAt && t.timeSpent > 30).length // Spent more than 30 seconds
    
    const completionRate = totalSubmissions > 0 ? (completedSubmissions / totalSubmissions) * 100 : 0
    const abandonmentRate = totalSubmissions > 0 ? (abandonedSubmissions / totalSubmissions) * 100 : 0
    
    const averageCompletionTime = completedSubmissions > 0 ?
      trackingData.filter(t => t.completedAt)
        .reduce((sum, t) => sum + t.timeSpent, 0) / completedSubmissions / 60 : 0 // Convert to minutes

    const uniqueUsers = new Set(trackingData.map(t => t.clientId)).size

    return {
      totalAssignments: assignmentData.length,
      totalSubmissions,
      completionRate,
      averageCompletionTime,
      abandonmentRate,
      uniqueUsers
    }
  }

  private static async calculateCompletionPatterns(
    trackingData: CompletionTrackingData[],
    dateRange: { start: string; end: string }
  ): Promise<FormAnalyticsData['completion']> {
    // By date
    const dateMap = new Map<string, { assignments: number; submissions: number; completions: number }>()
    
    trackingData.forEach(t => {
      const date = t.startedAt.split('T')[0]
      const current = dateMap.get(date) || { assignments: 0, submissions: 0, completions: 0 }
      current.submissions++
      if (t.completedAt) current.completions++
      dateMap.set(date, current)
    })

    const byDate = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      assignments: data.assignments,
      submissions: data.submissions,
      completionRate: data.submissions > 0 ? (data.completions / data.submissions) * 100 : 0
    }))

    // By time of day
    const hourMap = new Map<number, { submissions: number; totalTime: number }>()
    
    trackingData.forEach(t => {
      const hour = new Date(t.startedAt).getHours()
      const current = hourMap.get(hour) || { submissions: 0, totalTime: 0 }
      current.submissions++
      current.totalTime += t.timeSpent
      hourMap.set(hour, current)
    })

    const byTimeOfDay = Array.from(hourMap.entries()).map(([hour, data]) => ({
      hour,
      submissions: data.submissions,
      averageTime: data.submissions > 0 ? data.totalTime / data.submissions / 60 : 0 // Convert to minutes
    }))

    // By day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayMap = new Map<string, { submissions: number; completions: number }>()
    
    trackingData.forEach(t => {
      const dayName = dayNames[new Date(t.startedAt).getDay()]
      const current = dayMap.get(dayName) || { submissions: 0, completions: 0 }
      current.submissions++
      if (t.completedAt) current.completions++
      dayMap.set(dayName, current)
    })

    const byDayOfWeek = dayNames.map(day => {
      const data = dayMap.get(day) || { submissions: 0, completions: 0 }
      return {
        day,
        submissions: data.submissions,
        completionRate: data.submissions > 0 ? (data.completions / data.submissions) * 100 : 0
      }
    })

    return {
      byDate,
      byTimeOfDay,
      byDayOfWeek
    }
  }

  private static async calculatePerformanceMetrics(
    trackingData: CompletionTrackingData[],
    formMetadata: any
  ): Promise<FormAnalyticsData['performance']> {
    // Field analytics
    const fieldAnalytics: Array<any> = []
    
    if (formMetadata.sections) {
      formMetadata.sections.forEach((section: any) => {
        if (section.fields) {
          section.fields.forEach((field: any) => {
            const fieldData = trackingData.map(t => t.fieldProgress[field.id]).filter(Boolean)
            const visited = fieldData.filter(f => f.visited).length
            const completed = fieldData.filter(f => f.completed).length
            const totalTime = fieldData.reduce((sum, f) => sum + f.timeSpent, 0)
            const validationErrors = trackingData.reduce((sum, t) => {
              return sum + t.events.filter(e => e.type === 'validation_error' && e.fieldId === field.id).length
            }, 0)

            fieldAnalytics.push({
              fieldId: field.id,
              fieldName: field.label || field.id,
              fieldType: field.type,
              completionRate: visited > 0 ? (completed / visited) * 100 : 0,
              averageTime: completed > 0 ? totalTime / completed : 0,
              dropOffRate: visited > 0 ? ((visited - completed) / visited) * 100 : 0,
              validationErrors
            })
          })
        }
      })
    }

    // Section analytics
    const sectionAnalytics: Array<any> = []
    
    if (formMetadata.sections) {
      formMetadata.sections.forEach((section: any) => {
        const sectionEvents = trackingData.reduce((events, t) => {
          return events.concat(t.events.filter(e => e.sectionId === section.id))
        }, [] as any[])

        const enters = sectionEvents.filter(e => e.type === 'section_enter').length
        const exits = sectionEvents.filter(e => e.type === 'section_exit').length

        sectionAnalytics.push({
          sectionId: section.id,
          sectionName: section.title || section.id,
          completionRate: enters > 0 ? (exits / enters) * 100 : 0,
          averageTime: 0, // Would calculate from enter/exit events
          dropOffRate: enters > 0 ? ((enters - exits) / enters) * 100 : 0
        })
      })
    }

    // Progress flow
    const maxSteps = Math.max(...trackingData.map(t => t.totalSteps))
    const progressFlow: Array<any> = []
    
    for (let step = 1; step <= maxSteps; step++) {
      const reached = trackingData.filter(t => t.currentStep >= step).length
      const completed = trackingData.filter(t => t.currentStep > step).length
      const dropped = reached - completed

      progressFlow.push({
        step,
        stepName: `Step ${step}`,
        reached,
        completed,
        dropped,
        averageTime: 0 // Would calculate from step timing
      })
    }

    return {
      fieldAnalytics,
      sectionAnalytics,
      progressFlow
    }
  }

  private static async calculateEngagementMetrics(
    trackingData: CompletionTrackingData[]
  ): Promise<FormAnalyticsData['engagement']> {
    // Device types
    const deviceCounts = new Map<string, { count: number; completions: number }>()
    trackingData.forEach(t => {
      const device = t.sessionData.deviceType
      const current = deviceCounts.get(device) || { count: 0, completions: 0 }
      current.count++
      if (t.completedAt) current.completions++
      deviceCounts.set(device, current)
    })

    const deviceTypes = Array.from(deviceCounts.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      completionRate: data.count > 0 ? (data.completions / data.count) * 100 : 0
    }))

    // Browsers
    const browserCounts = new Map<string, { count: number; completions: number }>()
    trackingData.forEach(t => {
      const browser = t.sessionData.browser
      const current = browserCounts.get(browser) || { count: 0, completions: 0 }
      current.count++
      if (t.completedAt) current.completions++
      browserCounts.set(browser, current)
    })

    const browsers = Array.from(browserCounts.entries()).map(([browser, data]) => ({
      browser,
      count: data.count,
      completionRate: data.count > 0 ? (data.completions / data.count) * 100 : 0
    }))

    // Session duration
    const durations = trackingData.map(t => t.timeSpent).sort((a, b) => a - b)
    const sessionDuration = {
      average: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
      median: durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0,
      min: durations.length > 0 ? Math.min(...durations) : 0,
      max: durations.length > 0 ? Math.max(...durations) : 0,
      distribution: [
        { range: '0-1 min', count: durations.filter(d => d <= 60).length },
        { range: '1-5 min', count: durations.filter(d => d > 60 && d <= 300).length },
        { range: '5-15 min', count: durations.filter(d => d > 300 && d <= 900).length },
        { range: '15+ min', count: durations.filter(d => d > 900).length }
      ]
    }

    // Returning users (simplified - would need more sophisticated tracking)
    const uniqueUsers = new Set(trackingData.map(t => t.clientId))
    const returningUsers = {
      firstTimeUsers: uniqueUsers.size, // Simplified
      returningUsers: 0, // Would need historical data
      multipleSubmissions: trackingData.length - uniqueUsers.size
    }

    return {
      deviceTypes,
      browsers,
      sessionDuration,
      returningUsers
    }
  }

  private static async generateOptimizationRecommendations(
    trackingData: CompletionTrackingData[],
    formMetadata: any,
    overview: FormAnalyticsData['overview']
  ): Promise<FormAnalyticsData['optimization']> {
    const recommendations: Array<any> = []

    // Check completion rate
    if (overview.completionRate < 50) {
      recommendations.push({
        type: 'reduce_fields',
        priority: 'high',
        title: 'Reduce Form Length',
        description: 'Your form has a low completion rate. Consider reducing the number of fields or breaking it into multiple shorter forms.',
        expectedImpact: 'Could improve completion rate by 15-25%',
        effort: 'medium'
      })
    }

    // Check validation errors
    const totalValidationErrors = trackingData.reduce((sum, t) => {
      return sum + t.events.filter(e => e.type === 'validation_error').length
    }, 0)

    if (totalValidationErrors > trackingData.length * 0.5) {
      recommendations.push({
        type: 'improve_validation',
        priority: 'high',
        title: 'Improve Field Validation',
        description: 'Users are encountering many validation errors. Consider improving error messages and field guidance.',
        expectedImpact: 'Could reduce abandonment by 10-20%',
        effort: 'low'
      })
    }

    // Check mobile completion rate
    const mobileTracking = trackingData.filter(t => t.sessionData.deviceType === 'mobile')
    const mobileCompletionRate = mobileTracking.length > 0 ?
      (mobileTracking.filter(t => t.completedAt).length / mobileTracking.length) * 100 : 0

    if (mobileCompletionRate < overview.completionRate - 20) {
      recommendations.push({
        type: 'optimize_mobile',
        priority: 'medium',
        title: 'Optimize for Mobile',
        description: 'Mobile users have significantly lower completion rates. Consider improving mobile experience.',
        expectedImpact: 'Could improve mobile completion by 20-30%',
        effort: 'high'
      })
    }

    return {
      recommendations,
      abtests: [] // Would include any active A/B tests
    }
  }

  private static async calculateTrends(
    formId: string,
    practitionerId: string,
    dateRange: { start: string; end: string }
  ): Promise<FormAnalyticsData['trends']> {
    // Get historical data for comparison
    const currentPeriodDays = Math.ceil(
      (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)
    )

    const previousStart = new Date(new Date(dateRange.start).getTime() - currentPeriodDays * 24 * 60 * 60 * 1000)
    const previousEnd = new Date(dateRange.start)

    const [currentData, previousData] = await Promise.all([
      this.getCompletionTrackingData({
        formIds: [formId],
        practitionerId,
        dateRange,
        includeIncomplete: true
      }),
      this.getCompletionTrackingData({
        formIds: [formId],
        practitionerId,
        dateRange: {
          start: previousStart.toISOString(),
          end: previousEnd.toISOString()
        },
        includeIncomplete: true
      })
    ])

    // Calculate completion rate trend
    const currentCompletionRate = currentData.length > 0 ?
      (currentData.filter(t => t.completedAt).length / currentData.length) * 100 : 0
    const previousCompletionRate = previousData.length > 0 ?
      (previousData.filter(t => t.completedAt).length / previousData.length) * 100 : 0

    const completionRateChange = previousCompletionRate > 0 ?
      ((currentCompletionRate - previousCompletionRate) / previousCompletionRate) * 100 : 0

    // Calculate volume trend
    const volumeChange = previousData.length > 0 ?
      ((currentData.length - previousData.length) / previousData.length) * 100 : 0

    // Calculate quality trend (based on validation errors)
    const currentErrors = currentData.reduce((sum, t) => 
      sum + t.events.filter(e => e.type === 'validation_error').length, 0
    )
    const previousErrors = previousData.reduce((sum, t) => 
      sum + t.events.filter(e => e.type === 'validation_error').length, 0
    )

    const currentErrorRate = currentData.length > 0 ? currentErrors / currentData.length : 0
    const previousErrorRate = previousData.length > 0 ? previousErrors / previousData.length : 0
    
    const qualityChange = previousErrorRate > 0 ?
      -((currentErrorRate - previousErrorRate) / previousErrorRate) * 100 : 0 // Negative because fewer errors = better quality

    return {
      completionRateTrend: {
        direction: completionRateChange > 5 ? 'up' : completionRateChange < -5 ? 'down' : 'stable',
        percentage: Math.abs(completionRateChange),
        period: `${currentPeriodDays} days`
      },
      volumeTrend: {
        direction: volumeChange > 10 ? 'up' : volumeChange < -10 ? 'down' : 'stable',
        percentage: Math.abs(volumeChange),
        period: `${currentPeriodDays} days`
      },
      qualityTrend: {
        direction: qualityChange > 5 ? 'up' : qualityChange < -5 ? 'down' : 'stable',
        percentage: Math.abs(qualityChange),
        period: `${currentPeriodDays} days`
      }
    }
  }

  // Additional helper methods would continue here...
  
  private static calculateTotalSteps(formMetadata: any): number {
    if (!formMetadata.sections) return 1
    return formMetadata.sections.reduce((total: number, section: any) => {
      return total + (section.fields?.length || 0)
    }, 0)
  }

  private static async updateTrackingData(
    currentTracking: CompletionTrackingData,
    event: any
  ): Promise<CompletionTrackingData> {
    const updated = { ...currentTracking }
    
    // Add event to events array
    updated.events.push({
      timestamp: new Date().toISOString(),
      ...event
    })

    // Update last activity
    updated.lastActivity = new Date().toISOString()

    // Update field progress if applicable
    if (event.fieldId && updated.fieldProgress[event.fieldId]) {
      const fieldProgress = updated.fieldProgress[event.fieldId]
      
      switch (event.type) {
        case 'field_focus':
          fieldProgress.visited = true
          break
        case 'field_change':
          fieldProgress.attempts++
          fieldProgress.lastModified = new Date().toISOString()
          if (event.value != null && event.value !== '') {
            fieldProgress.completed = true
          }
          break
      }
    }

    // Update overall progress
    const completedFields = Object.values(updated.fieldProgress).filter(f => f.completed).length
    const totalFields = Object.keys(updated.fieldProgress).length
    updated.progress = totalFields > 0 ? (completedFields / totalFields) * 100 : 0
    updated.currentStep = completedFields

    return updated
  }

  private static async getCompletionTracking(submissionId: string): Promise<CompletionTrackingData | null> {
    try {
      const response = await fetch(`/api/analytics/completion-tracking/${submissionId}`)
      if (!response.ok) return null
      return await response.json()
    } catch (error) {
      console.error('Error getting completion tracking:', error)
      return null
    }
  }

  private static async storeCompletionTracking(trackingData: CompletionTrackingData): Promise<void> {
    try {
      const response = await fetch('/api/analytics/completion-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackingData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to store completion tracking')
      }
    } catch (error) {
      console.error('Error storing completion tracking:', error)
      throw error
    }
  }

  private static async checkCompletionMilestones(trackingData: CompletionTrackingData): Promise<void> {
    // Check for significant milestones and trigger notifications if needed
    const milestones = [25, 50, 75, 90]
    
    for (const milestone of milestones) {
      if (trackingData.progress >= milestone && trackingData.progress < milestone + 5) {
        // Trigger milestone notification
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'form_progress_milestone',
            recipientId: trackingData.practitionerId,
            data: {
              clientId: trackingData.clientId,
              formId: trackingData.formId,
              progress: trackingData.progress,
              milestone
            }
          })
        })
      }
    }
  }

  private static async processCompletionAnalytics(trackingData: CompletionTrackingData): Promise<void> {
    // Process the completed form for analytics insights
    // This could trigger various analytical processes
    try {
      await fetch('/api/analytics/process-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: trackingData.submissionId,
          formId: trackingData.formId,
          completionTime: trackingData.timeSpent,
          progress: trackingData.progress,
          eventCount: trackingData.events.length
        })
      })
    } catch (error) {
      console.error('Error processing completion analytics:', error)
      // Don't throw as this is supplementary
    }
  }

  private static async getFormsMetadata(formIds: string[]): Promise<any[]> {
    try {
      const forms = await Promise.all(
        formIds.map(id => this.getFormMetadata(id))
      )
      return forms
    } catch (error) {
      console.error('Error getting forms metadata:', error)
      return []
    }
  }

  private static async calculateMultiFormTrends(
    trackingData: CompletionTrackingData[],
    dateRange: { start: string; end: string },
    groupBy: 'day' | 'week' | 'month'
  ): Promise<Array<{
    date: string
    submissions: number
    completions: number
    completionRate: number
  }>> {
    // Group data by the specified time period
    const grouped = new Map<string, { submissions: number; completions: number }>()
    
    trackingData.forEach(t => {
      let dateKey: string
      const date = new Date(t.startedAt)
      
      switch (groupBy) {
        case 'day':
          dateKey = date.toISOString().split('T')[0]
          break
        case 'week':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
          dateKey = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          dateKey = date.toISOString().split('T')[0]
      }
      
      const current = grouped.get(dateKey) || { submissions: 0, completions: 0 }
      current.submissions++
      if (t.completedAt) current.completions++
      grouped.set(dateKey, current)
    })

    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      submissions: data.submissions,
      completions: data.completions,
      completionRate: data.submissions > 0 ? (data.completions / data.submissions) * 100 : 0
    })).sort((a, b) => a.date.localeCompare(b.date))
  }

  private static async generateReportInsights(
    analytics: FormAnalyticsData[],
    multiFormAnalytics: any
  ): Promise<string[]> {
    const insights: string[] = []

    // Overall performance insights
    if (multiFormAnalytics.summary.averageCompletionRate > 80) {
      insights.push('Excellent overall completion rate across all forms')
    } else if (multiFormAnalytics.summary.averageCompletionRate < 50) {
      insights.push('Low completion rates indicate opportunity for form optimization')
    }

    // Individual form insights
    analytics.forEach(form => {
      if (form.trends.completionRateTrend.direction === 'up') {
        insights.push(`${form.formName} showing positive completion rate trend`)
      }
      
      if (form.overview.averageCompletionTime > 15) {
        insights.push(`${form.formName} takes longer than average to complete`)
      }
    })

    return insights
  }

  private static async generateReportRecommendations(analytics: FormAnalyticsData[]): Promise<string[]> {
    const recommendations: string[] = []

    analytics.forEach(form => {
      form.optimization.recommendations.forEach(rec => {
        if (rec.priority === 'high') {
          recommendations.push(`${form.formName}: ${rec.title} - ${rec.description}`)
        }
      })
    })

    return recommendations
  }

  private static async updateReportGeneration(reportId: string): Promise<void> {
    try {
      await fetch(`/api/analytics/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastGenerated: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Error updating report generation:', error)
    }
  }
}

// Zod schemas for validation
export const CompletionTrackingDataSchema = z.object({
  submissionId: z.string(),
  formId: z.string(),
  clientId: z.string(),
  practitionerId: z.string(),
  assignmentId: z.string().optional(),
  startedAt: z.string(),
  lastActivity: z.string(),
  completedAt: z.string().optional(),
  currentStep: z.number(),
  totalSteps: z.number(),
  progress: z.number(),
  timeSpent: z.number(),
  fieldProgress: z.record(z.object({
    visited: z.boolean(),
    completed: z.boolean(),
    timeSpent: z.number(),
    attempts: z.number(),
    lastModified: z.string()
  })),
  sessionData: z.object({
    deviceType: z.string(),
    browser: z.string(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    screenResolution: z.string().optional(),
    timezone: z.string().optional()
  }),
  events: z.array(z.object({
    timestamp: z.string(),
    type: z.string(),
    fieldId: z.string().optional(),
    sectionId: z.string().optional(),
    value: z.any().optional(),
    error: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }))
})

export const AnalyticsQuerySchema = z.object({
  formIds: z.array(z.string()).optional(),
  practitionerId: z.string().optional(),
  clientIds: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
  includeIncomplete: z.boolean().optional(),
  filters: z.object({
    deviceType: z.string().optional(),
    browser: z.string().optional(),
    completionStatus: z.enum(['completed', 'incomplete', 'abandoned']).optional(),
    assignmentSource: z.string().optional()
  }).optional()
})