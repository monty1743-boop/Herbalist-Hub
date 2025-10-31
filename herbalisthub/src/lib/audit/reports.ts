import { auditLogger, AuditEventType, AuditOutcome, DataSensitivity } from "./logger"

export interface AuditReportFilters {
  startDate: Date
  endDate: Date
  userId?: string
  eventTypes?: AuditEventType[]
  dataSensitivity?: DataSensitivity[]
  outcome?: AuditOutcome
  resourceType?: string
}

export interface ComplianceReportOptions {
  includePHIOnly?: boolean
  includeSuccessfulAccess?: boolean
  includeFailuresOnly?: boolean
  groupByUser?: boolean
  groupByEventType?: boolean
}

export class AuditReportGenerator {
  /**
   * Generate HIPAA compliance report
   */
  static async generateHIPAAReport(
    filters: AuditReportFilters,
    options: ComplianceReportOptions = {}
  ) {
    const report = await auditLogger.generateComplianceReport(
      filters.startDate,
      filters.endDate,
      {
        includePHIOnly: options.includePHIOnly ?? true,
        includeSuccessfulAccess: options.includeSuccessfulAccess ?? false,
        groupByUser: options.groupByUser ?? true,
      }
    )

    return {
      ...report,
      metadata: {
        generatedAt: new Date(),
        filters,
        options,
        reportType: "HIPAA_COMPLIANCE",
      },
      sections: {
        executiveSummary: this.generateExecutiveSummary(report),
        phiAccessSummary: this.generatePHIAccessSummary(report),
        securityIncidents: this.generateSecurityIncidentsSummary(report),
        userActivity: this.generateUserActivitySummary(report),
        systemChanges: this.generateSystemChangesSummary(report),
      },
    }
  }

  /**
   * Generate user access report
   */
  static async generateUserAccessReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    const filters = {
      startDate,
      endDate,
      userId,
      dataSensitivity: [DataSensitivity.PHI, DataSensitivity.CONFIDENTIAL],
    }

    const result = await auditLogger.queryLogs(filters)

    return {
      userId,
      period: { startDate, endDate },
      totalEvents: result.logs.length,
      phiAccess: result.logs.filter(log => log.dataSensitivity === DataSensitivity.PHI),
      failedAccess: result.logs.filter(log => log.outcome === AuditOutcome.FAILURE),
      accessPatterns: this.analyzeAccessPatterns(result.logs),
      riskScore: this.calculateUserRiskScore(result.logs),
      recommendations: this.generateUserRecommendations(result.logs),
    }
  }

  /**
   * Generate security incident report
   */
  static async generateSecurityReport(
    startDate: Date,
    endDate: Date
  ) {
    const securityEvents = [
      AuditEventType.UNAUTHORIZED_ACCESS,
      AuditEventType.PERMISSION_DENIED,
      AuditEventType.DATA_BREACH_SUSPECTED,
      AuditEventType.LOGIN_FAILED,
      AuditEventType.ACCOUNT_LOCKED,
    ]

    const result = await auditLogger.queryLogs({
      startDate,
      endDate,
      eventTypes: securityEvents,
    })

    return {
      period: { startDate, endDate },
      totalIncidents: result.logs.length,
      criticalIncidents: result.logs.filter(log => 
        [AuditEventType.DATA_BREACH_SUSPECTED, AuditEventType.UNAUTHORIZED_ACCESS].includes(log.eventType as AuditEventType)
      ),
      failedLogins: result.logs.filter(log => log.eventType === AuditEventType.LOGIN_FAILED),
      unauthorizedAccess: result.logs.filter(log => log.eventType === AuditEventType.UNAUTHORIZED_ACCESS),
      threatAnalysis: this.analyzeThreatPatterns(result.logs),
      actionItems: this.generateSecurityActionItems(result.logs),
    }
  }

  /**
   * Generate data access report
   */
  static async generateDataAccessReport(
    resourceType: string,
    resourceId: string,
    startDate: Date,
    endDate: Date
  ) {
    const result = await auditLogger.queryLogs({
      startDate,
      endDate,
      resourceType,
    })

    const resourceLogs = result.logs.filter(log => log.resourceId === resourceId)

    return {
      resource: { type: resourceType, id: resourceId },
      period: { startDate, endDate },
      totalAccess: resourceLogs.length,
      accessByUser: this.groupBy(resourceLogs, "userId"),
      accessByEventType: this.groupBy(resourceLogs, "eventType"),
      timeline: this.createAccessTimeline(resourceLogs),
      complianceStatus: this.assessComplianceStatus(resourceLogs),
    }
  }

  /**
   * Generate periodic compliance summary
   */
  static async generatePeriodicSummary(
    startDate: Date,
    endDate: Date,
    frequency: "daily" | "weekly" | "monthly" = "monthly"
  ) {
    const result = await auditLogger.queryLogs({ startDate, endDate })

    return {
      period: { startDate, endDate, frequency },
      overview: {
        totalEvents: result.logs.length,
        phiEvents: result.logs.filter(log => log.dataSensitivity === DataSensitivity.PHI).length,
        failedEvents: result.logs.filter(log => log.outcome === AuditOutcome.FAILURE).length,
        uniqueUsers: new Set(result.logs.map(log => log.userId)).size,
      },
      trends: this.analyzeTrends(result.logs, frequency),
      topRisks: this.identifyTopRisks(result.logs),
      recommendations: this.generateComplianceRecommendations(result.logs),
      nextReviewDate: this.calculateNextReviewDate(endDate, frequency),
    }
  }

  private static generateExecutiveSummary(report: any) {
    const totalEvents = report.summary.totalEvents
    const suspiciousCount = report.summary.suspiciousActivity.length

    return {
      totalAuditEvents: totalEvents,
      suspiciousActivities: suspiciousCount,
      complianceScore: this.calculateComplianceScore(report),
      keyFindings: this.extractKeyFindings(report),
      executiveRecommendations: this.generateExecutiveRecommendations(report),
    }
  }

  private static generatePHIAccessSummary(report: any) {
    const phiEvents = report.logs.filter((log: any) => log.dataSensitivity === DataSensitivity.PHI)
    
    return {
      totalPHIAccess: phiEvents.length,
      accessByUser: this.groupBy(phiEvents, "userId"),
      accessByType: this.groupBy(phiEvents, "eventType"),
      unauthorizedAttempts: phiEvents.filter((log: any) => log.outcome === AuditOutcome.FAILURE),
    }
  }

  private static generateSecurityIncidentsSummary(report: any) {
    return {
      totalIncidents: report.summary.suspiciousActivity.length,
      criticalIncidents: report.summary.suspiciousActivity.filter((log: any) => 
        log.eventType === AuditEventType.DATA_BREACH_SUSPECTED
      ),
      incidentsByType: this.groupBy(report.summary.suspiciousActivity, "eventType"),
      resolutionStatus: this.assessIncidentResolution(report.summary.suspiciousActivity),
    }
  }

  private static generateUserActivitySummary(report: any) {
    const userActivity = report.summary.byUser || {}
    
    return {
      mostActiveUsers: this.getTopUsers(userActivity, 10),
      suspiciousUsers: this.identifySuspiciousUsers(report.logs),
      accessPatterns: this.analyzeUserAccessPatterns(report.logs),
    }
  }

  private static generateSystemChangesSummary(report: any) {
    const systemEvents = report.logs.filter((log: any) => 
      [AuditEventType.SYSTEM_CONFIG_CHANGE, AuditEventType.USER_ROLE_CHANGE].includes(log.eventType)
    )

    return {
      totalChanges: systemEvents.length,
      configurationChanges: systemEvents.filter((log: any) => log.eventType === AuditEventType.SYSTEM_CONFIG_CHANGE),
      roleChanges: systemEvents.filter((log: any) => log.eventType === AuditEventType.USER_ROLE_CHANGE),
      changesByUser: this.groupBy(systemEvents, "userId"),
    }
  }

  private static analyzeAccessPatterns(logs: any[]) {
    return {
      peakHours: this.findPeakAccessHours(logs),
      frequentResources: this.findFrequentResources(logs),
      unusualPatterns: this.detectUnusualPatterns(logs),
    }
  }

  private static calculateUserRiskScore(logs: any[]): number {
    let riskScore = 0
    
    // Factors that increase risk score
    const failedAccess = logs.filter(log => log.outcome === AuditOutcome.FAILURE).length
    const phiAccess = logs.filter(log => log.dataSensitivity === DataSensitivity.PHI).length
    const offHoursAccess = logs.filter(log => this.isOffHours(new Date(log.timestamp))).length
    
    riskScore += failedAccess * 10
    riskScore += phiAccess * 2
    riskScore += offHoursAccess * 5
    
    return Math.min(riskScore, 100) // Cap at 100
  }

  private static generateUserRecommendations(logs: any[]): string[] {
    const recommendations: string[] = []
    
    const failedAccess = logs.filter(log => log.outcome === AuditOutcome.FAILURE).length
    const phiAccess = logs.filter(log => log.dataSensitivity === DataSensitivity.PHI).length
    
    if (failedAccess > 5) {
      recommendations.push("Review user permissions and provide additional training")
    }
    
    if (phiAccess > 50) {
      recommendations.push("Monitor PHI access patterns more closely")
    }
    
    return recommendations
  }

  private static analyzeThreatPatterns(logs: any[]) {
    return {
      suspiciousIPs: this.findSuspiciousIPs(logs),
      attackPatterns: this.detectAttackPatterns(logs),
      riskLevel: this.assessThreatLevel(logs),
    }
  }

  private static generateSecurityActionItems(logs: any[]): string[] {
    const actions: string[] = []
    
    const breachSuspected = logs.some(log => log.eventType === AuditEventType.DATA_BREACH_SUSPECTED)
    if (breachSuspected) {
      actions.push("Immediate investigation required for suspected data breach")
    }
    
    return actions
  }

  private static groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((result, item) => {
      const groupKey = String(item[key])
      result[groupKey] = (result[groupKey] || 0) + 1
      return result
    }, {} as Record<string, number>)
  }

  private static createAccessTimeline(logs: any[]) {
    return logs
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(log => ({
        timestamp: log.timestamp,
        eventType: log.eventType,
        userId: log.userId,
        outcome: log.outcome,
      }))
  }

  private static assessComplianceStatus(logs: any[]) {
    const failureRate = logs.filter(log => log.outcome === AuditOutcome.FAILURE).length / logs.length
    
    if (failureRate > 0.1) return "NON_COMPLIANT"
    if (failureRate > 0.05) return "AT_RISK"
    return "COMPLIANT"
  }

  private static analyzeTrends(logs: any[], frequency: string) {
    // Group logs by time period and analyze trends
    return {
      volumeTrend: "increasing", // Simplified
      riskTrend: "stable",
      patternChanges: [],
    }
  }

  private static identifyTopRisks(logs: any[]): string[] {
    const risks: string[] = []
    
    const failureRate = logs.filter(log => log.outcome === AuditOutcome.FAILURE).length / logs.length
    if (failureRate > 0.05) {
      risks.push("High failure rate in access attempts")
    }
    
    return risks
  }

  private static generateComplianceRecommendations(logs: any[]): string[] {
    return [
      "Continue monitoring access patterns",
      "Review user permissions quarterly",
      "Implement additional access controls for PHI",
    ]
  }

  private static calculateNextReviewDate(endDate: Date, frequency: string): Date {
    const next = new Date(endDate)
    switch (frequency) {
      case "daily":
        next.setDate(next.getDate() + 1)
        break
      case "weekly":
        next.setDate(next.getDate() + 7)
        break
      case "monthly":
        next.setMonth(next.getMonth() + 1)
        break
    }
    return next
  }

  private static calculateComplianceScore(report: any): number {
    // Simplified compliance scoring
    const totalEvents = report.summary.totalEvents || 1
    const suspiciousEvents = report.summary.suspiciousActivity?.length || 0
    
    return Math.max(0, 100 - (suspiciousEvents / totalEvents * 100))
  }

  private static extractKeyFindings(report: any): string[] {
    return [
      `${report.summary.totalEvents} total audit events recorded`,
      `${report.summary.suspiciousActivity?.length || 0} suspicious activities detected`,
    ]
  }

  private static generateExecutiveRecommendations(report: any): string[] {
    return [
      "Maintain current security posture",
      "Continue regular compliance monitoring",
    ]
  }

  private static getTopUsers(userActivity: Record<string, number>, limit: number) {
    return Object.entries(userActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([userId, count]) => ({ userId, activityCount: count }))
  }

  private static identifySuspiciousUsers(logs: any[]) {
    // Identify users with unusual access patterns
    return []
  }

  private static analyzeUserAccessPatterns(logs: any[]) {
    return {
      normalBusinessHours: logs.filter(log => !this.isOffHours(new Date(log.timestamp))).length,
      offHoursAccess: logs.filter(log => this.isOffHours(new Date(log.timestamp))).length,
    }
  }

  private static findPeakAccessHours(logs: any[]) {
    const hourCounts: Record<number, number> = {}
    
    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    
    return Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
  }

  private static findFrequentResources(logs: any[]) {
    const resourceCounts: Record<string, number> = {}
    
    logs.forEach(log => {
      if (log.resourceId) {
        const key = `${log.resourceType}:${log.resourceId}`
        resourceCounts[key] = (resourceCounts[key] || 0) + 1
      }
    })
    
    return Object.entries(resourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([resource, count]) => ({ resource, count }))
  }

  private static detectUnusualPatterns(logs: any[]): string[] {
    const patterns: string[] = []
    
    // Check for rapid successive access
    logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    for (let i = 0; i < logs.length - 1; i++) {
      const current = new Date(logs[i].timestamp)
      const next = new Date(logs[i + 1].timestamp)
      
      if (next.getTime() - current.getTime() < 1000) { // Less than 1 second
        patterns.push("Rapid successive access detected")
        break
      }
    }
    
    return patterns
  }

  private static isOffHours(date: Date): boolean {
    const hour = date.getHours()
    const day = date.getDay()
    
    // Weekend or outside 8 AM - 6 PM
    return day === 0 || day === 6 || hour < 8 || hour >= 18
  }

  private static findSuspiciousIPs(logs: any[]) {
    const ipCounts: Record<string, number> = {}
    
    logs.forEach(log => {
      if (log.ipAddress) {
        ipCounts[log.ipAddress] = (ipCounts[log.ipAddress] || 0) + 1
      }
    })
    
    // Flag IPs with unusually high activity
    return Object.entries(ipCounts)
      .filter(([, count]) => count > 100)
      .map(([ip]) => ip)
  }

  private static detectAttackPatterns(logs: any[]): string[] {
    const patterns: string[] = []
    
    const failedLogins = logs.filter(log => log.eventType === AuditEventType.LOGIN_FAILED)
    if (failedLogins.length > 10) {
      patterns.push("Potential brute force attack detected")
    }
    
    return patterns
  }

  private static assessThreatLevel(logs: any[]): "LOW" | "MEDIUM" | "HIGH" {
    const criticalEvents = logs.filter(log => 
      [AuditEventType.DATA_BREACH_SUSPECTED, AuditEventType.UNAUTHORIZED_ACCESS].includes(log.eventType as AuditEventType)
    )
    
    if (criticalEvents.length > 0) return "HIGH"
    if (logs.filter(log => log.outcome === AuditOutcome.FAILURE).length > 10) return "MEDIUM"
    return "LOW"
  }

  private static assessIncidentResolution(incidents: any[]) {
    return {
      resolved: 0,
      pending: incidents.length,
      investigating: 0,
    }
  }
}