import { Decimal } from "@prisma/client/runtime/library"

export interface ScalingOptions {
  scaleFactor?: number
  targetYield?: number
  currentYield?: number
  roundingPrecision?: number
  minimumQuantity?: number
  maximumQuantity?: number
  preserveRatios?: boolean
}

export interface IngredientScaling {
  originalQuantity: number
  scaledQuantity: number
  unit: string
  scalingFactor: number
  roundingApplied: boolean
  withinLimits: boolean
  warnings: string[]
}

export interface ScalingResult {
  scaleFactor: number
  ingredients: Map<string, IngredientScaling>
  totalOriginalQuantity: number
  totalScaledQuantity: number
  ratiosPreserved: boolean
  warnings: string[]
  recommendations: string[]
}

export class FormulaScalingEngine {
  
  /**
   * Scale formula ingredients with precise ratio maintenance
   */
  static scaleFormula(
    ingredients: Array<{
      id: string
      quantity: number
      unit: string
      ratio?: string
    }>,
    options: ScalingOptions = {}
  ): ScalingResult {
    const {
      scaleFactor: providedScaleFactor,
      targetYield,
      currentYield,
      roundingPrecision = 0.01,
      minimumQuantity = 0.01,
      maximumQuantity = 10000,
      preserveRatios = true,
    } = options

    // Determine scale factor
    let scaleFactor = providedScaleFactor || 1
    
    if (targetYield && currentYield) {
      scaleFactor = targetYield / currentYield
    }

    const result: ScalingResult = {
      scaleFactor,
      ingredients: new Map(),
      totalOriginalQuantity: 0,
      totalScaledQuantity: 0,
      ratiosPreserved: true,
      warnings: [],
      recommendations: []
    }

    // Calculate total original quantity for ratio preservation
    const totalOriginal = ingredients.reduce((sum, ing) => sum + ing.quantity, 0)
    result.totalOriginalQuantity = totalOriginal

    // Scale each ingredient
    for (const ingredient of ingredients) {
      const scaling = this.scaleIngredient(
        ingredient.quantity,
        scaleFactor,
        {
          unit: ingredient.unit,
          roundingPrecision,
          minimumQuantity,
          maximumQuantity,
          ratio: ingredient.ratio,
        }
      )

      result.ingredients.set(ingredient.id, scaling)
      result.totalScaledQuantity += scaling.scaledQuantity

      // Collect warnings
      if (scaling.warnings.length > 0) {
        result.warnings.push(...scaling.warnings.map(w => `${ingredient.id}: ${w}`))
      }

      // Check if scaling maintains ratios
      if (preserveRatios && scaling.roundingApplied) {
        const expectedRatio = ingredient.quantity / totalOriginal
        const actualRatio = scaling.scaledQuantity / result.totalScaledQuantity
        const ratioDifference = Math.abs(expectedRatio - actualRatio)
        
        if (ratioDifference > 0.01) { // 1% tolerance
          result.ratiosPreserved = false
          result.warnings.push(`Ratio deviation for ${ingredient.id}: expected ${(expectedRatio * 100).toFixed(2)}%, got ${(actualRatio * 100).toFixed(2)}%`)
        }
      }
    }

    // Generate recommendations
    result.recommendations = this.generateScalingRecommendations(result, options)

    return result
  }

  /**
   * Scale a single ingredient with proper rounding and validation
   */
  static scaleIngredient(
    originalQuantity: number,
    scaleFactor: number,
    options: {
      unit: string
      roundingPrecision: number
      minimumQuantity: number
      maximumQuantity: number
      ratio?: string
    }
  ): IngredientScaling {
    const { unit, roundingPrecision, minimumQuantity, maximumQuantity } = options

    const rawScaledQuantity = originalQuantity * scaleFactor
    let scaledQuantity = this.roundToPrecision(rawScaledQuantity, roundingPrecision)
    
    const scaling: IngredientScaling = {
      originalQuantity,
      scaledQuantity,
      unit,
      scalingFactor: scaleFactor,
      roundingApplied: Math.abs(rawScaledQuantity - scaledQuantity) > 0.001,
      withinLimits: true,
      warnings: []
    }

    // Apply minimum quantity constraints
    if (scaledQuantity < minimumQuantity) {
      scaling.warnings.push(`Quantity ${scaledQuantity} ${unit} below minimum ${minimumQuantity} ${unit}`)
      scaledQuantity = minimumQuantity
      scaling.scaledQuantity = scaledQuantity
      scaling.withinLimits = false
    }

    // Apply maximum quantity constraints
    if (scaledQuantity > maximumQuantity) {
      scaling.warnings.push(`Quantity ${scaledQuantity} ${unit} exceeds maximum ${maximumQuantity} ${unit}`)
      scaledQuantity = maximumQuantity
      scaling.scaledQuantity = scaledQuantity
      scaling.withinLimits = false
    }

    // Unit-specific warnings and adjustments
    scaling.warnings.push(...this.getUnitSpecificWarnings(scaledQuantity, unit))

    return scaling
  }

  /**
   * Round to specified precision with proper handling of floating point
   */
  static roundToPrecision(value: number, precision: number): number {
    const factor = 1 / precision
    return Math.round(value * factor) / factor
  }

  /**
   * Generate practical measurement recommendations
   */
  static generatePracticalMeasurements(
    quantity: number,
    unit: string
  ): Array<{ amount: number; unit: string; description: string }> {
    const measurements: Array<{ amount: number; unit: string; description: string }> = []

    // Convert to practical kitchen measurements
    switch (unit.toLowerCase()) {
      case "grams":
      case "g":
        if (quantity >= 1000) {
          measurements.push({
            amount: quantity / 1000,
            unit: "kg",
            description: `${(quantity / 1000).toFixed(2)} kg`
          })
        }
        if (quantity >= 15) {
          measurements.push({
            amount: quantity / 15,
            unit: "tablespoons",
            description: `~${(quantity / 15).toFixed(1)} tablespoons (approx)`
          })
        }
        if (quantity >= 5) {
          measurements.push({
            amount: quantity / 5,
            unit: "teaspoons",
            description: `~${(quantity / 5).toFixed(1)} teaspoons (approx)`
          })
        }
        break

      case "ml":
      case "milliliters":
        if (quantity >= 1000) {
          measurements.push({
            amount: quantity / 1000,
            unit: "liters",
            description: `${(quantity / 1000).toFixed(2)} L`
          })
        }
        if (quantity >= 240) {
          measurements.push({
            amount: quantity / 240,
            unit: "cups",
            description: `~${(quantity / 240).toFixed(1)} cups`
          })
        }
        if (quantity >= 15) {
          measurements.push({
            amount: quantity / 15,
            unit: "tablespoons",
            description: `${(quantity / 15).toFixed(1)} tablespoons`
          })
        }
        if (quantity >= 5) {
          measurements.push({
            amount: quantity / 5,
            unit: "teaspoons",
            description: `${(quantity / 5).toFixed(1)} teaspoons`
          })
        }
        break

      case "ounces":
      case "oz":
        if (quantity >= 16) {
          measurements.push({
            amount: quantity / 16,
            unit: "pounds",
            description: `${(quantity / 16).toFixed(2)} lbs`
          })
        }
        measurements.push({
          amount: quantity * 28.35,
          unit: "grams",
          description: `${(quantity * 28.35).toFixed(1)} g`
        })
        break

      case "drops":
        if (quantity >= 20) {
          measurements.push({
            amount: quantity / 20,
            unit: "ml",
            description: `~${(quantity / 20).toFixed(1)} ml (approx)`
          })
        }
        break
    }

    return measurements
  }

  /**
   * Get unit-specific warnings and recommendations
   */
  private static getUnitSpecificWarnings(quantity: number, unit: string): string[] {
    const warnings: string[] = []

    switch (unit.toLowerCase()) {
      case "drops":
        if (quantity > 100) {
          warnings.push("Large number of drops - consider measuring in ml instead")
        }
        if (quantity < 1) {
          warnings.push("Fractional drops difficult to measure accurately")
        }
        break

      case "grams":
      case "g":
        if (quantity < 0.1) {
          warnings.push("Very small quantity - ensure scale accuracy to 0.01g")
        }
        if (quantity > 5000) {
          warnings.push("Large quantity - consider measuring in kg")
        }
        break

      case "ml":
      case "milliliters":
        if (quantity < 0.5) {
          warnings.push("Very small volume - use graduated pipette for accuracy")
        }
        if (quantity > 2000) {
          warnings.push("Large volume - consider measuring in liters")
        }
        break

      case "ounces":
      case "oz":
        if (quantity < 0.1) {
          warnings.push("Small quantity in ounces - consider grams for precision")
        }
        break

      case "parts":
        if (quantity < 0.1) {
          warnings.push("Fractional parts may be difficult to scale accurately")
        }
        break

      case "percentage":
      case "%":
        if (quantity < 0.1) {
          warnings.push("Very small percentage - verify measurement precision")
        }
        if (quantity > 50) {
          warnings.push("High percentage - verify this is intended")
        }
        break
    }

    return warnings
  }

  /**
   * Generate scaling recommendations based on results
   */
  private static generateScalingRecommendations(
    result: ScalingResult,
    options: ScalingOptions
  ): string[] {
    const recommendations: string[] = []

    // Scale factor recommendations
    if (result.scaleFactor > 10) {
      recommendations.push("Very large scale increase - consider batch production techniques")
      recommendations.push("Verify equipment capacity for large batches")
      recommendations.push("Consider storage requirements for increased quantities")
    } else if (result.scaleFactor > 5) {
      recommendations.push("Large scale increase - adjust preparation time expectations")
      recommendations.push("Ensure adequate workspace and equipment")
    } else if (result.scaleFactor < 0.1) {
      recommendations.push("Very small batch - use precision measuring tools")
      recommendations.push("Consider minimum viable quantities for accuracy")
    } else if (result.scaleFactor < 0.5) {
      recommendations.push("Small batch scaling - ensure measurement precision")
    }

    // Ratio preservation recommendations
    if (!result.ratiosPreserved) {
      recommendations.push("Ratios not perfectly preserved due to rounding - review ingredient proportions")
      recommendations.push("Consider adjusting rounding precision if ratio accuracy is critical")
    }

    // Quantity-specific recommendations
    let hasVerySmallQuantities = false
    let hasVeryLargeQuantities = false

    for (const [_, scaling] of result.ingredients) {
      if (scaling.scaledQuantity < 0.1) {
        hasVerySmallQuantities = true
      }
      if (scaling.scaledQuantity > 1000) {
        hasVeryLargeQuantities = true
      }
    }

    if (hasVerySmallQuantities) {
      recommendations.push("Some ingredients have very small quantities - use precision scales")
      recommendations.push("Consider alternative measurement units for small quantities")
    }

    if (hasVeryLargeQuantities) {
      recommendations.push("Some ingredients have large quantities - verify storage capacity")
      recommendations.push("Consider breaking into multiple smaller batches")
    }

    // Preparation recommendations
    if (result.scaleFactor !== 1) {
      recommendations.push("Preparation time may not scale linearly - adjust timing expectations")
      
      if (result.scaleFactor > 1) {
        recommendations.push("Larger batches may require modified mixing techniques")
      } else {
        recommendations.push("Smaller batches may require more careful temperature control")
      }
    }

    return recommendations
  }

  /**
   * Calculate optimal batch sizes based on available ingredients
   */
  static calculateOptimalBatchSizes(
    ingredients: Array<{
      id: string
      herbId: string
      quantity: number
      unit: string
      availableQuantity: number
    }>,
    options: {
      minBatches?: number
      maxBatches?: number
      preferredBatchCount?: number
    } = {}
  ): Array<{
    batchCount: number
    scaleFactor: number
    feasible: boolean
    limitingIngredient?: string
    utilizationRate: number
  }> {
    const { minBatches = 1, maxBatches = 10, preferredBatchCount = 3 } = options

    const results: Array<{
      batchCount: number
      scaleFactor: number
      feasible: boolean
      limitingIngredient?: string
      utilizationRate: number
    }> = []

    // Find the limiting ingredient (lowest availability ratio)
    let maxPossibleBatches = Infinity
    let limitingIngredient = ""

    for (const ingredient of ingredients) {
      const possibleBatches = Math.floor(ingredient.availableQuantity / ingredient.quantity)
      if (possibleBatches < maxPossibleBatches) {
        maxPossibleBatches = possibleBatches
        limitingIngredient = ingredient.id
      }
    }

    // Generate batch size options
    const actualMaxBatches = Math.min(maxBatches, maxPossibleBatches)

    for (let batchCount = minBatches; batchCount <= actualMaxBatches; batchCount++) {
      const scaleFactor = batchCount
      let feasible = true
      let totalUtilization = 0

      // Check feasibility and calculate utilization
      for (const ingredient of ingredients) {
        const requiredQuantity = ingredient.quantity * scaleFactor
        const available = ingredient.availableQuantity
        
        if (requiredQuantity > available) {
          feasible = false
        }
        
        const utilization = available > 0 ? (requiredQuantity / available) : 0
        totalUtilization += utilization
      }

      const averageUtilization = totalUtilization / ingredients.length

      results.push({
        batchCount,
        scaleFactor,
        feasible,
        limitingIngredient: feasible ? undefined : limitingIngredient,
        utilizationRate: averageUtilization
      })
    }

    // Sort by preference: feasible first, then by proximity to preferred batch count
    return results.sort((a, b) => {
      if (a.feasible !== b.feasible) {
        return a.feasible ? -1 : 1
      }
      
      const aDistance = Math.abs(a.batchCount - preferredBatchCount)
      const bDistance = Math.abs(b.batchCount - preferredBatchCount)
      
      return aDistance - bDistance
    })
  }

  /**
   * Convert between different unit systems
   */
  static convertUnits(
    quantity: number,
    fromUnit: string,
    toUnit: string
  ): { quantity: number; conversionFactor: number; approximate: boolean } {
    const conversions: { [key: string]: { [key: string]: number } } = {
      // Weight conversions
      "grams": { "kg": 0.001, "ounces": 0.035274, "pounds": 0.002205 },
      "kg": { "grams": 1000, "ounces": 35.274, "pounds": 2.205 },
      "ounces": { "grams": 28.35, "kg": 0.02835, "pounds": 0.0625 },
      "pounds": { "grams": 453.6, "kg": 0.4536, "ounces": 16 },
      
      // Volume conversions
      "ml": { "liters": 0.001, "cups": 0.004167, "tablespoons": 0.067628, "teaspoons": 0.202884, "drops": 20 },
      "liters": { "ml": 1000, "cups": 4.167, "tablespoons": 67.628, "teaspoons": 202.884 },
      "cups": { "ml": 240, "liters": 0.24, "tablespoons": 16, "teaspoons": 48 },
      "tablespoons": { "ml": 15, "cups": 0.0625, "teaspoons": 3 },
      "teaspoons": { "ml": 5, "cups": 0.0208, "tablespoons": 0.333 },
      "drops": { "ml": 0.05 }
    }

    const fromKey = fromUnit.toLowerCase()
    const toKey = toUnit.toLowerCase()

    if (conversions[fromKey] && conversions[fromKey][toKey]) {
      const conversionFactor = conversions[fromKey][toKey]
      return {
        quantity: quantity * conversionFactor,
        conversionFactor,
        approximate: false
      }
    }

    // No direct conversion available
    return {
      quantity,
      conversionFactor: 1,
      approximate: true
    }
  }
}