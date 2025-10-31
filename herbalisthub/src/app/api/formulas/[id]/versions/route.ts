import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { Role } from "@prisma/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { FormulaVersionControl } from "@/lib/formulas/version-control"

// GET - Get version history for a formula
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can access formula versions
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formulaId = params.id
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")

    // First check if base formula exists and user has access
    const baseFormula = await prisma.formula.findUnique({
      where: { id: formulaId },
      select: {
        id: true,
        name: true,
        createdBy: true,
        isPublic: true,
        isDraft: true,
      }
    })

    if (!baseFormula) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 })
    }

    // Check access permissions
    if (session.user.role === Role.HERBALIST) {
      const isOwnFormula = baseFormula.createdBy === session.user.id
      const isPublicFormula = baseFormula.isPublic && !baseFormula.isDraft
      
      if (!isOwnFormula && !isPublicFormula) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Get version history using our version control service
    const versionHistory = await FormulaVersionControl.getVersionHistory(formulaId, limit)

    // Audit the version history access
    await auditPHIAccess({
      userId: session.user.id,
      action: "VIEW_FORMULA_VERSIONS",
      resourceType: "formula_version",
      resourceId: formulaId,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      outcome: AuditOutcome.SUCCESS,
      details: {
        formulaName: baseFormula.name,
        versionCount: versionHistory.length,
        userRole: session.user.role,
      }
    })

    return NextResponse.json({
      success: true,
      formula: {
        id: baseFormula.id,
        name: baseFormula.name,
      },
      versions: versionHistory,
      summary: {
        totalVersions: versionHistory.length,
        latestVersion: versionHistory.length > 0 ? Math.max(...versionHistory.map(v => v.version)) : 1,
      }
    })
  } catch (error) {
    console.error("Error fetching formula versions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create a new version of a formula
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can create formula versions
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formulaId = params.id
    const body = await request.json()
    
    // Validate version creation data
    const versionData = { ...body, formulaId }
    const validationResult = formulaVersionSchema.safeParse(versionData)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const versionInput: FormulaVersionInput = validationResult.data

    // Get the current formula
    const currentFormula = await prisma.formula.findUnique({
      where: { id: formulaId },
      include: {
        ingredients: {
          include: {
            herb: {
              select: {
                id: true,
                costPerUnit: true,
              }
            }
          }
        }
      }
    })

    if (!currentFormula) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 })
    }

    // Check ownership for herbalists
    if (session.user.role === Role.HERBALIST && currentFormula.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Calculate next version number
    const maxVersion = await prisma.formula.aggregate({
      where: {
        OR: [
          { id: formulaId },
          { parentId: formulaId },
        ]
      },
      _max: { version: true }
    })

    const nextVersion = (maxVersion._max.version || 0) + 1

    // Create new version in transaction
    const newVersion = await prisma.$transaction(async (tx) => {
      // Create the new formula version
      const formula = await tx.formula.create({
        data: {
          name: currentFormula.name,
          description: currentFormula.description,
          instructions: currentFormula.instructions,
          category: currentFormula.category,
          difficulty: currentFormula.difficulty,
          prepTime: currentFormula.prepTime,
          yieldAmount: currentFormula.yieldAmount,
          yieldUnit: currentFormula.yieldUnit,
          dosage: currentFormula.dosage,
          duration: currentFormula.duration,
          contraindications: currentFormula.contraindications,
          interactions: currentFormula.interactions,
          basePrice: currentFormula.basePrice,
          laborCost: currentFormula.laborCost,
          markupPercent: currentFormula.markupPercent,
          finalPrice: currentFormula.finalPrice,
          isPublic: false, // New versions start as private
          isDraft: true,   // New versions start as draft
          version: nextVersion,
          parentId: formulaId,
          createdBy: session.user.id,
        },
        select: {
          id: true,
          name: true,
          version: true,
          createdAt: true,
        }
      })

      // Copy ingredients from current formula
      if (currentFormula.ingredients.length > 0) {
        await Promise.all(
          currentFormula.ingredients.map(ingredient =>
            tx.formulaIngredient.create({
              data: {
                formulaId: formula.id,
                herbId: ingredient.herbId,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                ratio: ingredient.ratio,
                processingNotes: ingredient.processingNotes,
                costPerUnit: ingredient.herb.costPerUnit?.toNumber() || 0,
                totalCost: ingredient.quantity.toNumber() * (ingredient.herb.costPerUnit?.toNumber() || 0),
              }
            })
          )
        )
      }

      return formula
    })

    // Audit the version creation
    await auditPHIAccess(
      "write",
      "FormulaVersion",
      newVersion.id,
      session.user.id,
      session.user.role,
      ["formula_data", "version_control"],
      AuditOutcome.SUCCESS,
      {
        originalFormulaId: formulaId,
        newVersionId: newVersion.id,
        versionNumber: nextVersion,
        changes: versionInput.changes,
        ingredientCount: currentFormula.ingredients.length,
      }
    )

    return NextResponse.json({
      success: true,
      version: newVersion,
      message: `Formula version ${nextVersion} created successfully`,
      changes: versionInput.changes,
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating formula version:", error)
    
    // Audit the failed version creation
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "write",
          "FormulaVersion",
          params.id,
          session.user.id,
          session.user.role,
          ["attempted_version_creation"],
          AuditOutcome.FAILURE,
          {
            error: error instanceof Error ? error.message : "Unknown error",
          }
        )
      }
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError)
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}