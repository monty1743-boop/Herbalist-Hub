"use client"

import { useState, useEffect, useCallback } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Calculator, 
  AlertTriangle, 
  CheckCircle,
  Search,
  Filter,
  Beaker,
  Scale,
  Clock,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { IngredientSelector } from "@/components/formulas/IngredientSelector"
import { RatioEditor } from "@/components/formulas/RatioEditor"
import { type FormulaInput, type FormulaIngredientInput } from "@/lib/validation/formula"

interface FormulaBuilderProps {
  formula: Partial<FormulaInput>
  errors: Record<string, string>
  onChange: (formula: Partial<FormulaInput>) => void
  onValidationErrors: (errors: Record<string, string>) => void
  onWarnings: (warnings: string[]) => void
}

interface CostCalculation {
  ingredientsCost: number
  laborCost: number
  totalCost: number
  finalPrice: number
  costPerUnit: number
}

export function FormulaBuilder({ 
  formula, 
  errors, 
  onChange, 
  onValidationErrors, 
  onWarnings 
}: FormulaBuilderProps) {
  const [costCalculation, setCostCalculation] = useState<CostCalculation>({
    ingredientsCost: 0,
    laborCost: 0,
    totalCost: 0,
    finalPrice: 0,
    costPerUnit: 0,
  })
  const [isCalculatingCost, setIsCalculatingCost] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // Update formula field
  const updateFormula = useCallback((field: keyof FormulaInput, value: any) => {
    const updatedFormula = { ...formula, [field]: value }
    onChange(updatedFormula)
  }, [formula, onChange])

  // Update ingredient in the list
  const updateIngredient = useCallback((index: number, ingredient: Partial<FormulaIngredientInput>) => {
    const ingredients = [...(formula.ingredients || [])]
    ingredients[index] = { ...ingredients[index], ...ingredient }
    updateFormula("ingredients", ingredients)
  }, [formula.ingredients, updateFormula])

  // Add new ingredient
  const addIngredient = useCallback((herbId: string, herbName: string) => {
    const newIngredient: FormulaIngredientInput = {
      herbId,
      quantity: 1,
      unit: "grams",
      ratio: "",
      processingNotes: "",
    }
    
    const ingredients = [...(formula.ingredients || []), newIngredient]
    updateFormula("ingredients", ingredients)
    toast.success(`Added ${herbName} to formula`)
  }, [formula.ingredients, updateFormula])

  // Remove ingredient
  const removeIngredient = useCallback((index: number) => {
    const ingredients = [...(formula.ingredients || [])]
    ingredients.splice(index, 1)
    updateFormula("ingredients", ingredients)
  }, [formula.ingredients, updateFormula])

  // Handle drag and drop reordering
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return

    const ingredients = [...(formula.ingredients || [])]
    const [reorderedItem] = ingredients.splice(result.source.index, 1)
    ingredients.splice(result.destination.index, 0, reorderedItem)
    
    updateFormula("ingredients", ingredients)
  }, [formula.ingredients, updateFormula])

  // Calculate costs in real-time
  useEffect(() => {
    const calculateCosts = async () => {
      if (!formula.ingredients || formula.ingredients.length === 0) {
        setCostCalculation({
          ingredientsCost: 0,
          laborCost: 0,
          totalCost: 0,
          finalPrice: 0,
          costPerUnit: 0,
        })
        return
      }

      setIsCalculatingCost(true)
      
      try {
        const response = await fetch("/api/formulas/calculate-cost", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ingredients: formula.ingredients,
            laborCost: formula.laborCost || 0,
            markupPercent: formula.markupPercent || 50,
            yieldAmount: formula.yieldAmount || 1,
            yieldUnit: formula.yieldUnit || "batch",
          }),
        })

        if (response.ok) {
          const result = await response.json()
          setCostCalculation({
            ingredientsCost: result.subtotals.ingredientsCost,
            laborCost: result.subtotals.laborCost,
            totalCost: result.subtotals.subtotal,
            finalPrice: result.pricing.finalPrice,
            costPerUnit: result.pricing.finalPrice / (formula.yieldAmount || 1),
          })

          // Check for availability warnings
          const warnings: string[] = []
          result.ingredients.forEach((ingredient: any) => {
            if (!ingredient.availability.sufficient) {
              warnings.push(`${ingredient.herbName}: Only ${ingredient.availability.available} ${ingredient.unit} available, need ${ingredient.quantity}`)
            }
          })
          onWarnings(warnings)
        }
      } catch (error) {
        console.error("Error calculating costs:", error)
      } finally {
        setIsCalculatingCost(false)
      }
    }

    const debounceTimer = setTimeout(calculateCosts, 500)
    return () => clearTimeout(debounceTimer)
  }, [formula.ingredients, formula.laborCost, formula.markupPercent, formula.yieldAmount, formula.yieldUnit, onWarnings])

  // Validate percentages sum to 100% for percentage-based ratios
  const validateRatios = useCallback(() => {
    if (!formula.ingredients) return

    const percentageIngredients = formula.ingredients.filter(ing => ing.unit === "percentage")
    if (percentageIngredients.length > 1) {
      const totalPercentage = percentageIngredients.reduce((sum, ing) => sum + ing.quantity, 0)
      if (Math.abs(totalPercentage - 100) > 0.1) {
        onValidationErrors({
          "ingredients.percentage": `Percentage ingredients should sum to 100%, currently ${totalPercentage.toFixed(1)}%`
        })
      } else {
        onValidationErrors({})
      }
    }
  }, [formula.ingredients, onValidationErrors])

  useEffect(() => {
    validateRatios()
  }, [validateRatios])

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="preparation">Preparation</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Formula Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Digestive Support Blend"
                value={formula.name || ""}
                onChange={(e) => updateFormula("name", e.target.value)}
                className={cn(errors["name"] && "border-red-500")}
              />
              {errors["name"] && (
                <p className="text-sm text-red-500">{errors["name"]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formula.category || ""} onValueChange={(value) => updateFormula("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="digestive">Digestive</SelectItem>
                  <SelectItem value="respiratory">Respiratory</SelectItem>
                  <SelectItem value="nervous">Nervous System</SelectItem>
                  <SelectItem value="immune">Immune Support</SelectItem>
                  <SelectItem value="cardiovascular">Cardiovascular</SelectItem>
                  <SelectItem value="detox">Detoxification</SelectItem>
                  <SelectItem value="womens-health">Women's Health</SelectItem>
                  <SelectItem value="mens-health">Men's Health</SelectItem>
                  <SelectItem value="topical">Topical</SelectItem>
                  <SelectItem value="general">General Wellness</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select value={formula.difficulty || "beginner"} onValueChange={(value) => updateFormula("difficulty", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prepTime">Prep Time (minutes)</Label>
              <Input
                id="prepTime"
                type="number"
                placeholder="60"
                value={formula.prepTime || ""}
                onChange={(e) => updateFormula("prepTime", parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yieldAmount">Yield Amount</Label>
              <Input
                id="yieldAmount"
                type="number"
                step="0.1"
                placeholder="100"
                value={formula.yieldAmount || ""}
                onChange={(e) => updateFormula("yieldAmount", parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yieldUnit">Yield Unit</Label>
              <Select value={formula.yieldUnit || ""} onValueChange={(value) => updateFormula("yieldUnit", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
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

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the formula's purpose and benefits..."
              value={formula.description || ""}
              onChange={(e) => updateFormula("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosage">Dosage Instructions</Label>
              <Input
                id="dosage"
                placeholder="e.g., 1 tsp 3x daily"
                value={formula.dosage || ""}
                onChange={(e) => updateFormula("dosage", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Treatment Duration</Label>
              <Input
                id="duration"
                placeholder="e.g., 2-4 weeks"
                value={formula.duration || ""}
                onChange={(e) => updateFormula("duration", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contraindications">Contraindications</Label>
              <Textarea
                id="contraindications"
                placeholder="Who should not use this formula..."
                value={formula.contraindications || ""}
                onChange={(e) => updateFormula("contraindications", e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interactions">Drug Interactions</Label>
              <Textarea
                id="interactions"
                placeholder="Known drug interactions..."
                value={formula.interactions || ""}
                onChange={(e) => updateFormula("interactions", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex items-center space-x-6 pt-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                checked={formula.isPublic || false}
                onCheckedChange={(checked) => updateFormula("isPublic", checked)}
              />
              <Label htmlFor="isPublic">Make formula public</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isDraft"
                checked={formula.isDraft !== false}
                onCheckedChange={(checked) => updateFormula("isDraft", checked)}
              />
              <Label htmlFor="isDraft">Keep as draft</Label>
            </div>
          </div>
        </TabsContent>

        {/* Ingredients Tab */}
        <TabsContent value="ingredients" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ingredient Selector */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Ingredients</CardTitle>
                  <CardDescription>
                    Search and drag herbs to your formula
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <IngredientSelector onIngredientSelect={addIngredient} />
                </CardContent>
              </Card>
            </div>

            {/* Formula Ingredients */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Formula Ingredients ({formula.ingredients?.length || 0})
                  </CardTitle>
                  <CardDescription>
                    Drag to reorder, adjust quantities and ratios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!formula.ingredients || formula.ingredients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Beaker className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No ingredients added yet</p>
                      <p className="text-sm">Search and select herbs from the left panel</p>
                    </div>
                  ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="ingredients">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-3"
                          >
                            {formula.ingredients.map((ingredient, index) => (
                              <Draggable
                                key={`${ingredient.herbId}-${index}`}
                                draggableId={`${ingredient.herbId}-${index}`}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={cn(
                                      "bg-white border rounded-lg p-4 transition-shadow",
                                      snapshot.isDragging && "shadow-lg"
                                    )}
                                  >
                                    <RatioEditor
                                      ingredient={ingredient}
                                      index={index}
                                      dragHandleProps={provided.dragHandleProps}
                                      onChange={(updatedIngredient) => updateIngredient(index, updatedIngredient)}
                                      onRemove={() => removeIngredient(index)}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}

                  {errors["ingredients.percentage"] && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">{errors["ingredients.percentage"]}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Preparation Tab */}
        <TabsContent value="preparation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Preparation Instructions
              </CardTitle>
              <CardDescription>
                Detailed step-by-step preparation instructions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions *</Label>
                <Textarea
                  id="instructions"
                  placeholder="1. Combine all herbs in a clean bowl...&#10;2. Mix thoroughly...&#10;3. Store in airtight container..."
                  value={formula.instructions || ""}
                  onChange={(e) => updateFormula("instructions", e.target.value)}
                  rows={8}
                  className={cn(errors["instructions"] && "border-red-500")}
                />
                {errors["instructions"] && (
                  <p className="text-sm text-red-500">{errors["instructions"]}</p>
                )}
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Preparation Tips:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Use clear, numbered steps</li>
                      <li>Include specific temperatures and timing</li>
                      <li>Mention any special equipment needed</li>
                      <li>Add storage instructions</li>
                      <li>Note shelf life and safety considerations</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Calculation Inputs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Cost Calculation
                </CardTitle>
                <CardDescription>
                  Set labor costs and markup for pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="laborCost">Labor Cost ($)</Label>
                  <Input
                    id="laborCost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formula.laborCost || ""}
                    onChange={(e) => updateFormula("laborCost", parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="markupPercent">Markup Percentage (%)</Label>
                  <Input
                    id="markupPercent"
                    type="number"
                    step="1"
                    placeholder="50"
                    value={formula.markupPercent || ""}
                    onChange={(e) => updateFormula("markupPercent", parseFloat(e.target.value) || 0)}
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="w-full"
                >
                  {showAdvancedOptions ? "Hide" : "Show"} Advanced Options
                </Button>

                {showAdvancedOptions && (
                  <div className="space-y-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Advanced pricing and cost calculation options
                    </p>
                    {/* Add more advanced options here */}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost Breakdown Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Cost Breakdown
                  {isCalculatingCost && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                  )}
                </CardTitle>
                <CardDescription>
                  Real-time cost analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Ingredients Cost:</span>
                  <span className="font-medium">${costCalculation.ingredientsCost.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Labor Cost:</span>
                  <span className="font-medium">${costCalculation.laborCost.toFixed(2)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-sm">
                  <span>Total Cost:</span>
                  <span className="font-medium">${costCalculation.totalCost.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Final Price:</span>
                  <span className="text-green-600">${costCalculation.finalPrice.toFixed(2)}</span>
                </div>
                
                {formula.yieldAmount && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Cost per {formula.yieldUnit || "unit"}:</span>
                    <span>${costCalculation.costPerUnit.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 text-xs text-muted-foreground">
                  <p>Prices update automatically as you modify ingredients</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}