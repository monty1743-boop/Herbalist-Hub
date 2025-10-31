"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Edit, Share, Download, Copy, Calculator, History, Eye, EyeOff, Printer, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FormulaScaler } from "@/components/formulas/FormulaScaler"
import { VersionHistory } from "@/components/formulas/VersionHistory"
import { PublishingWorkflow } from "@/components/formulas/PublishingWorkflow"
import { PDFExport } from "@/components/formulas/PDFExport"
import { FormulaCategorization } from "@/components/formulas/FormulaCategorization"
import { SharingControls } from "@/components/formulas/SharingControls"
import { FormulaDiscussion } from "@/components/formulas/FormulaDiscussion"
import { CollaborativeEditor } from "@/components/formulas/CollaborativeEditor"
import { FormulaPDFExporter, type FormulaPrintData } from "@/lib/formulas/pdf-export"
import { format } from "date-fns"
import { toast } from "sonner"

interface FormulaIngredient {
  id: string
  herbId: string
  quantity: number
  unit: string
  notes?: string
  herb: {
    id: string
    name: string
    latinName?: string
    type: string
    availabilityStatus: string
    quantity: number
    unit: string
    costPerUnit: number
  }
}

interface Formula {
  id: string
  name: string
  description?: string
  instructions?: string
  category?: string
  preparationTime?: number
  yieldAmount: number
  yieldUnit: string
  isPublic: boolean
  isDraft: boolean
  version: number
  createdAt: string
  updatedAt: string
  ingredients: FormulaIngredient[]
  costBreakdown?: {
    baseIngredientsCost: number
    laborCost: number
    overheadCost: number
    totalCost: number
    suggestedPrice: number
    profitMargin: number
  }
  createdBy: {
    id: string
    name: string
    email: string
  }
}

export default function FormulaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [formula, setFormula] = useState<Formula | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFormula = async () => {
      try {
        const response = await fetch(`/api/formulas/${params.id}`)
        if (!response.ok) {
          throw new Error("Failed to fetch formula")
        }
        const data = await response.json()
        setFormula(data.formula)
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

  const handleEdit = () => {
    router.push(`/formulas/${params.id}/edit`)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      // Could add toast notification here
    } catch (err) {
      console.error("Failed to copy URL:", err)
    }
  }

  const togglePublic = async () => {
    if (!formula) return
    
    try {
      const response = await fetch(`/api/formulas/${formula.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !formula.isPublic })
      })
      
      if (response.ok) {
        setFormula(prev => prev ? { ...prev, isPublic: !prev.isPublic } : null)
      }
    } catch (err) {
      console.error("Failed to update formula:", err)
    }
  }

  // Quick export functions
  const getFormulaPrintData = (): FormulaPrintData => {
    if (!formula) throw new Error("Formula not loaded")
    
    return {
      id: formula.id,
      name: formula.name,
      description: formula.description,
      instructions: formula.instructions,
      category: formula.category,
      difficulty: formula.difficulty,
      preparationTime: formula.preparationTime,
      yieldAmount: formula.yieldAmount,
      yieldUnit: formula.yieldUnit,
      dosage: formula.dosage,
      duration: formula.duration,
      contraindications: formula.contraindications,
      interactions: formula.interactions,
      version: formula.version,
      createdAt: formula.createdAt,
      updatedAt: formula.updatedAt,
      creator: {
        name: formula.createdBy?.name || "Unknown",
        email: formula.createdBy?.email || ""
      },
      ingredients: formula.ingredients?.map((ing: any) => ({
        herbName: ing.herb?.name || "Unknown Herb",
        quantity: ing.quantity || 0,
        unit: ing.unit || "",
        notes: ing.notes,
        processingNotes: ing.processingNotes,
        costPerUnit: ing.herb?.costPerUnit || 0,
        totalCost: ing.totalCost || 0
      })) || [],
      costBreakdown: formula.costBreakdown
    }
  }

  const handleQuickPrint = async () => {
    try {
      const printData = getFormulaPrintData()
      await FormulaPDFExporter.printFormula(printData, {
        includeIngredients: true,
        includeCosts: false,
        includeInstructions: true,
        includeSafetyInfo: true,
        includeMetadata: true,
        format: "recipe",
        paperSize: "letter",
        orientation: "portrait"
      })
      toast.success("Print dialog opened")
    } catch (error) {
      console.error("Error printing:", error)
      toast.error("Failed to print formula")
    }
  }

  const handleQuickPDF = async () => {
    try {
      const printData = getFormulaPrintData()
      await FormulaPDFExporter.downloadPDF(printData, {
        includeIngredients: true,
        includeCosts: false,
        includeInstructions: true,
        includeSafetyInfo: true,
        includeMetadata: true,
        format: "full",
        paperSize: "letter",
        orientation: "portrait"
      })
      toast.success("PDF generation started")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading formula...</p>
        </div>
      </div>
    )
  }

  if (error || !formula) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Formula not found"}</p>
          <Button onClick={() => router.push("/formulas")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Formulas
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <Button
            onClick={() => router.push("/formulas")}
            variant="ghost"
            size="sm"
            className="mt-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{formula.name}</h1>
              {formula.isDraft && <Badge variant="secondary">Draft</Badge>}
              {formula.isPublic && <Badge variant="default">Public</Badge>}
              <Badge variant="outline">v{formula.version}</Badge>
            </div>
            {formula.description && (
              <p className="text-muted-foreground text-lg">{formula.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>Created by {formula.createdBy.name}</span>
              <span>•</span>
              <span>Updated {format(new Date(formula.updatedAt), "MMM d, yyyy")}</span>
              {formula.category && (
                <>
                  <span>•</span>
                  <Badge variant="outline">{formula.category}</Badge>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleQuickPrint} variant="ghost" size="sm" title="Quick Print">
            <Printer className="h-4 w-4" />
          </Button>
          <Button onClick={handleQuickPDF} variant="ghost" size="sm" title="Download PDF">
            <FileText className="h-4 w-4" />
          </Button>
          <Button onClick={handleCopy} variant="ghost" size="sm" title="Copy Link">
            <Copy className="h-4 w-4" />
          </Button>
          <Button onClick={togglePublic} variant="ghost" size="sm" title="Toggle Visibility">
            {formula.isPublic ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" title="Share">
            <Share className="h-4 w-4" />
          </Button>
          <Button onClick={handleEdit} variant="default">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="categorization">Categories</TabsTrigger>
          <TabsTrigger value="scaling">Scaling</TabsTrigger>
          <TabsTrigger value="publishing">Publishing</TabsTrigger>
          <TabsTrigger value="sharing">Sharing</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Formula Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Yield</label>
                  <p className="text-lg">{formula.yieldAmount} {formula.yieldUnit}</p>
                </div>
                {formula.preparationTime && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Preparation Time</label>
                    <p className="text-lg">{formula.preparationTime} minutes</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ingredients</label>
                  <p className="text-lg">{formula.ingredients.length} herbs</p>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            {formula.costBreakdown && (
              <Card>
                <CardHeader>
                  <CardTitle>Cost Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ingredients</span>
                      <span>${formula.costBreakdown.baseIngredientsCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Labor</span>
                      <span>${formula.costBreakdown.laborCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Overhead</span>
                      <span>${formula.costBreakdown.overheadCost.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total Cost</span>
                      <span>${formula.costBreakdown.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Suggested Price</span>
                      <span>${formula.costBreakdown.suggestedPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Profit Margin</span>
                      <span>{formula.costBreakdown.profitMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            {formula.instructions && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Preparation Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{formula.instructions}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ingredients">
          <Card>
            <CardHeader>
              <CardTitle>Ingredient List</CardTitle>
              <CardDescription>
                Detailed breakdown of all herbs and their quantities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formula.ingredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium">{ingredient.herb.name}</h4>
                          {ingredient.herb.latinName && (
                            <p className="text-sm text-muted-foreground italic">
                              {ingredient.herb.latinName}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">{ingredient.herb.type}</Badge>
                        <Badge
                          variant={
                            ingredient.herb.availabilityStatus === "available"
                              ? "default"
                              : ingredient.herb.availabilityStatus === "low_stock"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {ingredient.herb.availabilityStatus.replace("_", " ")}
                        </Badge>
                      </div>
                      {ingredient.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {ingredient.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {ingredient.quantity} {ingredient.unit}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${(ingredient.quantity * ingredient.herb.costPerUnit).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorization">
          <FormulaCategorization 
            formulaId={formula.id}
            initialData={{
              category: formula.category,
              difficulty: formula.difficulty,
              contraindications: formula.contraindications
            }}
            onSave={() => window.location.reload()}
          />
        </TabsContent>

        <TabsContent value="scaling">
          <FormulaScaler formula={formula} />
        </TabsContent>

        <TabsContent value="publishing">
          <PublishingWorkflow 
            formulaId={formula.id} 
            onStatusChange={() => window.location.reload()} 
          />
        </TabsContent>

        <TabsContent value="sharing">
          <SharingControls 
            formulaId={formula.id}
            formulaName={formula.name}
            isOwner={formula.createdBy === session?.user?.id}
            onShareUpdate={() => window.location.reload()}
          />
        </TabsContent>

        <TabsContent value="collaboration">
          <CollaborativeEditor 
            formulaId={formula.id}
            formulaName={formula.name}
            isOwner={formula.createdBy === session?.user?.id}
            onCollaborationChange={() => window.location.reload()}
          />
        </TabsContent>

        <TabsContent value="discussion">
          <FormulaDiscussion 
            formulaId={formula.id}
            formulaName={formula.name}
            canComment={true} // This would be determined by sharing permissions
            canModerate={formula.createdBy === session?.user?.id}
          />
        </TabsContent>

        <TabsContent value="export">
          <PDFExport formula={formula} />
        </TabsContent>

        <TabsContent value="history">
          <VersionHistory formulaId={formula.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}