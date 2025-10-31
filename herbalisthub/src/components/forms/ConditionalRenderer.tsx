"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ConditionalLogicEngine, ConditionalLogic, FormBranch } from "@/lib/forms/conditional-logic"
import { FieldComponents } from "./FieldComponents"
import { FormField, FormSection } from "./FormRenderer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Info, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConditionalRendererProps {
  formData: any
  responses: Record<string, any>
  onResponseChange: (fieldId: string, value: any) => void
  currentSectionIndex: number
  onSectionChange: (index: number) => void
  showDebugInfo?: boolean
  disabled?: boolean
}

interface FieldState {
  visible: boolean
  required: boolean
  disabled: boolean
}

export function ConditionalRenderer({
  formData,
  responses,
  onResponseChange,
  currentSectionIndex,
  onSectionChange,
  showDebugInfo = false,
  disabled = false
}: ConditionalRendererProps) {
  const [logicEngine] = useState(() => new ConditionalLogicEngine(responses))
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({})
  const [visibleSections, setVisibleSections] = useState<FormSection[]>([])
  const [nextSectionOverride, setNextSectionOverride] = useState<string | null>(null)
  const [formShouldEnd, setFormShouldEnd] = useState(false)

  // Update logic engine when responses change
  useEffect(() => {
    logicEngine.updateResponses(responses)
    
    // Add form branches to logic engine
    if (formData.formBranches) {
      formData.formBranches.forEach((branch: FormBranch) => {
        logicEngine.addFormBranch(branch)
      })
    }

    updateFieldStates()
    updateVisibleSections()
    checkFormBranching()
  }, [responses, formData, logicEngine])

  // Memoized field visibility calculation
  const fieldVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {}
    
    formData.fields?.sections?.forEach((section: FormSection) => {
      section.fields?.forEach((field: FormField) => {
        if (field.conditionalLogic) {
          const state = logicEngine.evaluateFieldLogic(field.conditionalLogic)
          visibility[field.id] = state.visible
        } else {
          visibility[field.id] = true
        }
      })
    })
    
    return visibility
  }, [formData, logicEngine, responses])

  /**
   * Update field states based on conditional logic
   */
  const updateFieldStates = useCallback(() => {
    const newFieldStates: Record<string, FieldState> = {}

    formData.fields?.sections?.forEach((section: FormSection) => {
      section.fields?.forEach((field: FormField) => {
        if (field.conditionalLogic) {
          const state = logicEngine.evaluateFieldLogic(field.conditionalLogic)
          newFieldStates[field.id] = state
        } else {
          newFieldStates[field.id] = {
            visible: true,
            required: field.required || false,
            disabled: false
          }
        }
      })
    })

    setFieldStates(newFieldStates)
  }, [formData, logicEngine])

  /**
   * Update visible sections based on conditional logic
   */
  const updateVisibleSections = useCallback(() => {
    const sections = logicEngine.getVisibleSections(formData.fields?.sections || [])
    setVisibleSections(sections)
  }, [formData, logicEngine])

  /**
   * Check for form branching logic
   */
  const checkFormBranching = useCallback(() => {
    const nextSection = logicEngine.getNextSection(
      visibleSections[currentSectionIndex]?.id || ''
    )
    setNextSectionOverride(nextSection)
    setFormShouldEnd(logicEngine.shouldEndForm())
  }, [logicEngine, visibleSections, currentSectionIndex])

  /**
   * Handle field value changes with validation
   */
  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    onResponseChange(fieldId, value)
    
    // Clear dependent field values if they become hidden
    setTimeout(() => {
      formData.fields?.sections?.forEach((section: FormSection) => {
        section.fields?.forEach((field: FormField) => {
          if (field.conditionalLogic) {
            const state = logicEngine.evaluateFieldLogic(field.conditionalLogic)
            if (!state.visible && responses[field.id] !== undefined) {
              onResponseChange(field.id, null)
            }
          }
        })
      })
    }, 0)
  }, [onResponseChange, formData, logicEngine, responses])

  /**
   * Get next section based on branching logic
   */
  const getNextSectionIndex = useCallback(() => {
    if (nextSectionOverride) {
      const targetSectionIndex = visibleSections.findIndex(
        section => section.id === nextSectionOverride
      )
      return targetSectionIndex >= 0 ? targetSectionIndex : currentSectionIndex + 1
    }
    return currentSectionIndex + 1
  }, [nextSectionOverride, visibleSections, currentSectionIndex])

  /**
   * Handle section navigation with branching logic
   */
  const handleNextSection = useCallback(() => {
    const nextIndex = getNextSectionIndex()
    if (nextIndex < visibleSections.length) {
      onSectionChange(nextIndex)
    }
  }, [getNextSectionIndex, visibleSections.length, onSectionChange])

  /**
   * Handle previous section navigation
   */
  const handlePreviousSection = useCallback(() => {
    if (currentSectionIndex > 0) {
      onSectionChange(currentSectionIndex - 1)
    }
  }, [currentSectionIndex, onSectionChange])

  /**
   * Render conditional field with state
   */
  const renderConditionalField = useCallback((field: FormField) => {
    const fieldState = fieldStates[field.id] || { visible: true, required: false, disabled: false }
    
    if (!fieldState.visible) {
      return null
    }

    const enhancedField = {
      ...field,
      required: fieldState.required
    }

    return (
      <div key={field.id} className="space-y-2">
        <FieldComponents
          field={enhancedField}
          value={responses[field.id]}
          onChange={(value) => handleFieldChange(field.id, value)}
          disabled={disabled || fieldState.disabled}
        />
        
        {showDebugInfo && (
          <DebugInfo
            field={field}
            state={fieldState}
            logic={field.conditionalLogic}
            responses={responses}
          />
        )}
      </div>
    )
  }, [fieldStates, responses, handleFieldChange, disabled, showDebugInfo])

  /**
   * Render conditional section
   */
  const renderConditionalSection = useCallback((section: FormSection, index: number) => {
    const isCurrentSection = index === currentSectionIndex
    const visibleFields = section.fields?.filter(field => 
      fieldStates[field.id]?.visible !== false
    ) || []

    if (visibleFields.length === 0 && !showDebugInfo) {
      return null
    }

    return (
      <div
        key={section.id}
        className={cn(
          "transition-all duration-300",
          isCurrentSection ? "block" : "hidden"
        )}
      >
        <div className="space-y-6">
          {/* Section Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              {showDebugInfo && (
                <Badge variant="outline" className="text-xs">
                  {visibleFields.length} visible fields
                </Badge>
              )}
            </div>
            {section.description && (
              <p className="text-gray-600">{section.description}</p>
            )}
          </div>

          {/* Branching Notice */}
          {nextSectionOverride && isCurrentSection && (
            <Alert>
              <ArrowRight className="h-4 w-4" />
              <AlertDescription>
                Based on your responses, you'll proceed to a specific section after this one.
              </AlertDescription>
            </Alert>
          )}

          {/* Form End Notice */}
          {formShouldEnd && isCurrentSection && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Based on your responses, the form will end after this section.
              </AlertDescription>
            </Alert>
          )}

          {/* Fields */}
          <div className={cn(
            "space-y-6",
            section.styling?.layout === "two_column" && "grid grid-cols-1 md:grid-cols-2 gap-6",
            section.styling?.layout === "grid" && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          )}>
            {section.fields?.map(renderConditionalField)}
          </div>

          {showDebugInfo && (
            <SectionDebugInfo
              section={section}
              visibleFields={visibleFields}
              fieldStates={fieldStates}
            />
          )}
        </div>
      </div>
    )
  }, [
    currentSectionIndex,
    fieldStates,
    showDebugInfo,
    nextSectionOverride,
    formShouldEnd,
    renderConditionalField
  ])

  if (!formData?.fields?.sections) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No form sections found. Please check your form configuration.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="text-sm text-gray-600">
        Section {currentSectionIndex + 1} of {visibleSections.length}
        {visibleSections.length !== formData.fields.sections.length && (
          <span className="ml-2">
            ({formData.fields.sections.length - visibleSections.length} sections hidden)
          </span>
        )}
      </div>

      {/* Conditional Sections */}
      {visibleSections.map(renderConditionalSection)}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6">
        <div>
          {currentSectionIndex > 0 && (
            <Button
              variant="outline"
              onClick={handlePreviousSection}
              disabled={disabled}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {!formShouldEnd && currentSectionIndex < visibleSections.length - 1 && (
            <Button
              onClick={handleNextSection}
              disabled={disabled}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Global Debug Info */}
      {showDebugInfo && (
        <GlobalDebugInfo
          logicEngine={logicEngine}
          formData={formData}
          responses={responses}
          visibleSections={visibleSections}
        />
      )}
    </div>
  )
}

/**
 * Debug component for field conditional logic
 */
interface DebugInfoProps {
  field: FormField
  state: FieldState
  logic?: ConditionalLogic
  responses: Record<string, any>
}

function DebugInfo({ field, state, logic, responses }: DebugInfoProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (!logic) return null

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">Debug: {field.id}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="h-6 px-2"
        >
          {showDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex gap-4">
          <span className={`px-2 py-1 rounded ${state.visible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {state.visible ? 'Visible' : 'Hidden'}
          </span>
          <span className={`px-2 py-1 rounded ${state.required ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'}`}>
            {state.required ? 'Required' : 'Optional'}
          </span>
          <span className={`px-2 py-1 rounded ${state.disabled ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
            {state.disabled ? 'Disabled' : 'Enabled'}
          </span>
        </div>

        {showDetails && (
          <div className="mt-2 space-y-1 text-xs">
            {logic.showIf && (
              <div>
                <strong>Show If:</strong> {JSON.stringify(logic.showIf, null, 2)}
              </div>
            )}
            {logic.hideIf && (
              <div>
                <strong>Hide If:</strong> {JSON.stringify(logic.hideIf, null, 2)}
              </div>
            )}
            {logic.requiredIf && (
              <div>
                <strong>Required If:</strong> {JSON.stringify(logic.requiredIf, null, 2)}
              </div>
            )}
            <div>
              <strong>Current Value:</strong> {JSON.stringify(responses[field.id])}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Debug component for section information
 */
interface SectionDebugInfoProps {
  section: FormSection
  visibleFields: FormField[]
  fieldStates: Record<string, FieldState>
}

function SectionDebugInfo({ section, visibleFields, fieldStates }: SectionDebugInfoProps) {
  return (
    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="font-medium text-blue-900 mb-2">Section Debug: {section.id}</h3>
      <div className="text-sm text-blue-800 space-y-1">
        <div>Total Fields: {section.fields?.length || 0}</div>
        <div>Visible Fields: {visibleFields.length}</div>
        <div>Hidden Fields: {(section.fields?.length || 0) - visibleFields.length}</div>
        
        {section.conditionalLogic && (
          <div className="mt-2">
            <strong>Section Logic:</strong>
            <pre className="text-xs mt-1 p-2 bg-white rounded border">
              {JSON.stringify(section.conditionalLogic, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Global debug information component
 */
interface GlobalDebugInfoProps {
  logicEngine: ConditionalLogicEngine
  formData: any
  responses: Record<string, any>
  visibleSections: FormSection[]
}

function GlobalDebugInfo({ logicEngine, formData, responses, visibleSections }: GlobalDebugInfoProps) {
  const [showGlobalDebug, setShowGlobalDebug] = useState(false)

  return (
    <div className="mt-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-purple-900">Global Debug Information</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowGlobalDebug(!showGlobalDebug)}
          className="text-purple-700"
        >
          {showGlobalDebug ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {showGlobalDebug && (
        <div className="space-y-4 text-sm">
          <div>
            <strong>Form Sections:</strong>
            <div className="mt-1 space-y-1">
              <div>Total: {formData.fields?.sections?.length || 0}</div>
              <div>Visible: {visibleSections.length}</div>
              <div>Hidden: {(formData.fields?.sections?.length || 0) - visibleSections.length}</div>
            </div>
          </div>

          <div>
            <strong>Active Branches:</strong>
            <pre className="text-xs mt-1 p-2 bg-white rounded border max-h-32 overflow-y-auto">
              {JSON.stringify(logicEngine.evaluateFormBranches(), null, 2)}
            </pre>
          </div>

          <div>
            <strong>Form Responses:</strong>
            <pre className="text-xs mt-1 p-2 bg-white rounded border max-h-32 overflow-y-auto">
              {JSON.stringify(responses, null, 2)}
            </pre>
          </div>

          <div>
            <strong>Next Section:</strong> {logicEngine.getNextSection('current') || 'Normal flow'}
          </div>

          <div>
            <strong>Should End Form:</strong> {logicEngine.shouldEndForm() ? 'Yes' : 'No'}
          </div>
        </div>
      )}
    </div>
  )
}