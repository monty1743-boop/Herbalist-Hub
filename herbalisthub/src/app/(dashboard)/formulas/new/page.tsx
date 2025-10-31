"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Role } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { ArrowLeft, Save, Eye, Share2, Calculator, Scale, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { FormulaBuilder } from "@/components/formulas/FormulaBuilder"
import { type FormulaInput } from "@/lib/validation/formula"

interface FormulaBuilderPageState {
  formula: Partial<FormulaInput>
  isDirty: boolean
  isSaving: boolean
  errors: Record<string, string>
  warnings: string[]
}

export default function NewFormulaPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [state, setState] = useState<FormulaBuilderPageState>({
    formula: {
      name: "",
      description: "",
      instructions: "",
      category: "",
      difficulty: "beginner",
      isPublic: false,
      isDraft: true,
      ingredients: [],
    },
    isDirty: false,
    isSaving: false,
    errors: {},
    warnings: []
  })

  // Check permissions
  if (!session?.user || ![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                You need herbalist or admin privileges to create formulas.
              </p>
              <Button asChild>
                <Link href="/dashboard">Return to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleFormulaChange = (updatedFormula: Partial<FormulaInput>) => {
    setState(prev => ({
      ...prev,
      formula: updatedFormula,
      isDirty: true,
      errors: {}, // Clear errors when user makes changes
    }))
  }

  const handleValidationErrors = (errors: Record<string, string>) => {
    setState(prev => ({
      ...prev,
      errors
    }))
  }

  const handleWarnings = (warnings: string[]) => {
    setState(prev => ({
      ...prev,
      warnings
    }))
  }

  const handleSave = async (asDraft: boolean = true) => {
    if (!state.formula.name?.trim()) {
      toast.error("Formula name is required")
      return
    }

    if (!state.formula.instructions?.trim()) {
      toast.error("Preparation instructions are required")
      return
    }

    if (!state.formula.ingredients || state.formula.ingredients.length === 0) {
      toast.error("At least one ingredient is required")
      return
    }

    setState(prev => ({ ...prev, isSaving: true }))

    try {
      const formulaData = {
        ...state.formula,
        isDraft: asDraft,
        isPublic: asDraft ? false : state.formula.isPublic,
      }

      const response = await fetch("/api/formulas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formulaData),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.details) {
          // Handle validation errors
          const errorMap: Record<string, string> = {}
          result.details.forEach((error: any) => {
            errorMap[error.path.join(".")] = error.message
          })
          handleValidationErrors(errorMap)
          toast.error("Please fix the validation errors")
        } else {
          toast.error(result.error || "Failed to save formula")
        }
        return
      }

      // Handle availability warnings
      if (result.warnings?.availabilityIssues) {
        result.warnings.availabilityIssues.forEach((issue: string) => {
          toast.warning(issue)
        })
      }

      setState(prev => ({ ...prev, isDirty: false }))
      
      toast.success(
        asDraft 
          ? "Formula saved as draft" 
          : "Formula saved and published"
      )

      // Redirect to the formula detail page
      router.push(`/dashboard/formulas/${result.formula.id}`)
    } catch (error) {
      console.error("Error saving formula:", error)
      toast.error("Failed to save formula. Please try again.")
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }

  const handlePreview = () => {
    // Open preview in new tab/modal
    toast.info("Preview functionality coming soon")
  }

  const estimatedCost = state.formula.ingredients?.reduce((total, ingredient) => {
    return total + (ingredient.quantity * 1.5) // Rough estimate
  }, 0) || 0

  const totalIngredients = state.formula.ingredients?.length || 0

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/formulas">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Formulas
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Formula</h1>
          <p className="text-muted-foreground">
            Build a new herbal formula with precise ingredient ratios and cost calculations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {state.isDirty && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              Unsaved changes
            </Badge>
          )}
          
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={!state.formula.name}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>

          <Button
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={state.isSaving || !state.formula.name}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>

          <Button
            onClick={() => handleSave(false)}
            disabled={state.isSaving || !state.formula.name || state.formula.isDraft === false}
          >
            <Share2 className="h-4 w-4 mr-2" />
            {state.isSaving ? "Saving..." : "Save & Publish"}
          </Button>
        </div>
      </div>

      {/* Warning Messages */}
      {state.warnings.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {state.warnings.map((warning, index) => (
                <li key={index} className="text-sm text-orange-700">
                  • {warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Scale className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Ingredients</p>
                <p className="text-2xl font-bold">{totalIngredients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calculator className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Est. Cost</p>
                <p className="text-2xl font-bold">${estimatedCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Difficulty</p>
                <p className="text-2xl font-bold capitalize">
                  {state.formula.difficulty || "Beginner"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Share2 className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Visibility</p>
                <p className="text-2xl font-bold">
                  {state.formula.isPublic ? "Public" : "Private"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Formula Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Formula Builder</CardTitle>
          <CardDescription>
            Create your herbal formula by adding ingredients, setting ratios, and configuring preparation instructions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaBuilder
            formula={state.formula}
            errors={state.errors}
            onChange={handleFormulaChange}
            onValidationErrors={handleValidationErrors}
            onWarnings={handleWarnings}
          />
        </CardContent>
      </Card>

      {/* Save Actions (Bottom) */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div className="text-sm text-muted-foreground">
          {state.isDirty ? (
            <span className="text-orange-600">You have unsaved changes</span>
          ) : (
            <span>All changes saved</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/formulas")}
            disabled={state.isSaving}
          >
            Cancel
          </Button>

          <Button
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={state.isSaving || !state.formula.name}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>

          <Button
            onClick={() => handleSave(false)}
            disabled={state.isSaving || !state.formula.name}
          >
            <Share2 className="h-4 w-4 mr-2" />
            {state.isSaving ? "Publishing..." : "Save & Publish"}
          </Button>
        </div>
      </div>
    </div>
  )
}