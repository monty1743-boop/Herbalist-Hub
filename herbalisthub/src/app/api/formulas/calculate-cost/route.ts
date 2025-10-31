import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { Role } from "@prisma/client"
import { FormulaCostCalculator } from "@/lib/formulas/cost-calculation"

// POST - Calculate real-time costs for formula ingredients
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can calculate costs
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { 
      ingredients, 
      laborCost = 0, 
      markupPercent = 50, 
      yieldAmount = 1, 
      yieldUnit = "batch",
      overheadPercent = 20,
      profitMarginPercent = 30
    } = body

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: "Ingredients array is required" }, { status: 400 })
    }

    // Validate ingredients format
    for (const ingredient of ingredients) {
      if (!ingredient.herbId || typeof ingredient.quantity !== "number" || !ingredient.unit) {
        return NextResponse.json({ 
          error: "Each ingredient must have herbId, quantity, and unit" 
        }, { status: 400 })
      }
    }

    // Calculate real-time costs
    const costBreakdown = await FormulaCostCalculator.calculateRealTimeCost(
      ingredients,
      {
        includeLabor: true,
        laborRate: 50, // $50/hour default
        laborTime: laborCost > 0 ? (laborCost / 50) * 60 : 60, // Convert back to minutes
        overheadPercent,
        markupPercent,
        profitMarginPercent,
      }
    )

    // Calculate per-unit costs
    const costPerUnit = costBreakdown.pricing.finalPrice / yieldAmount
    const pricePerUnit = costBreakdown.pricing.finalPrice / yieldAmount

    const response = {
      ...costBreakdown,
      perUnit: {
        costPerUnit,
        pricePerUnit,
        yieldAmount,
        yieldUnit,
      },
      calculations: {
        baseIngredientsCost: costBreakdown.subtotals.ingredientsCost,
        laborCost: costBreakdown.subtotals.laborCost,
        overheadCost: costBreakdown.subtotals.overheadCost,
        subtotal: costBreakdown.subtotals.subtotal,
        markupAmount: costBreakdown.pricing.markup.amount,
        finalPrice: costBreakdown.pricing.finalPrice,
      },
      warnings: [],
      recommendations: []
    }

    // Add warnings for ingredient availability
    const warnings: string[] = []
    const recommendations: string[] = []

    costBreakdown.ingredients.forEach(ingredient => {
      if (!ingredient.availability.sufficient) {
        warnings.push(`${ingredient.herbName}: Only ${ingredient.availability.available} ${ingredient.unit} available, need ${ingredient.quantity}`)
      }
      
      if (ingredient.availability.available === 0) {
        recommendations.push(`Consider finding an alternative supplier for ${ingredient.herbName}`)
      }
    })

    // Add cost-based recommendations
    const profitMargin = ((costBreakdown.pricing.finalPrice - costBreakdown.subtotals.subtotal) / costBreakdown.pricing.finalPrice) * 100

    if (profitMargin < 20) {
      recommendations.push("Consider increasing markup percentage to improve profit margins")
    } else if (profitMargin > 80) {
      recommendations.push("Very high profit margins - consider competitive pricing")
    }

    if (costBreakdown.subtotals.ingredientsCost > costBreakdown.subtotals.laborCost * 10) {
      recommendations.push("Ingredient costs are very high relative to labor - consider ingredient substitutions")
    }

    response.warnings = warnings
    response.recommendations = recommendations

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error calculating formula costs:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}