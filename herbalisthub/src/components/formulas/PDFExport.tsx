"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Download, 
  Printer, 
  FileText, 
  Settings,
  Eye,
  CheckCircle
} from "lucide-react"
import { FormulaPDFExporter, type FormulaPrintData, type PrintOptions } from "@/lib/formulas/pdf-export"
import { toast } from "sonner"

interface PDFExportProps {
  formula: any // Formula data from the API
}

export function PDFExport({ formula }: PDFExportProps) {
  const [options, setOptions] = useState<PrintOptions>({
    includeIngredients: true,
    includeCosts: false,
    includeInstructions: true,
    includeSafetyInfo: true,
    includeMetadata: true,
    format: "full",
    paperSize: "letter",
    orientation: "portrait"
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Transform formula data for PDF export
  const getFormulaPrintData = (): FormulaPrintData => {
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
        quantity: ing.quantity?.toNumber?.() || ing.quantity || 0,
        unit: ing.unit || "",
        notes: ing.notes,
        processingNotes: ing.processingNotes,
        costPerUnit: ing.herb?.costPerUnit?.toNumber?.() || ing.herb?.costPerUnit || 0,
        totalCost: ing.totalCost?.toNumber?.() || ing.totalCost || 0
      })) || [],
      costBreakdown: formula.costBreakdown ? {
        baseIngredientsCost: formula.costBreakdown.baseIngredientsCost || 0,
        laborCost: formula.costBreakdown.laborCost || 0,
        overheadCost: formula.costBreakdown.overheadCost || 0,
        totalCost: formula.costBreakdown.totalCost || 0,
        suggestedPrice: formula.costBreakdown.suggestedPrice || 0,
        profitMargin: formula.costBreakdown.profitMargin || 0
      } : undefined
    }
  }

  const handlePrint = async () => {
    try {
      setIsGenerating(true)
      const printData = getFormulaPrintData()
      await FormulaPDFExporter.printFormula(printData, options)
      toast.success("Print dialog opened")
    } catch (error) {
      console.error("Error printing formula:", error)
      toast.error("Failed to open print dialog")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true)
      const printData = getFormulaPrintData()
      await FormulaPDFExporter.downloadPDF(printData, options)
      toast.success("PDF generation started - use your browser's print dialog to save as PDF")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF")
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreview = () => {
    try {
      const printData = getFormulaPrintData()
      const html = FormulaPDFExporter.generatePrintHTML(printData, options)
      
      const previewWindow = window.open('', '_blank')
      if (!previewWindow) {
        toast.error('Unable to open preview window. Please check your popup blocker.')
        return
      }

      previewWindow.document.write(html)
      previewWindow.document.close()
      toast.success("Preview opened in new window")
    } catch (error) {
      console.error("Error generating preview:", error)
      toast.error("Failed to generate preview")
    }
  }

  const updateOption = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  const getFormatDescription = (format: string) => {
    switch (format) {
      case "full":
        return "Complete formula with all details, ingredients, costs, and instructions"
      case "recipe":
        return "Simple recipe-style format with ingredients and basic instructions"
      case "label":
        return "Compact label format suitable for bottles or containers"
      default:
        return ""
    }
  }

  const getEstimatedPages = () => {
    let pages = 1
    
    if (options.format === "full") {
      if (options.includeIngredients && formula.ingredients?.length > 10) pages++
      if (options.includeInstructions && formula.instructions?.length > 500) pages++
      if (options.includeSafetyInfo) pages++
    } else if (options.format === "label") {
      pages = 0.5 // Labels are typically less than a full page
    }
    
    return pages
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Print & PDF Export
        </CardTitle>
        <CardDescription>
          Generate printable versions and PDF exports of this formula
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format Selection */}
        <div className="space-y-3">
          <Label>Format Style</Label>
          <Select 
            value={options.format} 
            onValueChange={(value: any) => updateOption('format', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select format style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <div>
                    <div>Full Formula</div>
                    <div className="text-xs text-muted-foreground">Complete detailed format</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="recipe">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <div>
                    <div>Recipe Style</div>
                    <div className="text-xs text-muted-foreground">Simple cooking recipe format</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="label">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <div>
                    <div>Label Format</div>
                    <div className="text-xs text-muted-foreground">Compact label for containers</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {getFormatDescription(options.format)}
          </p>
        </div>

        <Separator />

        {/* Content Options */}
        {options.format === "full" && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Include Content</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="includeIngredients"
                  checked={options.includeIngredients}
                  onCheckedChange={(checked) => updateOption('includeIngredients', checked)}
                />
                <Label htmlFor="includeIngredients">Ingredients List</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="includeCosts"
                  checked={options.includeCosts}
                  onCheckedChange={(checked) => updateOption('includeCosts', checked)}
                />
                <Label htmlFor="includeCosts">Cost Information</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="includeInstructions"
                  checked={options.includeInstructions}
                  onCheckedChange={(checked) => updateOption('includeInstructions', checked)}
                />
                <Label htmlFor="includeInstructions">Preparation Instructions</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="includeSafetyInfo"
                  checked={options.includeSafetyInfo}
                  onCheckedChange={(checked) => updateOption('includeSafetyInfo', checked)}
                />
                <Label htmlFor="includeSafetyInfo">Safety Information</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="includeMetadata"
                  checked={options.includeMetadata}
                  onCheckedChange={(checked) => updateOption('includeMetadata', checked)}
                />
                <Label htmlFor="includeMetadata">Formula Metadata</Label>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Page Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Paper Size</Label>
            <Select 
              value={options.paperSize} 
              onValueChange={(value: any) => updateOption('paperSize', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="letter">US Letter (8.5" × 11")</SelectItem>
                <SelectItem value="a4">A4 (210mm × 297mm)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Orientation</Label>
            <Select 
              value={options.orientation} 
              onValueChange={(value: any) => updateOption('orientation', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview Info */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Estimated pages: {getEstimatedPages()} • Format: {options.format} • 
            {options.includeIngredients ? ` ${formula.ingredients?.length || 0} ingredients` : ''} • 
            Paper: {options.paperSize.toUpperCase()} {options.orientation}
          </AlertDescription>
        </Alert>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handlePreview}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Print"}
          </Button>

          <Button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Print:</strong> Opens your browser's print dialog for immediate printing</p>
          <p><strong>Download PDF:</strong> Opens print dialog where you can "Save as PDF"</p>
          <p><strong>Preview:</strong> Opens a preview window to see how the document will look</p>
        </div>
      </CardContent>
    </Card>
  )
}