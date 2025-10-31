"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Scale, 
  Calculator, 
  AlertTriangle,
  CheckCircle,
  Info,
  Beaker,
  Clock,
  DollarSign,
  Package,
  TrendingUp,
  RotateCcw,
  Save,
  Copy
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface FormulaScalerProps {
  formulaId: string
  formulaName: string
  originalYield?: number
  originalYieldUnit?: string
  onScalingComplete?: (scaledData: any) => void
}

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

export function FormulaScaler({ 
  formulaId, 
  formulaName, 
  originalYield, 
  originalYieldUnit,
  onScalingComplete 
}: FormulaScalerProps) {
  const [scalingMode, setScalingMode] = useState<"factor" | "yield">("factor")
  const [scaleFactor, setScaleFactor] = useState<number>(1)
  const [targetYield, setTargetYield] = useState<number>(originalYield || 100)
  const [targetYieldUnit, setTargetYieldUnit] = useState<string>(originalYieldUnit || "ml")
  const [roundingPrecision, setRoundingPrecision] = useState<string>("0.01")
  
  const [scalingResult, setScalingResult] = useState<ScalingResult | null>(null)
  const [isScaling, setIsScaling] = useState(false)
  const [presetBatchSizes, setPresetBatchSizes] = useState<number[]>([0.5, 1, 2, 5, 10])

  // Calculate scale factor from target yield
  useEffect(() => {
    if (scalingMode === "yield" && originalYield && targetYield) {
      const calculatedFactor = targetYield / originalYield
      setScaleFactor(calculatedFactor)
    }
  }, [scalingMode, originalYield, targetYield])

  // Calculate target yield from scale factor
  useEffect(() => {
    if (scalingMode === "factor" && originalYield && scaleFactor) {
      const calculatedYield = originalYield * scaleFactor
      setTargetYield(calculatedYield)
    }
  }, [scalingMode, originalYield, scaleFactor])

  // Perform scaling calculation
  const performScaling = async () => {
    try {
      setIsScaling(true)
      
      const requestBody = {
        scaleFactor,
        targetYield: scalingMode === "yield" ? targetYield : undefined,
        targetYieldUnit: scalingMode === "yield" ? targetYieldUnit : undefined,
        roundingPrecision,
      }

      const response = await fetch(`/api/formulas/${formulaId}/scale`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to scale formula")
      }

      const result = await response.json()
      setScalingResult(result.scaling)
      
      if (onScalingComplete) {
        onScalingComplete(result.scaling)
      }
      
      toast.success("Formula scaled successfully")
    } catch (error) {
      console.error("Error scaling formula:", error)
      toast.error(error instanceof Error ? error.message : "Failed to scale formula")
    } finally {
      setIsScaling(false)
    }
  }

  // Reset to original values
  const resetScaling = () => {
    setScaleFactor(1)
    setTargetYield(originalYield || 100)
    setTargetYieldUnit(originalYieldUnit || "ml")
    setScalingResult(null)
  }

  // Quick preset scaling
  const applyPresetScale = (factor: number) => {
    setScalingMode("factor")
    setScaleFactor(factor)
  }

  // Save scaled formula as new version
  const saveScaledFormula = async () => {
    if (!scalingResult) return
    
    try {
      const response = await fetch(`/api/formulas/${formulaId}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changes: `Scaled formula by factor of ${scaleFactor.toFixed(2)}x`,
          versionNotes: `Target yield: ${targetYield} ${targetYieldUnit}`,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`New formula version created: v${result.version.version}`)
      } else {
        throw new Error("Failed to save scaled formula")
      }
    } catch (error) {
      console.error("Error saving scaled formula:", error)
      toast.error("Failed to save scaled formula")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Formula Scaling: {formulaName}
          </CardTitle>
          <CardDescription>
            Scale your formula to different batch sizes while maintaining precise ratios
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={scalingMode} onValueChange={(value) => setScalingMode(value as "factor" | "yield")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="factor">Scale by Factor</TabsTrigger>
              <TabsTrigger value="yield">Scale by Yield</TabsTrigger>
            </TabsList>

            <TabsContent value="factor" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scaleFactor">Scale Factor</Label>
                  <Input
                    id="scaleFactor"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    value={scaleFactor}
                    onChange={(e) => setScaleFactor(parseFloat(e.target.value) || 1)}
                    placeholder="1.0"
                  />
                  <p className="text-sm text-muted-foreground">
                    1.0 = original size, 2.0 = double, 0.5 = half
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Quick Presets</Label>
                  <div className="flex gap-2 flex-wrap">
                    {presetBatchSizes.map((factor) => (
                      <Button
                        key={factor}
                        variant={scaleFactor === factor ? "default" : "outline"}
                        size="sm"
                        onClick={() => applyPresetScale(factor)}
                      >
                        {factor}x
                      </Button>
                    ))}
                  </div>
                </div>

                {originalYield && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">Calculated Yield:</p>
                      <p className="text-blue-700">
                        {(originalYield * scaleFactor).toFixed(2)} {originalYieldUnit}
                        {scaleFactor !== 1 && (
                          <span className="ml-2 text-blue-600">
                            (from {originalYield} {originalYieldUnit})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="yield" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetYield">Target Yield</Label>
                  <Input
                    id="targetYield"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={targetYield}
                    onChange={(e) => setTargetYield(parseFloat(e.target.value) || 0)}
                    placeholder="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetYieldUnit">Unit</Label>
                  <Select value={targetYieldUnit} onValueChange={setTargetYieldUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ml">Milliliters (ml)</SelectItem>
                      <SelectItem value="grams">Grams</SelectItem>
                      <SelectItem value="ounces">Ounces</SelectItem>
                      <SelectItem value="cups">Cups</SelectItem>
                      <SelectItem value="doses">Doses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {originalYield && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm">
                    <p className="font-medium text-green-900">Scale Factor:</p>
                    <p className="text-green-700">
                      {scaleFactor.toFixed(2)}x 
                      {scaleFactor > 1 ? " (scaling up)" : scaleFactor < 1 ? " (scaling down)" : " (original size)"}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roundingPrecision">Rounding Precision</Label>
              <Select value={roundingPrecision} onValueChange={setRoundingPrecision}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Whole numbers (1)</SelectItem>
                  <SelectItem value="0.1">One decimal (0.1)</SelectItem>
                  <SelectItem value="0.01">Two decimals (0.01)</SelectItem>
                  <SelectItem value="0.001">Three decimals (0.001)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose precision for practical measurement accuracy
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                onClick={performScaling} 
                disabled={isScaling || scaleFactor <= 0}
                className="flex-1"
              >
                {isScaling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculate Scaling
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={resetScaling}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scaling Results */}
      {scalingResult && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Scaling Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {scalingResult.scaleFactor.toFixed(2)}x
                  </div>
                  <div className="text-sm text-blue-600">Scale Factor</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    ${scalingResult.costCalculation.scaledTotalCost.toFixed(2)}
                  </div>
                  <div className="text-sm text-green-600">Total Cost</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">
                    {scalingResult.scaledIngredients.length}
                  </div>
                  <div className="text-sm text-purple-600">Ingredients</div>
                </div>
              </div>

              {scalingResult.costCalculation.estimatedPreparationTime && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Estimated prep time: {scalingResult.costCalculation.estimatedPreparationTime} minutes
                </div>
              )}
            </CardContent>
          </Card>

          {/* Availability Warnings */}
          {(!scalingResult.availabilityCheck.allIngredientsAvailable) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Ingredient Availability Issues:</p>
                  {scalingResult.availabilityCheck.unavailableIngredients.length > 0 && (
                    <div>
                      <p className="text-sm text-red-600">Out of stock: {scalingResult.availabilityCheck.unavailableIngredients.join(", ")}</p>
                    </div>
                  )}
                  {scalingResult.availabilityCheck.partiallyAvailableIngredients.length > 0 && (
                    <div>
                      <p className="text-sm text-yellow-600">Insufficient stock:</p>
                      <ul className="text-xs ml-4">
                        {scalingResult.availabilityCheck.partiallyAvailableIngredients.map((item, idx) => (
                          <li key={idx}>
                            {item.name}: need {item.needed}, have {item.available}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Recommendations */}
          {scalingResult.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Scaling Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {scalingResult.recommendations.map((recommendation, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Scaled Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Scaled Ingredients
              </CardTitle>
              <CardDescription>
                Ingredient quantities adjusted for the new batch size
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scalingResult.scaledIngredients.map((ingredient, idx) => (
                  <div key={ingredient.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{ingredient.herbName}</div>
                      <div className="text-sm text-muted-foreground">
                        Original: {ingredient.originalQuantity} {ingredient.unit}
                        {ingredient.ratio && ` (${ingredient.ratio})`}
                      </div>
                      {ingredient.processingNotes && (
                        <div className="text-xs text-blue-600 mt-1">
                          {ingredient.processingNotes}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {ingredient.scaledQuantity} {ingredient.unit}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Cost: ${ingredient.scaledCost.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total Cost:</span>
                <span>${scalingResult.costCalculation.scaledTotalCost.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Cost per unit:</span>
                <span>${scalingResult.costCalculation.costPerUnit.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Button onClick={saveScaledFormula} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save as New Version
                </Button>

                <Button variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(scalingResult, null, 2))}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Results
                </Button>

                <Button variant="outline" onClick={() => window.print()}>
                  Print Recipe
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}