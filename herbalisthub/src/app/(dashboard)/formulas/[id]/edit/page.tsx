"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Role } from "@prisma/client"
import { ArrowLeft, Save, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FormulaBuilder } from "@/components/formulas/FormulaBuilder"
import { toast } from "sonner"
import { type FormulaInput } from "@/lib/validation/formula"

interface FormulaBuilderPageState {
  formula: Partial<FormulaInput>
  isDirty: boolean
  isSaving: boolean
  errors: Record<string, string>
  warnings: string[]
}

export default function EditFormulaPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<FormulaBuilderPageState>({
    formula: {},
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
                You need herbalist or admin privileges to edit formulas.
              </p>
              <Button onClick={() => router.push("/dashboard")}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  useEffect(() => {
    const fetchFormula = async () => {
      try {
        const response = await fetch(`/api/formulas/${params.id}`)
        if (!response.ok) {
          throw new Error("Failed to fetch formula")
        }
        const data = await response.json()
        
        // Transform the API response to match FormulaInput interface
        const formulaInput: Partial<FormulaInput> = {
          name: data.formula.name,
          description: data.formula.description || "",
          instructions: data.formula.instructions || "",
          category: data.formula.category || "",
          difficulty: data.formula.difficulty || "beginner",
          preparationTime: data.formula.preparationTime,
          yieldAmount: data.formula.yieldAmount,
          yieldUnit: data.formula.yieldUnit,
          isPublic: data.formula.isPublic,
          isDraft: data.formula.isDraft,
          notes: data.formula.notes || "",
          tags: data.formula.tags || [],
          ingredients: data.formula.ingredients.map((ing: any) => ({
            herbId: ing.herbId,
            quantity: ing.quantity,
            unit: ing.unit,
            ratio: "",
            processingNotes: ing.notes || "",
          }))
        }

        setState(prev => ({
          ...prev,
          formula: formulaInput
        }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchFormula()
    }
  }, [params.id])

  const handleFormulaChange = (updatedFormula: Partial<FormulaInput>) => {
    setState(prev => ({
      ...prev,
      formula: updatedFormula,
      isDirty: true,
      errors: {},
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

  const handleSave = async (asDraft: boolean = false) => {
    if (!state.formula.name?.trim()) {
      toast.error("Formula name is required")
      return
    }

    setState(prev => ({ ...prev, isSaving: true }))

    try {
      const formulaData = {
        ...state.formula,
        isDraft: asDraft
      }

      const response = await fetch(`/api/formulas/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formulaData),
      })

      if (!response.ok) {
        throw new Error("Failed to update formula")
      }

      toast.success("Formula updated successfully")
      setState(prev => ({ ...prev, isDirty: false }))
      router.push(`/formulas/${params.id}`)
    } catch (error) {
      console.error("Error updating formula:", error)
      toast.error("Failed to update formula")
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }

  const handleCancel = () => {
    if (state.isDirty) {
      if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
        router.push(`/formulas/${params.id}`)
      }
    } else {
      router.push(`/formulas/${params.id}`)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading formula...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push("/formulas")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Formulas
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleCancel}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Formula</h1>
            <p className="text-muted-foreground">
              Modify "{state.formula.name}" and update ingredient ratios
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state.isDirty && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Unsaved changes
            </Badge>
          )}
          
          <Button
            onClick={() => handleSave(true)}
            variant="outline"
            disabled={state.isSaving}
          >
            Save as Draft
          </Button>
          
          <Button
            onClick={() => handleSave(false)}
            disabled={state.isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {state.isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Warnings */}
      {state.warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-yellow-700 text-sm space-y-1">
              {state.warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Formula Builder */}
      <FormulaBuilder
        formula={state.formula}
        errors={state.errors}
        onChange={handleFormulaChange}
        onValidationErrors={handleValidationErrors}
        onWarnings={handleWarnings}
      />
    </div>
  )
}