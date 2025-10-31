import { NextRequest, NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/auth/api-middleware"
import { AuditReportGenerator } from "@/lib/audit/reports"
import { DataSensitivity } from "@/lib/audit/logger"

// GET - Generate audit reports (admin only)
export const GET = withAdminAuth(async (request, context, user) => {
  try {
    const { searchParams } = new URL(request.url)
    
    const reportType = searchParams.get("type") || "hipaa"
    const startDate = new Date(searchParams.get("startDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    const endDate = new Date(searchParams.get("endDate") || new Date())
    const userId = searchParams.get("userId") || undefined
    
    let report
    
    switch (reportType) {
      case "hipaa":
        report = await AuditReportGenerator.generateHIPAAReport(
          { startDate, endDate },
          {
            includePHIOnly: true,
            includeSuccessfulAccess: false,
            groupByUser: true,
          }
        )
        break
        
      case "user-access":
        if (!userId) {
          return NextResponse.json(
            { error: "userId is required for user access reports" },
            { status: 400 }
          )
        }
        report = await AuditReportGenerator.generateUserAccessReport(userId, startDate, endDate)
        break
        
      case "security":
        report = await AuditReportGenerator.generateSecurityReport(startDate, endDate)
        break
        
      case "periodic":
        const frequency = searchParams.get("frequency") as "daily" | "weekly" | "monthly" || "monthly"
        report = await AuditReportGenerator.generatePeriodicSummary(startDate, endDate, frequency)
        break
        
      case "data-access":
        const resourceType = searchParams.get("resourceType")
        const resourceId = searchParams.get("resourceId")
        
        if (!resourceType || !resourceId) {
          return NextResponse.json(
            { error: "resourceType and resourceId are required for data access reports" },
            { status: 400 }
          )
        }
        
        report = await AuditReportGenerator.generateDataAccessReport(
          resourceType,
          resourceId,
          startDate,
          endDate
        )
        break
        
      default:
        return NextResponse.json(
          { error: "Invalid report type. Supported types: hipaa, user-access, security, periodic, data-access" },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      report,
      generatedAt: new Date(),
      generatedBy: {
        userId: user.id,
        email: user.email,
      },
    })
  } catch (error) {
    console.error("Generate audit report error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
})