import { NextRequest, NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/auth/api-middleware"
import { auditLogger, AuditEventType, DataSensitivity, AuditOutcome } from "@/lib/audit/logger"
import { AuditReportGenerator } from "@/lib/audit/reports"

// GET - Query audit logs (admin only)
export const GET = withAdminAuth(async (request, context, user) => {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const startDate = searchParams.get("startDate") 
      ? new Date(searchParams.get("startDate")!) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default to last 30 days
    
    const endDate = searchParams.get("endDate") 
      ? new Date(searchParams.get("endDate")!) 
      : new Date()
    
    const userId = searchParams.get("userId") || undefined
    const eventTypes = searchParams.get("eventTypes")?.split(",") as AuditEventType[] || undefined
    const dataSensitivity = searchParams.get("dataSensitivity")?.split(",") as DataSensitivity[] || undefined
    const outcome = searchParams.get("outcome") as AuditOutcome || undefined
    const resourceType = searchParams.get("resourceType") || undefined
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 1000)
    
    // Query audit logs
    const result = await auditLogger.queryLogs({
      startDate,
      endDate,
      ...(userId && { userId }),
      ...(eventTypes && { eventTypes }),
      ...(dataSensitivity && { dataSensitivity }),
      ...(outcome && { outcome }),
      ...(resourceType && { resourceType }),
      page,
      limit,
    })

    return NextResponse.json({
      success: true,
      data: result,
      filters: {
        startDate,
        endDate,
        userId,
        eventTypes,
        dataSensitivity,
        outcome,
        resourceType,
      },
    })
  } catch (error) {
    console.error("Get audit logs error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
})