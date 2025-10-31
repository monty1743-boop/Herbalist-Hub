"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FieldComponents } from "./FieldComponents"
import { FormValidator, ValidationError } from "@/lib/forms/schema-validation"
import { FormResponseEncryption } from "@/lib/forms/response-encryption"
import { ConditionalLogicEngine } from "@/lib/forms/conditional-logic"
import { useFormProgress } from "@/hooks/useFormProgress"
import { 
  Save, 
  Send, 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export interface FormField {
  id: string
  type: string
  label: string
  placeholder?: string
  description?: string
  required?: boolean
  validation?: Record<string, any>
  options?: Array<{ value: string; label: string; description?: string }>
  conditionalLogic?: {
    showIf?: Array<{
      fieldId: string
      operator: string
      value: any
    }>
    hideIf?: Array<{
      fieldId: string
      operator: string
      value: any
    }>
    requiredIf?: Array<{
      fieldId: string
      operator: string
      value: any
    }>
  }
  styling?: {
    width?: string
    className?: string
    inline?: boolean
  }
  metadata?: {
    isHealthData?: boolean
    category?: string
    order?: number
  }
}

export interface FormSection {
  id: string
  title: string
  description?: string
  fields: FormField[]
  conditionalLogic?: {
    showIf?: Array<{
      fieldId: string
      operator: string
      value: any
    }>
  }
  styling?: {
    layout?: string
    className?: string
  }
}

export interface FormData {
  id: string
  name: string
  description?: string
  fields: {
    sections: FormSection[]
    settings: {
      allowSaveProgress?: boolean
      allowMultipleSubmissions?: boolean
      requiresAuthentication?: boolean
      maxSubmissions?: number
      submissionDeadline?: string
      confirmationMessage?: string
      redirectUrl?: string
      autoSaveInterval?: number
      styling?: {
        theme?: string
        primaryColor?: string
        fontFamily?: string
      }
    }
    metadata: {
      estimatedTime?: number
      category?: string
      tags?: string[]
    }
  }
  category?: string
  estimatedTime?: number
  version: number
}

interface FormRendererProps {
  formData: FormData
  onSubmit: (responses: Record<string, any>, isDraft?: boolean) => Promise<void>
  initialResponses?: Record<string, any>
  isLoading?: boolean
  showProgress?: boolean
  allowDrafts?: boolean
  className?: string
}

export function FormRenderer({
  formData,
  onSubmit,
  initialResponses = {},
  isLoading = false,
  showProgress = true,
  allowDrafts = true,
  className
}: FormRendererProps) {
  const [responses, setResponses] = useState<Record<string, any>>(initialResponses)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startTime] = useState(new Date())
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  const [logicEngine] = useState(() => new ConditionalLogicEngine(initialResponses))

  const {
    saveProgress,
    getProgress,
    clearProgress,
    updateTimeSpent,
    getTimeSpent
  } = useFormProgress(formData.id)

  // Auto-save functionality
  useEffect(() => {
    if (!formData.fields.settings.allowSaveProgress || !allowDrafts) return

    const autoSaveInterval = formData.fields.settings.autoSaveInterval || 30
    const timer = setInterval(async () => {
      if (Object.keys(responses).length > 0) {
        await handleSaveDraft(true) // Silent save
      }
    }, autoSaveInterval * 1000)

    return () => clearInterval(timer)
  }, [responses, formData.fields.settings])

  // Update time spent
  useEffect(() => {
    const timer = setInterval(() => {
      updateTimeSpent(Math.floor((Date.now() - startTime.getTime()) / 1000))
    }, 1000)

    return () => clearInterval(timer)
  }, [startTime, updateTimeSpent])

  // Load saved progress
  useEffect(() => {
    const savedProgress = getProgress()
    if (savedProgress && Object.keys(savedProgress).length > 0) {
      setResponses({ ...savedProgress, ...initialResponses })
    }
  }, [getProgress, initialResponses])

  const updateResponse = useCallback((fieldId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }))

    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(error => error.fieldId !== fieldId))
  }, [])

  const isFieldVisible = useCallback((field: FormField): boolean => {
    if (!field.conditionalLogic) return true

    // Update logic engine with current responses
    logicEngine.updateResponses(responses)
    
    // Evaluate field logic using the new engine
    const result = logicEngine.evaluateFieldLogic(field.conditionalLogic)
    return result.visible
  }, [responses, logicEngine])

  const isSectionVisible = useCallback((section: FormSection): boolean => {
    if (!section.conditionalLogic?.showIf) return true
    
    // Update logic engine with current responses
    logicEngine.updateResponses(responses)
    
    // Use the logic engine for section evaluation
    return logicEngine.evaluateConditions(section.conditionalLogic.showIf)
  }, [responses, logicEngine])

  const isFieldRequired = useCallback((field: FormField): boolean => {
    if (field.required) return true

    if (field.conditionalLogic) {
      // Update logic engine with current responses
      logicEngine.updateResponses(responses)
      
      // Evaluate field logic using the new engine
      const result = logicEngine.evaluateFieldLogic(field.conditionalLogic)
      return result.required
    }

    return false
  }, [responses, logicEngine])

  const validateCurrentSection = useCallback((): ValidationError[] => {
    const currentSection = formData.fields.sections[currentSectionIndex]
    if (!currentSection || !isSectionVisible(currentSection)) return []

    const sectionErrors: ValidationError[] = []

    for (const field of currentSection.fields) {
      if (!isFieldVisible(field)) continue

      const fieldErrors = FormValidator.validateField(
        { ...field, required: isFieldRequired(field) },
        responses[field.id]
      )
      sectionErrors.push(...fieldErrors)
    }

    return sectionErrors
  }, [formData.fields.sections, currentSectionIndex, responses, isFieldVisible, isFieldRequired, isSectionVisible])

  const validateAllSections = useCallback(): ValidationError[] => {
    const allErrors: ValidationError[] = []

    for (const section of formData.fields.sections) {
      if (!isSectionVisible(section)) continue

      for (const field of section.fields) {
        if (!isFieldVisible(field)) continue

        const fieldErrors = FormValidator.validateField(
          { ...field, required: isFieldRequired(field) },
          responses[field.id]
        )
        allErrors.push(...fieldErrors)
      }
    }

    return allErrors
  }, [formData.fields.sections, responses, isFieldVisible, isFieldRequired, isSectionVisible])

  const calculateProgress = useCallback((): number => {
    const allFields = formData.fields.sections.flatMap(section => 
      isSectionVisible(section) ? section.fields.filter(isFieldVisible) : []
    )
    
    if (allFields.length === 0) return 100

    const completedFields = allFields.filter(field => {
      const value = responses[field.id]
      return value !== undefined && value !== null && value !== ""
    })

    return Math.round((completedFields.length / allFields.length) * 100)
  }, [formData.fields.sections, responses, isFieldVisible, isSectionVisible])

  const getVisibleSections = useCallback(() => {
    // Update logic engine with current responses
    logicEngine.updateResponses(responses)
    
    // Add form branches to logic engine if they exist
    if (formData.formBranches) {
      formData.formBranches.forEach((branch: any) => {
        logicEngine.addFormBranch(branch)
      })
    }
    
    // Get visible sections using the logic engine
    return logicEngine.getVisibleSections(formData.fields.sections)
  }, [formData.fields.sections, formData.formBranches, responses, logicEngine])

  const handleSaveDraft = async (silent = false) => {
    try {
      await saveProgress(responses)
      setLastSaveTime(new Date())
      
      if (!silent) {
        toast.success("Draft saved successfully")
      }
    } catch (error) {
      console.error("Error saving draft:", error)
      if (!silent) {
        toast.error("Failed to save draft")
      }
    }
  }

  const handleNextSection = () => {
    const errors = validateCurrentSection()
    
    if (errors.length > 0) {
      setValidationErrors(errors)
      toast.error("Please fix the errors before continuing")
      return
    }

    const visibleSections = getVisibleSections()
    
    // Check if form should end based on branching logic
    logicEngine.updateResponses(responses)
    if (logicEngine.shouldEndForm()) {
      // Trigger form submission instead of going to next section
      handleSubmit()
      return
    }
    
    // Check for section override based on branching logic
    const currentSectionId = visibleSections[currentSectionIndex]?.id
    const nextSectionOverride = logicEngine.getNextSection(currentSectionId || '')
    
    if (nextSectionOverride) {
      // Find the index of the target section
      const targetSectionIndex = visibleSections.findIndex(section => section.id === nextSectionOverride)
      if (targetSectionIndex >= 0) {
        setCurrentSectionIndex(targetSectionIndex)
        setValidationErrors([])
        return
      }
    }
    
    // Default navigation to next section
    if (currentSectionIndex < visibleSections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1)
      setValidationErrors([])
    }
  }

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1)
      setValidationErrors([])
    }
  }

  const handleSubmit = async () => {
    const errors = validateAllSections()
    
    if (errors.length > 0) {
      setValidationErrors(errors)
      toast.error("Please fix all errors before submitting")
      return
    }

    setIsSubmitting(true)
    try {
      const submissionData = {
        ...responses,
        _metadata: {
          startedAt: startTime.toISOString(),
          timeSpent: getTimeSpent(),
          userAgent: navigator.userAgent,
          submittedAt: new Date().toISOString()
        }
      }

      await onSubmit(submissionData, false)
      clearProgress()
      toast.success(formData.fields.settings.confirmationMessage || "Form submitted successfully!")
      
      // Redirect if specified
      if (formData.fields.settings.redirectUrl) {
        window.location.href = formData.fields.settings.redirectUrl
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      toast.error("Failed to submit form. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const visibleSections = getVisibleSections()
  const currentSection = visibleSections[currentSectionIndex]
  const progress = calculateProgress()
  const isLastSection = currentSectionIndex === visibleSections.length - 1
  const timeSpent = getTimeSpent()

  if (!currentSection) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No visible sections found. Please check your form configuration.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      {/* Form Header */}
      <Card className="mb-6">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{formData.name}</CardTitle>
          {formData.description && (
            <p className="text-gray-600 mt-2">{formData.description}</p>
          )}
          
          {/* Form Info */}
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-600">
            {formData.estimatedTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>~{formData.estimatedTime} min</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span>Secure & Encrypted</span>
            </div>
            {timeSpent > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Time spent: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Progress Bar */}
        {showProgress && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{progress}% complete</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Section {currentSectionIndex + 1} of {visibleSections.length}</span>
                {lastSaveTime && (
                  <span>Last saved: {lastSaveTime.toLocaleTimeString()}</span>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Current Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{currentSection.title}</CardTitle>
          {currentSection.description && (
            <p className="text-gray-600">{currentSection.description}</p>
          )}
        </CardHeader>

        <CardContent>
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert className="mb-6" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Please fix the following errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-sm">
                        {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Form Fields */}
          <div className={cn(
            "space-y-6",
            currentSection.styling?.layout === "two_column" && "grid grid-cols-1 md:grid-cols-2 gap-6",
            currentSection.styling?.layout === "grid" && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          )}>
            {currentSection.fields
              .filter(isFieldVisible)
              .map(field => (
                <FieldComponents
                  key={field.id}
                  field={{
                    ...field,
                    required: isFieldRequired(field)
                  }}
                  value={responses[field.id]}
                  onChange={(value) => updateResponse(field.id, value)}
                  error={validationErrors.find(e => e.fieldId === field.id)?.message}
                  disabled={isLoading || isSubmitting}
                />
              ))}
          </div>

          {/* PHI Notice */}
          {currentSection.fields.some(f => f.metadata?.isHealthData && isFieldVisible(f)) && (
            <Alert className="mt-6">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Protected Health Information</Badge>
                  <span className="text-sm">
                    Your health information is encrypted and securely stored in compliance with HIPAA regulations.
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex gap-2">
          {currentSectionIndex > 0 && (
            <Button
              variant="outline"
              onClick={handlePreviousSection}
              disabled={isLoading || isSubmitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {allowDrafts && formData.fields.settings.allowSaveProgress && (
            <Button
              variant="outline"
              onClick={() => handleSaveDraft(false)}
              disabled={isLoading || isSubmitting}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          )}

          {!isLastSection ? (
            <Button
              onClick={handleNextSection}
              disabled={isLoading || isSubmitting}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Form
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <Info className="h-4 w-4 inline mr-1" />
        {allowDrafts && formData.fields.settings.allowSaveProgress && (
          <span>Your progress is automatically saved. </span>
        )}
        Need help? Contact our support team.
      </div>
    </div>
  )
}