import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { z } from "zod"
import { Role } from "@prisma/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { 
  formulaUpdateSchema,
  type FormulaUpdateInput 
} from "@/lib/validation/formula"
import { FormulaCostCalculator } from "@/lib/formulas/cost-calculation"
import { FormulaVersionControl } from "@/lib/formulas/version-control"

// GET - Get a single formula by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can access formulas
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formulaId = params.id

    // Get formula with full details
    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      select: {
        id: true,
        name: true,
        description: true,
        instructions: true,
        category: true,
        difficulty: true,
        prepTime: true,
        yieldAmount: true,
        yieldUnit: true,
        dosage: true,
        duration: true,
        contraindications: true,
        interactions: true,
        basePrice: true,
        laborCost: true,
        markupPercent: true,
        finalPrice: true,
        isPublic: true,
        isDraft: true,
        publishedAt: true,
        version: true,
        parentId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        
        // Related data
        ingredients: {
          select: {
            id: true,
            quantity: true,
            unit: true,
            ratio: true,
            processingNotes: true,
            costPerUnit: true,
            totalCost: true,
            herb: {
              select: {
                id: true,
                name: true,
                latinName: true,
                type: true,
                quantity: true,
                unit: true,
                costPerUnit: true,
                minimumStock: true,
                supplier: true,
                expirationDate: true,
                qualityGrade: true,
              }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        
        preparations: {
          select: {
            id: true,
            name: true,
            method: true,
            instructions: true,
            yieldAmount: true,
            yieldUnit: true,
          }
        },
        
        parent: {
          select: {
            id: true,
            name: true,
            version: true,
          }
        },
        
        versions: {
          select: {
            id: true,
            name: true,
            version: true,
            createdAt: true,
            isDraft: true,
          },
          orderBy: { version: "desc" },
          take: 10, // Latest 10 versions
        },
        
        discussions: {
          select: {
            id: true,
            title: true,
            isApproved: true,
            createdAt: true,
          },
          where: { isApproved: true },
          take: 5, // Latest 5 discussions
        },
        
        _count: {
          select: {
            ingredients: true,
            versions: true,
            discussions: true,
            preparations: true,
          }
        }
      }
    })

    if (!formula) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 })
    }

    // Role-based access control for herbalists
    if (session.user.role === Role.HERBALIST) {
      // Herbalists can only see their own formulas and published public formulas
      const isOwnFormula = formula.createdBy === session.user.id
      const isPublicFormula = formula.isPublic && !formula.isDraft
      
      if (!isOwnFormula && !isPublicFormula) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Calculate real-time cost breakdown
    let costBreakdown = null
    try {
      costBreakdown = await FormulaCostCalculator.calculateFormulaCost(formulaId)
    } catch (costError) {
      console.warn("Could not calculate cost breakdown:", costError)
    }

    // Check ingredient availability
    const availabilityStatus = {
      available: 0,
      partial: 0,
      unavailable: 0,
      total: formula.ingredients.length
    }

    for (const ingredient of formula.ingredients) {
      const required = ingredient.quantity.toNumber()
      const available = ingredient.herb.quantity?.toNumber() || 0
      
      if (available >= required) {
        availabilityStatus.available++
      } else if (available > 0) {
        availabilityStatus.partial++
      } else {
        availabilityStatus.unavailable++
      }
    }

    // Prepare enriched response
    const enrichedFormula = {
      ...formula,
      costBreakdown,
      availabilityStatus,
      metrics: {
        totalIngredients: formula._count.ingredients,
        totalVersions: formula._count.versions,
        totalDiscussions: formula._count.discussions,
        totalPreparations: formula._count.preparations,
        lastUpdated: formula.updatedAt,
        isLatestVersion: !formula.parentId, // If no parent, this is the latest
      }
    }

    // Audit the formula access
    await auditPHIAccess(
      "read",
      "Formula",
      formulaId,
      session.user.id,
      session.user.role,
      ["formula_data", "ingredient_data", "cost_data"],
      AuditOutcome.SUCCESS,
      {
        formulaName: formula.name,
        ingredientCount: formula.ingredients.length,
        isPublic: formula.isPublic,
        isDraft: formula.isDraft,
        userRole: session.user.role,
      }
    )

    return NextResponse.json({
      success: true,
      formula: enrichedFormula,
    })
  } catch (error) {
    console.error("Error fetching formula:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update a formula
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can update formulas
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formulaId = params.id
    const body = await request.json()
    
    // Validate update data
    const updateData = { ...body, id: formulaId }
    const validationResult = formulaUpdateSchema.safeParse(updateData)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const formulaData: FormulaUpdateInput = validationResult.data

    // Check if formula exists and user has permission
    const existingFormula = await prisma.formula.findUnique({
      where: { id: formulaId },
      select: {
        id: true,
        name: true,
        version: true,
        isPublic: true,
        isDraft: true,
        ingredients: {
          select: { id: true }
        }
      }
    })

    if (!existingFormula) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 })
    }

    // Version control logic
    const shouldCreateNewVersion = formulaData.parentId !== undefined || 
                                   (formulaData.version && formulaData.version > existingFormula.version)

    let updatedFormula

    if (shouldCreateNewVersion) {
      // Create new version
      const newVersion = existingFormula.version + 1
      
      updatedFormula = await prisma.$transaction(async (tx) => {
        // Create new formula version
        const newFormula = await tx.formula.create({
          data: {
            name: formulaData.name || existingFormula.name,
            description: formulaData.description,
            instructions: formulaData.instructions || "",
            category: formulaData.category,
            difficulty: formulaData.difficulty,
            prepTime: formulaData.prepTime,
            yieldAmount: formulaData.yieldAmount,
            yieldUnit: formulaData.yieldUnit,
            dosage: formulaData.dosage,
            duration: formulaData.duration,
            contraindications: formulaData.contraindications,
            interactions: formulaData.interactions,
            laborCost: formulaData.laborCost,
            markupPercent: formulaData.markupPercent,
            isPublic: formulaData.isPublic ?? false,
            isDraft: formulaData.isDraft ?? true,
            version: newVersion,
            parentId: formulaData.parentId || formulaId,
            publishedAt: (formulaData.isPublic && !formulaData.isDraft) ? new Date() : null,
          }
        })

        // Copy ingredients if updating existing formula ingredients
        if (formulaData.ingredients) {
          // Validate herb IDs
          const herbIds = formulaData.ingredients.map(ing => ing.herbId)
          const herbs = await tx.herb.findMany({
            where: { id: { in: herbIds } },
            select: { id: true, costPerUnit: true }
          })

          if (herbs.length !== herbIds.length) {
            throw new Error("Some herbs not found")
          }

          const herbCostMap = new Map(herbs.map(h => [h.id, h.costPerUnit?.toNumber() || 0]))

          // Create new ingredients
          await Promise.all(
            formulaData.ingredients.map(ingredient =>
              tx.formulaIngredient.create({
                data: {
                  formulaId: newFormula.id,
                  herbId: ingredient.herbId,
                  quantity: ingredient.quantity,
                  unit: ingredient.unit,
                  ratio: ingredient.ratio,
                  processingNotes: ingredient.processingNotes,
                  costPerUnit: herbCostMap.get(ingredient.herbId) || 0,
                  totalCost: ingredient.quantity * (herbCostMap.get(ingredient.herbId) || 0),
                }
              })
            )
          )
        }

        return newFormula
      })
    } else {
      // Update existing formula
      updatedFormula = await prisma.$transaction(async (tx) => {
        // Update basic formula data
        const updated = await tx.formula.update({
          where: { id: formulaId },
          data: {
            name: formulaData.name,
            description: formulaData.description,
            instructions: formulaData.instructions,
            category: formulaData.category,
            difficulty: formulaData.difficulty,
            prepTime: formulaData.prepTime,
            yieldAmount: formulaData.yieldAmount,
            yieldUnit: formulaData.yieldUnit,
            dosage: formulaData.dosage,
            duration: formulaData.duration,
            contraindications: formulaData.contraindications,
            interactions: formulaData.interactions,
            laborCost: formulaData.laborCost,
            markupPercent: formulaData.markupPercent,
            isPublic: formulaData.isPublic,
            isDraft: formulaData.isDraft,
            publishedAt: (formulaData.isPublic && !formulaData.isDraft) ? new Date() : existingFormula.isPublic ? undefined : null,
          }
        })

        // Update ingredients if provided
        if (formulaData.ingredients) {
          // Delete existing ingredients
          await tx.formulaIngredient.deleteMany({
            where: { formulaId }
          })

          // Validate and create new ingredients
          const herbIds = formulaData.ingredients.map(ing => ing.herbId)
          const herbs = await tx.herb.findMany({
            where: { id: { in: herbIds } },
            select: { id: true, costPerUnit: true }
          })

          if (herbs.length !== herbIds.length) {
            throw new Error("Some herbs not found")
          }

          const herbCostMap = new Map(herbs.map(h => [h.id, h.costPerUnit?.toNumber() || 0]))

          await Promise.all(
            formulaData.ingredients.map(ingredient =>
              tx.formulaIngredient.create({
                data: {
                  formulaId,
                  herbId: ingredient.herbId,
                  quantity: ingredient.quantity,
                  unit: ingredient.unit,
                  ratio: ingredient.ratio,
                  processingNotes: ingredient.processingNotes,
                  costPerUnit: herbCostMap.get(ingredient.herbId) || 0,
                  totalCost: ingredient.quantity * (herbCostMap.get(ingredient.herbId) || 0),
                }
              })
            )
          )
        }

        return updated
      })
    }

    // Recalculate costs
    try {
      await FormulaCostCalculator.updateFormulaCosts(updatedFormula.id)
    } catch (costError) {
      console.warn("Could not update formula costs:", costError)
    }

    // Audit the formula update
    await auditPHIAccess(
      "update",
      "Formula",
      updatedFormula.id,
      session.user.id,
      session.user.role,
      ["formula_data", "ingredient_data"],
      AuditOutcome.SUCCESS,
      {
        formulaName: formulaData.name || existingFormula.name,
        originalVersion: existingFormula.version,
        newVersion: updatedFormula.version || existingFormula.version,
        createdNewVersion: shouldCreateNewVersion,
        updatedFields: Object.keys(formulaData),
      }
    )

    return NextResponse.json({
      success: true,
      formula: updatedFormula,
      message: shouldCreateNewVersion ? "New formula version created" : "Formula updated successfully",
      isNewVersion: shouldCreateNewVersion,
    })
  } catch (error) {
    console.error("Error updating formula:", error)
    
    // Audit the failed update attempt
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "update",
          "Formula",
          params.id,
          session.user.id,
          session.user.role,
          ["attempted_update"],
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

// DELETE - Delete a formula
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can delete formulas
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formulaId = params.id

    // Check if formula exists and get details for audit
    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      select: {
        id: true,
        name: true,
        version: true,
        isPublic: true,
        isDraft: true,
        _count: {
          select: {
            ingredients: true,
            versions: true,
            discussions: true,
          }
        }
      }
    })

    if (!formula) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 })
    }

    // Prevent deletion of published public formulas (soft delete might be better)
    if (formula.isPublic && !formula.isDraft) {
      return NextResponse.json(
        { 
          error: "Cannot delete published public formula",
          suggestion: "Consider unpublishing or marking as draft instead"
        },
        { status: 400 }
      )
    }

    // Check if this is a parent formula with versions
    if (formula._count.versions > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete formula with existing versions",
          suggestion: "Delete all versions first or use cascade deletion"
        },
        { status: 400 }
      )
    }

    // Delete formula and related data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete related data first (due to foreign key constraints)
      await tx.formulaIngredient.deleteMany({
        where: { formulaId }
      })

      await tx.preparation.deleteMany({
        where: { formulaId }
      })

      await tx.discussion.deleteMany({
        where: { formulaId }
      })

      // Finally delete the formula
      await tx.formula.delete({
        where: { id: formulaId }
      })
    })

    // Audit the formula deletion
    await auditPHIAccess(
      "delete",
      "Formula",
      formulaId,
      session.user.id,
      session.user.role,
      ["formula_data", "ingredient_data"],
      AuditOutcome.SUCCESS,
      {
        formulaName: formula.name,
        version: formula.version,
        ingredientCount: formula._count.ingredients,
        discussionCount: formula._count.discussions,
        wasPublic: formula.isPublic,
        wasDraft: formula.isDraft,
      }
    )

    return NextResponse.json({
      success: true,
      message: "Formula deleted successfully",
      deletedFormula: {
        id: formulaId,
        name: formula.name,
        version: formula.version,
      }
    })
  } catch (error) {
    console.error("Error deleting formula:", error)
    
    // Audit the failed deletion attempt
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "delete",
          "Formula",
          params.id,
          session.user.id,
          session.user.role,
          ["attempted_deletion"],
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