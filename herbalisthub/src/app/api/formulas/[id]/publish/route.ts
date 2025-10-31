import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { Role } from "@prisma/client"
import { FormulaPublishing, VisibilityLevel } from "@/lib/formulas/publishing"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

// GET - Get publishing status and validation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can check publishing status
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formulaId = params.id

    // Get publishing status
    const publishingStatus = await FormulaPublishing.getPublishingStatus(formulaId)

    if (!publishingStatus) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 })
    }

    // Audit the access
    await auditPHIAccess({
      userId: session.user.id,
      action: "VIEW_PUBLISHING_STATUS",
      resourceType: "formula",
      resourceId: formulaId,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      outcome: AuditOutcome.SUCCESS,
      details: {
        formulaName: publishingStatus.formula.name,
        currentStatus: publishingStatus.status,
        visibility: publishingStatus.visibility,
      }
    })

    return NextResponse.json({
      success: true,
      ...publishingStatus,
    })
  } catch (error) {
    console.error("Error getting publishing status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Publish formula
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can publish formulas
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formulaId = params.id
    const body = await request.json()
    
    const {
      visibility = VisibilityLevel.PUBLIC,
      publishingNotes = "",
      skipValidation = false,
      autoApprove = false
    } = body

    // Validate visibility level
    if (!Object.values(VisibilityLevel).includes(visibility)) {
      return NextResponse.json({ 
        error: "Invalid visibility level" 
      }, { status: 400 })
    }

    // Publish the formula
    const result = await FormulaPublishing.publishFormula(
      formulaId,
      session.user.id,
      {
        visibility,
        publishingNotes,
        skipValidation,
        autoApprove
      }
    )

    // Audit the publishing action
    await auditPHIAccess({
      userId: session.user.id,
      action: result.success ? "PUBLISH_FORMULA" : "PUBLISH_FORMULA_FAILED",
      resourceType: "formula",
      resourceId: formulaId,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      outcome: result.success ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
      details: {
        visibility,
        publishingNotes,
        skipValidation,
        warnings: result.warnings,
        errorMessage: result.success ? undefined : result.message,
      }
    })

    return NextResponse.json({
      success: result.success,
      message: result.message,
      warnings: result.warnings,
    }, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error("Error publishing formula:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Unpublish formula
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can unpublish formulas
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formulaId = params.id
    const body = await request.json().catch(() => ({}))
    const { reason = "Formula unpublished" } = body

    // Unpublish the formula
    const result = await FormulaPublishing.unpublishFormula(
      formulaId,
      session.user.id,
      reason
    )

    // Audit the unpublishing action
    await auditPHIAccess({
      userId: session.user.id,
      action: result.success ? "UNPUBLISH_FORMULA" : "UNPUBLISH_FORMULA_FAILED",
      resourceType: "formula",
      resourceId: formulaId,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      outcome: result.success ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
      details: {
        reason,
        errorMessage: result.success ? undefined : result.message,
      }
    })

    return NextResponse.json({
      success: result.success,
      message: result.message,
    }, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error("Error unpublishing formula:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Change formula visibility
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can change visibility
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formulaId = params.id
    const body = await request.json()
    
    const { visibility, notes = "" } = body

    // Validate visibility level
    if (!visibility || !Object.values(VisibilityLevel).includes(visibility)) {
      return NextResponse.json({ 
        error: "Valid visibility level is required" 
      }, { status: 400 })
    }

    // Change formula visibility
    const result = await FormulaPublishing.changeVisibility(
      formulaId,
      visibility,
      session.user.id,
      notes
    )

    // Audit the visibility change
    await auditPHIAccess({
      userId: session.user.id,
      action: result.success ? "CHANGE_FORMULA_VISIBILITY" : "CHANGE_FORMULA_VISIBILITY_FAILED",
      resourceType: "formula",
      resourceId: formulaId,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      outcome: result.success ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
      details: {
        newVisibility: visibility,
        notes,
        errorMessage: result.success ? undefined : result.message,
      }
    })

    return NextResponse.json({
      success: result.success,
      message: result.message,
    }, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error("Error changing formula visibility:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}