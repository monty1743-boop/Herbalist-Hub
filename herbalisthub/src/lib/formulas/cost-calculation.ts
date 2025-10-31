import { prisma } from "@/lib/db/client"
import { Decimal } from "@prisma/client/runtime/library"

export interface IngredientCost {
  herbId: string
  herbName: string
  quantity: number
  unit: string
  costPerUnit: number
  totalCost: number
  availability: {
    available: number
    sufficient: boolean
  }
}

export interface CostBreakdown {
  ingredients: IngredientCost[]
  subtotals: {
    ingredientsCost: number
    laborCost: number
    overheadCost: number
    subtotal: number
  }
  pricing: {
    markup: {
      percent: number
      amount: number
    }
    finalPrice: number
    profitMargin: number
    profitAmount: number
  }
  perUnit: {
    costPerUnit: number
    pricePerUnit: number
    yieldAmount: number | null
    yieldUnit: string | null
  }
}

export interface CostCalculationOptions {
  includeLabor?: boolean
  includeProfitMargin?: boolean
  laborRate?: number // per hour
  laborTime?: number // in minutes
  overheadPercent?: number
  markupPercent?: number
  profitMarginPercent?: number
  yieldAmount?: number
  yieldUnit?: string
}

export class FormulaCostCalculator {
  
  /**
   * Calculate comprehensive cost breakdown for a formula
   */
  static async calculateFormulaCost(
    formulaId: string,
    options: CostCalculationOptions = {}
  ): Promise<CostBreakdown> {
    const {
      includeLabor = true,
      includeProfitMargin = true,
      laborRate = 50, // $50/hour default
      overheadPercent = 20,
      markupPercent = 50,
      profitMarginPercent = 30,
    } = options

    // Get formula with ingredients
    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      include: {
        ingredients: {
          include: {
            herb: {
              select: {
                id: true,
                name: true,
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
      throw new Error("Formula not found")
    }

    // Calculate ingredient costs
    const ingredientCosts: IngredientCost[] = []
    let totalIngredientCost = 0

    for (const ingredient of formula.ingredients) {
      const herbCostPerUnit = ingredient.herb.costPerUnit?.toNumber() || 0
      const ingredientQuantity = ingredient.quantity.toNumber()
      const totalCost = ingredientQuantity * herbCostPerUnit

      const available = ingredient.herb.quantity?.toNumber() || 0
      const sufficient = available >= ingredientQuantity

      ingredientCosts.push({
        herbId: ingredient.herbId,
        herbName: ingredient.herb.name,
        quantity: ingredientQuantity,
        unit: ingredient.unit,
        costPerUnit: herbCostPerUnit,
        totalCost,
        availability: {
          available,
          sufficient,
        }
      })

      totalIngredientCost += totalCost
    }

    // Calculate labor cost
    let laborCost = 0
    if (includeLabor) {
      const laborTime = options.laborTime || formula.prepTime || 60 // Default 1 hour
      laborCost = (laborTime / 60) * laborRate
    }

    // Calculate overhead
    const overheadCost = (totalIngredientCost + laborCost) * (overheadPercent / 100)

    // Calculate subtotal
    const subtotal = totalIngredientCost + laborCost + overheadCost

    // Calculate markup and final price
    const markupAmount = subtotal * (markupPercent / 100)
    const finalPrice = subtotal + markupAmount

    // Calculate profit margin if requested
    let profitMarginAmount = 0
    let adjustedFinalPrice = finalPrice

    if (includeProfitMargin) {
      profitMarginAmount = finalPrice * (profitMarginPercent / 100)
      adjustedFinalPrice = finalPrice + profitMarginAmount
    }

    // Calculate per-unit costs
    const yieldAmount = options.yieldAmount || formula.yieldAmount?.toNumber() || 1
    const yieldUnit = options.yieldUnit || formula.yieldUnit || "batch"

    const costPerUnit = subtotal / yieldAmount
    const pricePerUnit = adjustedFinalPrice / yieldAmount

    return {
      ingredients: ingredientCosts,
      subtotals: {
        ingredientsCost: totalIngredientCost,
        laborCost,
        overheadCost,
        subtotal,
      },
      pricing: {
        markup: {
          percent: markupPercent,
          amount: markupAmount,
        },
        finalPrice: adjustedFinalPrice,
        profitMargin: profitMarginPercent,
        profitAmount: profitMarginAmount,
      },
      perUnit: {
        costPerUnit,
        pricePerUnit,
        yieldAmount,
        yieldUnit,
      }
    }
  }

  /**
   * Calculate real-time cost updates when ingredient quantities change
   */
  static async calculateRealTimeCost(
    ingredients: Array<{
      herbId: string
      quantity: number
      unit: string
    }>,
    options: CostCalculationOptions = {}
  ): Promise<Omit<CostBreakdown, 'perUnit'> & { estimatedYield?: { amount: number; unit: string } }> {
    const {
      includeLabor = true,
      laborRate = 50,
      laborTime = 60,
      overheadPercent = 20,
      markupPercent = 50,
      profitMarginPercent = 30,
    } = options

    // Get current herb prices
    const herbIds = ingredients.map(i => i.herbId)
    const herbs = await prisma.herb.findMany({
      where: { id: { in: herbIds } },
      select: {
        id: true,
        name: true,
        quantity: true,
        unit: true,
        costPerUnit: true,
      }
    })

    const herbMap = new Map(herbs.map(herb => [herb.id, herb]))

    // Calculate ingredient costs
    const ingredientCosts: IngredientCost[] = []
    let totalIngredientCost = 0

    for (const ingredient of ingredients) {
      const herb = herbMap.get(ingredient.herbId)
      if (!herb) continue

      const herbCostPerUnit = herb.costPerUnit?.toNumber() || 0
      const totalCost = ingredient.quantity * herbCostPerUnit

      const available = herb.quantity?.toNumber() || 0
      const sufficient = available >= ingredient.quantity

      ingredientCosts.push({
        herbId: ingredient.herbId,
        herbName: herb.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        costPerUnit: herbCostPerUnit,
        totalCost,
        availability: {
          available,
          sufficient,
        }
      })

      totalIngredientCost += totalCost
    }

    // Calculate labor cost
    let laborCost = 0
    if (includeLabor && laborTime) {
      laborCost = (laborTime / 60) * laborRate
    }

    // Calculate overhead
    const overheadCost = (totalIngredientCost + laborCost) * (overheadPercent / 100)

    // Calculate subtotal
    const subtotal = totalIngredientCost + laborCost + overheadCost

    // Calculate markup and final price
    const markupAmount = subtotal * (markupPercent / 100)
    const finalPrice = subtotal + markupAmount

    // Calculate profit margin
    const profitMarginAmount = finalPrice * (profitMarginPercent / 100)
    const adjustedFinalPrice = finalPrice + profitMarginAmount

    return {
      ingredients: ingredientCosts,
      subtotals: {
        ingredientsCost: totalIngredientCost,
        laborCost,
        overheadCost,
        subtotal,
      },
      pricing: {
        markup: {
          percent: markupPercent,
          amount: markupAmount,
        },
        finalPrice: adjustedFinalPrice,
        profitMargin: profitMarginPercent,
        profitAmount: profitMarginAmount,
      }
    }
  }

  /**
   * Update formula costs in database after price changes
   */
  static async updateFormulaCosts(formulaId: string): Promise<void> {
    const costBreakdown = await this.calculateFormulaCost(formulaId)

    await prisma.formula.update({
      where: { id: formulaId },
      data: {
        basePrice: costBreakdown.subtotals.ingredientsCost,
        laborCost: costBreakdown.subtotals.laborCost,
        finalPrice: costBreakdown.pricing.finalPrice,
      }
    })

    // Update individual ingredient costs
    for (const ingredient of costBreakdown.ingredients) {
      await prisma.formulaIngredient.updateMany({
        where: {
          formulaId,
          herbId: ingredient.herbId,
        },
        data: {
          costPerUnit: ingredient.costPerUnit,
          totalCost: ingredient.totalCost,
        }
      })
    }
  }

  /**
   * Batch update costs for multiple formulas (useful when herb prices change)
   */
  static async batchUpdateFormulaCosts(formulaIds: string[]): Promise<{
    updated: number
    failed: string[]
    summary: { formulaId: string; oldCost: number; newCost: number }[]
  }> {
    const results = {
      updated: 0,
      failed: [] as string[],
      summary: [] as { formulaId: string; oldCost: number; newCost: number }[]
    }

    for (const formulaId of formulaIds) {
      try {
        // Get current cost
        const currentFormula = await prisma.formula.findUnique({
          where: { id: formulaId },
          select: { finalPrice: true }
        })

        const oldCost = currentFormula?.finalPrice?.toNumber() || 0

        // Update costs
        await this.updateFormulaCosts(formulaId)

        // Get new cost
        const updatedFormula = await prisma.formula.findUnique({
          where: { id: formulaId },
          select: { finalPrice: true }
        })

        const newCost = updatedFormula?.finalPrice?.toNumber() || 0

        results.updated++
        results.summary.push({
          formulaId,
          oldCost,
          newCost
        })
      } catch (error) {
        console.error(`Failed to update costs for formula ${formulaId}:`, error)
        results.failed.push(formulaId)
      }
    }

    return results
  }

  /**
   * Get cost comparison between formulas
   */
  static async compareFormulaCosts(formulaIds: string[]): Promise<{
    formulas: Array<{
      id: string
      name: string
      costBreakdown: CostBreakdown
    }>
    comparison: {
      cheapest: { id: string; name: string; cost: number }
      mostExpensive: { id: string; name: string; cost: number }
      averageCost: number
      costSpread: number
    }
  }> {
    const formulas = []
    let totalCost = 0
    let minCost = Infinity
    let maxCost = 0
    let cheapest = { id: "", name: "", cost: 0 }
    let mostExpensive = { id: "", name: "", cost: 0 }

    for (const formulaId of formulaIds) {
      try {
        const formula = await prisma.formula.findUnique({
          where: { id: formulaId },
          select: { id: true, name: true }
        })

        if (!formula) continue

        const costBreakdown = await this.calculateFormulaCost(formulaId)
        const cost = costBreakdown.pricing.finalPrice

        formulas.push({
          id: formula.id,
          name: formula.name,
          costBreakdown
        })

        totalCost += cost

        if (cost < minCost) {
          minCost = cost
          cheapest = { id: formula.id, name: formula.name, cost }
        }

        if (cost > maxCost) {
          maxCost = cost
          mostExpensive = { id: formula.id, name: formula.name, cost }
        }
      } catch (error) {
        console.error(`Failed to calculate costs for formula ${formulaId}:`, error)
      }
    }

    const averageCost = formulas.length > 0 ? totalCost / formulas.length : 0
    const costSpread = maxCost - minCost

    return {
      formulas,
      comparison: {
        cheapest,
        mostExpensive,
        averageCost,
        costSpread
      }
    }
  }

  /**
   * Calculate cost trends over time (requires historical data)
   */
  static async calculateCostTrends(
    formulaId: string,
    days: number = 30
  ): Promise<{
    current: number
    historical: Array<{ date: string; cost: number }>
    trend: "increasing" | "decreasing" | "stable"
    changePercent: number
  }> {
    // This would require historical cost tracking in the database
    // For now, return current cost and suggest implementing cost history tracking
    const currentCost = await this.calculateFormulaCost(formulaId)
    
    return {
      current: currentCost.pricing.finalPrice,
      historical: [], // Would need cost_history table
      trend: "stable",
      changePercent: 0
    }
  }
}