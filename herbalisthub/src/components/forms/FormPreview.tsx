"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  Star, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Monitor,
  Tablet,
  Smartphone
} from "lucide-react"
import { FormData, FormField, FormSection } from "./FormBuilder"
import { cn } from "@/lib/utils"

interface FormPreviewProps {
  formData: FormData
}

export function FormPreview({ formData }: FormPreviewProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [currentSection, setCurrentSection] = useState(0)
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop")

  const updateValue = (fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }))
  }

  const renderField = (field: FormField) => {
    const value = formValues[field.id] || ""
    
    const fieldContent = (() => {
      switch (field.type) {
        case "text":
        case "email":
        case "phone":
        case "url":
        case "password":
          return (
            <Input
              type={field.type === "password" ? "password" : "text"}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => updateValue(field.id, e.target.value)}
              className={getFieldWidth(field.styling?.width)}
            />
          )

        case "textarea":
          return (
            <Textarea
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => updateValue(field.id, e.target.value)}
              rows={4}
              className={getFieldWidth(field.styling?.width)}
            />
          )

        case "number":
          return (
            <Input
              type="number"
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => updateValue(field.id, parseFloat(e.target.value) || "")}
              className={getFieldWidth(field.styling?.width)}
            />
          )

        case "date":
          return (
            <Input
              type="date"
              value={value}
              onChange={(e) => updateValue(field.id, e.target.value)}
              className={getFieldWidth(field.styling?.width)}
            />
          )

        case "time":
          return (
            <Input
              type="time"
              value={value}
              onChange={(e) => updateValue(field.id, e.target.value)}
              className={getFieldWidth(field.styling?.width)}
            />
          )

        case "select":
          return (
            <select
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                getFieldWidth(field.styling?.width)
              )}
              value={value}
              onChange={(e) => updateValue(field.id, e.target.value)}
            >
              <option value="">Select an option...</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )

        case "radio":
          return (
            <div className="space-y-2">
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${field.id}_${option.value}`}
                    name={field.id}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => updateValue(field.id, e.target.value)}
                    className="text-primary"
                  />
                  <Label htmlFor={`${field.id}_${option.value}`} className="text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          )

        case "checkbox":
          return (
            <div className="space-y-2">
              {field.options?.map((option) => {
                const isChecked = Array.isArray(value) ? value.includes(option.value) : false
                return (
                  <div key={option.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`${field.id}_${option.value}`}
                      checked={isChecked}
                      onChange={(e) => {
                        const currentValues = Array.isArray(value) ? value : []
                        if (e.target.checked) {
                          updateValue(field.id, [...currentValues, option.value])
                        } else {
                          updateValue(field.id, currentValues.filter(v => v !== option.value))
                        }
                      }}
                      className="text-primary"
                    />
                    <Label htmlFor={`${field.id}_${option.value}`} className="text-sm">
                      {option.label}
                    </Label>
                  </div>
                )
              })}
            </div>
          )

        case "file":
          return (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
              <input
                type="file"
                className="hidden"
                onChange={(e) => updateValue(field.id, e.target.files?.[0]?.name || "")}
              />
              <Button variant="outline" size="sm">
                Choose File
              </Button>
              {value && (
                <p className="text-xs text-green-600 mt-2">
                  <CheckCircle className="h-3 w-3 inline mr-1" />
                  {value}
                </p>
              )}
            </div>
          )

        case "signature":
          return (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 h-32 flex items-center justify-center">
              <p className="text-gray-500 text-sm">Click here to sign</p>
            </div>
          )

        case "rating":
          return (
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-6 w-6 cursor-pointer transition-colors",
                    star <= (value || 0) ? "text-yellow-500 fill-current" : "text-gray-300"
                  )}
                  onClick={() => updateValue(field.id, star)}
                />
              ))}
            </div>
          )

        case "scale":
          return (
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>1</span>
                <span className="font-medium">
                  {value || field.validation?.min || 1}
                </span>
                <span>{field.validation?.max || 10}</span>
              </div>
              <input
                type="range"
                min={field.validation?.min || 1}
                max={field.validation?.max || 10}
                value={value || field.validation?.min || 1}
                onChange={(e) => updateValue(field.id, parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          )

        case "color":
          return (
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={value || "#000000"}
                onChange={(e) => updateValue(field.id, e.target.value)}
                className="w-12 h-10 border rounded cursor-pointer"
              />
              <Input
                value={value || "#000000"}
                onChange={(e) => updateValue(field.id, e.target.value)}
                placeholder="#000000"
                className="font-mono"
              />
            </div>
          )

        default:
          return (
            <div className="p-3 bg-gray-100 rounded text-center text-gray-500">
              {field.type} field preview
            </div>
          )
      }
    })()

    return (
      <div key={field.id} className={cn("space-y-2", getFieldWidth(field.styling?.width))}>
        <div className="flex items-center gap-2">
          <Label htmlFor={field.id} className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {field.metadata?.isHealthData && (
            <Badge variant="outline" className="text-xs">
              Protected Health Info
            </Badge>
          )}
        </div>
        
        {field.description && (
          <p className="text-sm text-gray-600">{field.description}</p>
        )}
        
        {fieldContent}
      </div>
    )
  }

  const getFieldWidth = (width?: string) => {
    switch (width) {
      case "half":
        return "w-1/2"
      case "third":
        return "w-1/3"
      case "quarter":
        return "w-1/4"
      default:
        return "w-full"
    }
  }

  const getViewportClasses = () => {
    switch (viewMode) {
      case "tablet":
        return "max-w-2xl"
      case "mobile":
        return "max-w-sm"
      default:
        return "max-w-4xl"
    }
  }

  const totalFields = formData.fields.sections.reduce((total, section) => total + section.fields.length, 0)
  const filledFields = Object.keys(formValues).filter(key => formValues[key] !== "").length
  const completionPercentage = totalFields > 0 ? (filledFields / totalFields) * 100 : 0

  return (
    <div className="h-full flex flex-col">
      {/* Preview Controls */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Form Preview</h3>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "desktop" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("desktop")}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "tablet" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("tablet")}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "mobile" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("mobile")}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Completion Progress</span>
            <span>{Math.round(completionPercentage)}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      </div>

      {/* Form Preview */}
      <ScrollArea className="flex-1">
        <div className="p-6 flex justify-center">
          <div className={cn("w-full transition-all duration-200", getViewportClasses())}>
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{formData.name}</CardTitle>
                {formData.description && (
                  <p className="text-gray-600 mt-2">{formData.description}</p>
                )}
                {formData.estimatedTime && (
                  <p className="text-sm text-gray-500 mt-1">
                    Estimated time: {formData.estimatedTime} minutes
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-8">
                {formData.fields.sections.map((section, sectionIndex) => (
                  <div key={section.id}>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold">{section.title}</h3>
                      {section.description && (
                        <p className="text-gray-600 mt-1">{section.description}</p>
                      )}
                    </div>

                    <div className={cn(
                      "space-y-6",
                      section.styling?.layout === "two_column" && "grid grid-cols-2 gap-6",
                      section.styling?.layout === "grid" && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    )}>
                      {section.fields.map(field => renderField(field))}
                    </div>

                    {sectionIndex < formData.fields.sections.length - 1 && (
                      <Separator className="mt-8" />
                    )}
                  </div>
                ))}

                {/* Form Actions */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <Button variant="outline">
                    Save Draft
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      Previous
                    </Button>
                    <Button>
                      Submit Form
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}