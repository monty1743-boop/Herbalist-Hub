"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  GripVertical, 
  Trash2, 
  Calculator, 
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign,
  Package
} from "lucide-react"
import { cn } from "@/lib/utils"
import { type FormulaIngredientInput } from "@/lib/validation/formula"

interface RatioEditorProps {
  ingredient: FormulaIngredientInput
  index: number
  dragHandleProps?: any
  onChange: (ingredient: Partial<FormulaIngredientInput>) => void
  onRemove: () => void
}

interface HerbInfo {
  id: string
  name: string
  latinName?: string
  type: string
  quantity: number
  unit: string
  costPerUnit?: number
  expirationDate?: string
  supplier?: string
}

export function RatioEditor({ 
  ingredient, 
  index, 
  dragHandleProps, 
  onChange, 
  onRemove 
}: RatioEditorProps) {
  const [herbInfo, setHerbInfo] = useState<HerbInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Fetch herb information
  useEffect(() => {
    const fetchHerbInfo = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/herbs/${ingredient.herbId}`)
        
        if (response.ok) {
          const data = await response.json()
          setHerbInfo(data.herb)
        }
      } catch (error) {
        console.error("Error fetching herb info:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (ingredient.herbId) {
      fetchHerbInfo()
    }
  }, [ingredient.herbId])

  // Calculate estimated cost
  const estimatedCost = herbInfo?.costPerUnit 
    ? (ingredient.quantity * herbInfo.costPerUnit)
    : 0

  // Check availability
  const isAvailable = herbInfo ? herbInfo.quantity >= ingredient.quantity : true
  const availableQuantity = herbInfo?.quantity || 0

  // Get availability status
  const getAvailabilityStatus = () => {
    if (!herbInfo) return "unknown"
    if (herbInfo.quantity <= 0) return "out_of_stock"
    if (herbInfo.quantity < ingredient.quantity) return "insufficient"
    return "available"
  }

  // Get availability badge
  const getAvailabilityBadge = () => {
    const status = getAvailabilityStatus()
    
    switch (status) {
      case "available":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Available
          </Badge>
        )
      case "insufficient":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Low Stock
          </Badge>
        )
      case "out_of_stock":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Out of Stock
          </Badge>
        )
      default:
        return null
    }
  }

  // Update ingredient property
  const updateProperty = (property: keyof FormulaIngredientInput, value: any) => {
    onChange({ [property]: value })
  }

  // Convert units for user convenience
  const getUnitConversions = (quantity: number, unit: string) => {
    const conversions: { label: string; value: string }[] = []
    
    switch (unit) {
      case "grams":
        if (quantity >= 1000) {
          conversions.push({ label: `${(quantity / 1000).toFixed(2)} kg`, value: "kg" })
        }
        if (quantity >= 15) {
          conversions.push({ label: `~${(quantity / 15).toFixed(1)} tbsp`, value: "tbsp" })
        }
        if (quantity >= 5) {
          conversions.push({ label: `~${(quantity / 5).toFixed(1)} tsp`, value: "tsp" })
        }
        break
      case "ml":
        if (quantity >= 1000) {
          conversions.push({ label: `${(quantity / 1000).toFixed(2)} L`, value: "L" })
        }
        if (quantity >= 240) {
          conversions.push({ label: `~${(quantity / 240).toFixed(1)} cups`, value: "cups" })
        }
        if (quantity >= 15) {
          conversions.push({ label: `${(quantity / 15).toFixed(1)} tbsp`, value: "tbsp" })
        }
        if (quantity >= 5) {
          conversions.push({ label: `${(quantity / 5).toFixed(1)} tsp`, value: "tsp" })
        }
        break
      case "ounces":
        conversions.push({ label: `${(quantity * 28.35).toFixed(1)} g`, value: "g" })
        if (quantity >= 16) {
          conversions.push({ label: `${(quantity / 16).toFixed(2)} lbs`, value: "lbs" })
        }
        break
    }
    
    return conversions
  }

  const unitConversions = getUnitConversions(ingredient.quantity, ingredient.unit)

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-24 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with drag handle and herb info */}
      <div className="flex items-start gap-3">
        <div 
          {...dragHandleProps}
          className="mt-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 space-y-3">
          {/* Herb Name and Status */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium">{herbInfo?.name || "Unknown Herb"}</h4>
              {herbInfo?.latinName && (
                <p className="text-sm text-muted-foreground italic">
                  {herbInfo.latinName}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {getAvailabilityBadge()}
                {herbInfo?.type && (
                  <Badge variant="outline" className="text-xs">
                    {herbInfo.type.replace(/_/g, " ")}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  #{index + 1}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={ingredient.quantity || ""}
                onChange={(e) => updateProperty("quantity", parseFloat(e.target.value) || 0)}
                className={cn(
                  "text-sm",
                  !isAvailable && "border-yellow-500 bg-yellow-50"
                )}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Unit</Label>
              <Select 
                value={ingredient.unit || "grams"} 
                onValueChange={(value) => updateProperty("unit", value)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grams">Grams</SelectItem>
                  <SelectItem value="ounces">Ounces</SelectItem>
                  <SelectItem value="ml">Milliliters</SelectItem>
                  <SelectItem value="drops">Drops</SelectItem>
                  <SelectItem value="parts">Parts</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unit Conversions */}
          {unitConversions.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span>Equivalent: </span>
              {unitConversions.map((conversion, idx) => (
                <span key={idx}>
                  {conversion.label}
                  {idx < unitConversions.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}

          {/* Availability Warning */}
          {!isAvailable && herbInfo && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <div className="flex items-start gap-2 text-yellow-700">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Insufficient stock</p>
                  <p>Need {ingredient.quantity} {ingredient.unit}, have {availableQuantity} {herbInfo.unit}</p>
                </div>
              </div>
            </div>
          )}

          {/* Cost Information */}
          {herbInfo?.costPerUnit && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${herbInfo.costPerUnit.toFixed(2)}/{herbInfo.unit}
              </span>
              <span className="font-medium">
                Est. Cost: ${estimatedCost.toFixed(2)}
              </span>
            </div>
          )}

          {/* Advanced Options Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs h-auto p-1"
          >
            <Info className="h-3 w-3 mr-1" />
            {showAdvanced ? "Hide" : "Show"} Advanced
          </Button>

          {/* Advanced Options */}
          {showAdvanced && (
            <Card className="bg-gray-50">
              <CardContent className="p-3 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ratio (optional)</Label>
                  <Input
                    placeholder="e.g., 1:5, 20%, 2 parts"
                    value={ingredient.ratio || ""}
                    onChange={(e) => updateProperty("ratio", e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Express ratio in traditional herbalist notation
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Processing Notes</Label>
                  <Textarea
                    placeholder="e.g., finely ground, fresh only, add at end"
                    value={ingredient.processingNotes || ""}
                    onChange={(e) => updateProperty("processingNotes", e.target.value)}
                    className="text-sm min-h-[60px]"
                    rows={2}
                  />
                </div>

                {/* Supplier and Expiration Info */}
                {herbInfo && (
                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      {herbInfo.supplier && (
                        <div>
                          <span className="font-medium">Supplier:</span>
                          <p>{herbInfo.supplier}</p>
                        </div>
                      )}
                      {herbInfo.expirationDate && (
                        <div>
                          <span className="font-medium">Expires:</span>
                          <p>{new Date(herbInfo.expirationDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}