import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { Role } from "@prisma/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { FormulaVersionControl } from "@/lib/formulas/version-control"

interface CategorizationData {
  category?: string
  difficulty?: "beginner" | "intermediate" | "advanced"
  tags?: string[]
  therapeuticActions?: string[]
  indications?: string[]
  contraindications?: string
  notes?: string
}

// GET - Get formula categorization data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formulaId = params.id

    // Get formula with categorization data
    const formula = await prisma.formula.findFirst({
      where: {
        id: formulaId,
        OR: [
          { createdBy: session.user.id },
          { isPublic: true, isDraft: false }
        ]
      },
      select: {
        id: true,
        name: true,
        category: true,
        difficulty: true,
        contraindications: true,
        tags: {
          select: {
            tag: true
          }
        }
      }
    })

    if (!formula) {
      return NextResponse.json(
        { error: "Formula not found or access denied" },
        { status: 404 }
      )
    }

    // Audit the access
    await auditPHIAccess(
      "read",
      "FormulaCategorization",
      formulaId,
      session.user.id,
      session.user.role,
      ["categorization_data"],
      AuditOutcome.SUCCESS,
      "Retrieved formula categorization data"
    )

    return NextResponse.json({
      success: true,
      categorization: {
        category: formula.category,
        difficulty: formula.difficulty,
        contraindications: formula.contraindications,
        tags: formula.tags.map(t => t.tag),
        // Note: therapeuticActions and indications would need to be added to schema
        // For now, we'll return empty arrays
        therapeuticActions: [],
        indications: []
      }
    })
  } catch (error) {
    console.error("Error fetching formula categorization:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update formula categorization
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can update formula categorization
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formulaId = params.id
    const data: CategorizationData = await request.json()

    // Verify formula exists and user has access
    const existingFormula = await prisma.formula.findFirst({
      where: {
        id: formulaId,
        OR: [
          { createdBy: session.user.id },
          // Admins can edit any formula
          ...(session.user.role === Role.ADMIN ? [{}] : [])
        ]
      },
      include: {
        tags: true
      }
    })

    if (!existingFormula) {
      return NextResponse.json(
        { error: "Formula not found or access denied" },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    if (data.category !== undefined) {
      updateData.category = data.category
    }
    
    if (data.difficulty !== undefined) {
      updateData.difficulty = data.difficulty
    }
    
    if (data.contraindications !== undefined) {
      updateData.contraindications = data.contraindications
    }

    // Update formula in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update basic formula data
      const updatedFormula = await tx.formula.update({
        where: { id: formulaId },
        data: updateData,
        include: {
          tags: true
        }
      })

      // Handle tags update
      if (data.tags !== undefined) {
        // Remove existing tags
        await tx.formulaTag.deleteMany({
          where: { formulaId }
        })

        // Add new tags
        if (data.tags.length > 0) {
          await tx.formulaTag.createMany({
            data: data.tags.map(tag => ({
              formulaId,
              tag: tag.toLowerCase().trim(),
              createdBy: session.user.id
            }))
          })
        }
      }

      return updatedFormula
    })

    // Track version change if significant updates were made
    const hasSignificantChanges = data.category !== existingFormula.category ||
                                 data.difficulty !== existingFormula.difficulty ||
                                 JSON.stringify(data.tags?.sort()) !== JSON.stringify(existingFormula.tags.map(t => t.tag).sort())

    if (hasSignificantChanges) {
      await FormulaVersionControl.trackUpdate(
        formulaId,
        existingFormula,
        { ...existingFormula, ...updateData },
        session.user.id,
        "Updated formula categorization and metadata"
      )
    }

    // Audit the update
    await auditPHIAccess(
      "update",
      "FormulaCategorization",
      formulaId,
      session.user.id,
      session.user.role,
      ["categorization_data"],
      AuditOutcome.SUCCESS,
      `Updated formula categorization: ${Object.keys(updateData).join(", ")}`
    )

    return NextResponse.json({
      success: true,
      message: "Formula categorization updated successfully",
      categorization: {
        category: result.category,
        difficulty: result.difficulty,
        contraindications: result.contraindications,
        tags: data.tags || result.tags.map(t => t.tag)
      }
    })
  } catch (error) {
    console.error("Error updating formula categorization:", error)
    
    // Audit the failed attempt
    const session = await getServerSession(authOptions)
    if (session?.user) {
      await auditPHIAccess(
        "update",
        "FormulaCategorization",
        params.id,
        session.user.id,
        session.user.role,
        ["categorization_data"],
        AuditOutcome.FAILURE,
        `Failed to update formula categorization: ${error}`
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}