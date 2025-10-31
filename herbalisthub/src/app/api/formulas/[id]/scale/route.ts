import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { Role } from "@prisma/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { formulaScalingSchema, type FormulaScalingInput } from "@/lib/validation/formula"

interface ScaledIngredient {
  id: string
  herbId: string
  herbName: string
  originalQuantity: number
  scaledQuantity: number
  unit: string
  ratio?: string
  processingNotes?: string
  originalCost: number
  scaledCost: number
}

interface ScalingResult {
  formulaId: string
  formulaName: string
  originalYield: number | null
  originalYieldUnit: string | null
  scaleFactor: number
  targetYield?: number
  targetYieldUnit?: string
  scaledIngredients: ScaledIngredient[]
  costCalculation: {
    originalTotalCost: number
    scaledTotalCost: number
    costPerUnit: number
    estimatedPreparationTime?: number
  }
  availabilityCheck: {
    allIngredientsAvailable: boolean
    unavailableIngredients: string[]
    partiallyAvailableIngredients: { name: string; available: number; needed: number }[]
  }
  recommendations: string[]
}

// POST - Scale a formula to different batch sizes
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can scale formulas
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formulaId = params.id
    const body = await request.json()
    
    // Validate scaling parameters
    const scalingData = { ...body, formulaId }
    const validationResult = formulaScalingSchema.safeParse(scalingData)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const scalingParams: FormulaScalingInput = validationResult.data

    // Get the formula with ingredients
    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      select: {
        id: true,
        name: true,
        yieldAmount: true,
        yieldUnit: true,
        prepTime: true,
        basePrice: true,
        laborCost: true,
        instructions: true,
        ingredients: {
          select: {
            id: true,
            herbId: true,
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
                quantity: true,
                unit: true,
                costPerUnit: true,
              }
            }
          }
        }
      }
    })

    if (!formula) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 })
    }

    // Determine scale factor
    let scaleFactor = scalingParams.scaleFactor
    
    // If target yield is specified, calculate scale factor from original yield
    if (scalingParams.targetYield && formula.yieldAmount) {
      scaleFactor = scalingParams.targetYield / formula.yieldAmount.toNumber()
    }

    const roundingPrecision = parseFloat(scalingParams.roundingPrecision || "0.01")

    // Helper function to round based on precision
    const roundToPrecision = (value: number): number => {
      return Math.round(value / roundingPrecision) * roundingPrecision
    }

    // Scale ingredients
    const scaledIngredients: ScaledIngredient[] = []
    const unavailableIngredients: string[] = []
    const partiallyAvailableIngredients: { name: string; available: number; needed: number }[] = []

    for (const ingredient of formula.ingredients) {
      const originalQuantity = ingredient.quantity.toNumber()
      const scaledQuantity = roundToPrecision(originalQuantity * scaleFactor)
      const originalCost = ingredient.totalCost?.toNumber() || 0
      const scaledCost = originalCost * scaleFactor

      const availableQuantity = ingredient.herb.quantity?.toNumber() || 0

      // Check availability
      if (availableQuantity < scaledQuantity) {
        if (availableQuantity === 0) {
          unavailableIngredients.push(ingredient.herb.name)
        } else {
          partiallyAvailableIngredients.push({
            name: ingredient.herb.name,
            available: availableQuantity,
            needed: scaledQuantity
          })
        }
      }

      scaledIngredients.push({
        id: ingredient.id,
        herbId: ingredient.herbId,
        herbName: ingredient.herb.name,
        originalQuantity,
        scaledQuantity,
        unit: ingredient.unit,
        ratio: ingredient.ratio,
        processingNotes: ingredient.processingNotes,
        originalCost,
        scaledCost,
      })
    }

    // Calculate costs
    const originalTotalCost = (formula.basePrice?.toNumber() || 0) + (formula.laborCost?.toNumber() || 0)
    const scaledTotalCost = originalTotalCost * scaleFactor
    const costPerUnit = formula.yieldAmount ? scaledTotalCost / (formula.yieldAmount.toNumber() * scaleFactor) : 0

    // Generate recommendations
    const recommendations: string[] = []

    if (scaleFactor > 1) {
      recommendations.push(`Scaling up by ${scaleFactor.toFixed(2)}x - consider preparation time increase`)
      if (scaleFactor > 5) {
        recommendations.push("Large scale increase - verify equipment capacity and storage requirements")
      }
    } else if (scaleFactor < 1) {
      recommendations.push(`Scaling down by ${(1/scaleFactor).toFixed(2)}x - adjust preparation techniques for smaller batches`)
      if (scaleFactor < 0.2) {
        recommendations.push("Very small batch - consider minimum viable quantities for accurate measurements")
      }
    }

    if (unavailableIngredients.length > 0) {
      recommendations.push(`Stock up on unavailable ingredients: ${unavailableIngredients.join(", ")}`)
    }

    if (partiallyAvailableIngredients.length > 0) {
      recommendations.push("Check partial availability for some ingredients - consider ordering more stock")
    }

    if (scaledIngredients.some(i => i.scaledQuantity < 0.1)) {
      recommendations.push("Some ingredients have very small quantities - ensure measurement accuracy")
    }

    // Estimate preparation time scaling (not always linear)
    let estimatedPreparationTime: number | undefined
    if (formula.prepTime) {
      const baseTime = formula.prepTime
      // Time scaling is typically not linear - smaller batches take proportionally longer
      const timeScaleFactor = scaleFactor > 1 
        ? Math.pow(scaleFactor, 0.7) // Economies of scale
        : Math.pow(scaleFactor, 0.5) // Smaller batches less efficient
      estimatedPreparationTime = Math.round(baseTime * timeScaleFactor)
    }

    const result: ScalingResult = {
      formulaId: formula.id,
      formulaName: formula.name,
      originalYield: formula.yieldAmount?.toNumber() || null,
      originalYieldUnit: formula.yieldUnit,
      scaleFactor,
      targetYield: scalingParams.targetYield,
      targetYieldUnit: scalingParams.targetYieldUnit,
      scaledIngredients,
      costCalculation: {
        originalTotalCost,
        scaledTotalCost,
        costPerUnit,
        estimatedPreparationTime,
      },
      availabilityCheck: {
        allIngredientsAvailable: unavailableIngredients.length === 0 && partiallyAvailableIngredients.length === 0,
        unavailableIngredients,
        partiallyAvailableIngredients,
      },
      recommendations,
    }

    // Audit the scaling operation
    await auditPHIAccess(
      "read",
      "FormulaScaling",
      formulaId,
      session.user.id,
      session.user.role,
      ["formula_data", "ingredient_calculations"],
      AuditOutcome.SUCCESS,
      {
        formulaName: formula.name,
        scaleFactor,
        targetYield: scalingParams.targetYield,
        originalCost: originalTotalCost,
        scaledCost: scaledTotalCost,
        allIngredientsAvailable: result.availabilityCheck.allIngredientsAvailable,
      }
    )

    return NextResponse.json({
      success: true,
      scaling: result,
      message: "Formula scaled successfully",
    })
  } catch (error) {
    console.error("Error scaling formula:", error)
    
    // Audit the failed scaling attempt
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "read",
          "FormulaScaling",
          params.id,
          session.user.id,
          session.user.role,
          ["attempted_scaling"],
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