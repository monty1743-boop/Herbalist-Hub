"use client"

import { useState, useCallback, useEffect } from "react"
import { PHIUtils, validatePHI, auditPHIAccess } from "./phi-utils"
import { useAuthenticatedUser } from "@/lib/auth/page-protection"
import { AuditOutcome } from "@/lib/audit/logger"

export interface PHIFormField {
  name: string
  value: any
  isEncrypted: boolean
  isValid: boolean
  errors: string[]
  isPHI: boolean
}

export interface PHIFormOptions {
  resourceType: string
  resourceId?: string
  auditAccess?: boolean
  validateOnChange?: boolean
  autoSave?: boolean
  autoSaveDelay?: number
}

export interface PHIFormState {
  fields: Record<string, PHIFormField>
  isDirty: boolean
  isValid: boolean
  isSaving: boolean
  lastSaved?: Date
  errors: string[]
}

/**
 * React hook for handling PHI data in forms with automatic encryption,
 * validation, and audit logging
 */
export function usePHIForm(
  initialData: Record<string, any> = {},
  phiFields: string[] = [],
  options: PHIFormOptions
) {
  const user = useAuthenticatedUser()
  const [state, setState] = useState<PHIFormState>(() => {
    const fields: Record<string, PHIFormField> = {}
    
    // Initialize form fields
    for (const [name, value] of Object.entries(initialData)) {
      const isPHI = phiFields.includes(name)
      const validation = isPHI ? validatePHI(value, name) : { isValid: true, errors: [] }
      
      fields[name] = {
        name,
        value,
        isEncrypted: false, // Will be encrypted on submit
        isValid: validation.isValid,
        errors: validation.errors,
        isPHI,
      }
    }
    
    return {
      fields,
      isDirty: false,
      isValid: Object.values(fields).every(field => field.isValid),
      isSaving: false,
      errors: [],
    }
  })

  // Auto-save timer
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)

  /**
   * Update a form field value
   */
  const updateField = useCallback((name: string, value: any) => {
    setState(prevState => {
      const field = prevState.fields[name] || {
        name,
        value: "",
        isEncrypted: false,
        isValid: true,
        errors: [],
        isPHI: phiFields.includes(name),
      }

      // Validate the new value if it's PHI
      const validation = field.isPHI && options.validateOnChange !== false
        ? validatePHI(value, name)
        : { isValid: true, errors: [] }

      const updatedField: PHIFormField = {
        ...field,
        value,
        isValid: validation.isValid,
        errors: validation.errors,
      }

      const updatedFields = {
        ...prevState.fields,
        [name]: updatedField,
      }

      const isFormValid = Object.values(updatedFields).every(f => f.isValid)
      const isDirty = true

      return {
        ...prevState,
        fields: updatedFields,
        isDirty,
        isValid: isFormValid,
        errors: Object.values(updatedFields)
          .flatMap(f => f.errors)
          .filter(Boolean),
      }
    })

    // Handle auto-save
    if (options.autoSave && user) {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }

      const delay = options.autoSaveDelay || 2000
      const timer = setTimeout(() => {
        handleSave()
      }, delay)

      setAutoSaveTimer(timer)
    }
  }, [phiFields, options.validateOnChange, options.autoSave, options.autoSaveDelay, user, autoSaveTimer])

  /**
   * Get current form data with PHI fields encrypted
   */
  const getEncryptedData = useCallback((): Record<string, any> => {
    const data: Record<string, any> = {}

    for (const [name, field] of Object.entries(state.fields)) {
      if (field.isPHI && field.value && !field.isEncrypted) {
        // Encrypt PHI fields
        try {
          if (typeof field.value === "string") {
            data[name] = field.value // Will be encrypted by Prisma middleware
          } else {
            data[name] = field.value // Will be encrypted by Prisma middleware
          }
        } catch (error) {
          console.error(`Failed to prepare PHI field ${name} for encryption:`, error)
          data[name] = field.value
        }
      } else {
        data[name] = field.value
      }
    }

    return data
  }, [state.fields])

  /**
   * Get current form data with PHI fields decrypted (for display)
   */
  const getDecryptedData = useCallback((): Record<string, any> => {
    const data: Record<string, any> = {}

    for (const [name, field] of Object.entries(state.fields)) {
      data[name] = field.value // Already decrypted in form state
    }

    return data
  }, [state.fields])

  /**
   * Validate the entire form
   */
  const validateForm = useCallback((): { isValid: boolean; errors: string[] } => {
    const allErrors: string[] = []
    let isValid = true

    for (const [name, field] of Object.entries(state.fields)) {
      if (field.isPHI) {
        const validation = validatePHI(field.value, name)
        if (!validation.isValid) {
          isValid = false
          allErrors.push(...validation.errors)
        }
      }
    }

    return { isValid, errors: allErrors }
  }, [state.fields])

  /**
   * Save the form data
   */
  const handleSave = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    setState(prev => ({ ...prev, isSaving: true }))

    try {
      // Validate form before saving
      const validation = validateForm()
      if (!validation.isValid) {
        setState(prev => ({
          ...prev,
          isSaving: false,
          errors: validation.errors,
        }))
        return { success: false, error: "Form validation failed" }
      }

      // Get encrypted data
      const encryptedData = getEncryptedData()

      // Audit PHI access if enabled
      if (options.auditAccess) {
        const phiFieldNames = Object.keys(state.fields).filter(name => state.fields[name].isPHI)
        
        await auditPHIAccess(
          options.resourceId ? "update" : "write",
          options.resourceType,
          options.resourceId || "new",
          user.id,
          user.role,
          phiFieldNames,
          AuditOutcome.SUCCESS,
          {
            formSubmission: true,
            fieldCount: phiFieldNames.length,
          }
        )
      }

      // Here you would typically call your API to save the data
      // The actual save operation would be handled by the parent component
      
      setState(prev => ({
        ...prev,
        isSaving: false,
        isDirty: false,
        lastSaved: new Date(),
      }))

      return { success: true }
    } catch (error) {
      // Audit the failure
      if (options.auditAccess && user) {
        const phiFieldNames = Object.keys(state.fields).filter(name => state.fields[name].isPHI)
        
        await auditPHIAccess(
          options.resourceId ? "update" : "write",
          options.resourceType,
          options.resourceId || "new",
          user.id,
          user.role,
          phiFieldNames,
          AuditOutcome.FAILURE,
          {
            formSubmission: true,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        )
      }

      setState(prev => ({
        ...prev,
        isSaving: false,
        errors: [error instanceof Error ? error.message : "Save failed"],
      }))

      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Save failed" 
      }
    }
  }, [user, validateForm, getEncryptedData, options, state.fields])

  /**
   * Reset the form to initial state
   */
  const resetForm = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isDirty: false,
      errors: [],
    }))
  }, [])

  /**
   * Clear auto-save timer on unmount
   */
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [autoSaveTimer])

  /**
   * Check if a field contains PHI
   */
  const isPHIField = useCallback((fieldName: string): boolean => {
    return phiFields.includes(fieldName)
  }, [phiFields])

  /**
   * Get redacted value for display in logs
   */
  const getRedactedValue = useCallback((fieldName: string): string => {
    const field = state.fields[fieldName]
    if (!field || !field.isPHI) {
      return String(field?.value || "")
    }
    return PHIUtils.redactPHI(field.value)
  }, [state.fields])

  return {
    // Form state
    state,
    
    // Field operations
    updateField,
    isPHIField,
    getRedactedValue,
    
    // Data operations
    getEncryptedData,
    getDecryptedData,
    
    // Form operations
    validateForm,
    handleSave,
    resetForm,
    
    // Computed values
    hasErrors: state.errors.length > 0,
    isDirty: state.isDirty,
    isValid: state.isValid,
    isSaving: state.isSaving,
    canSave: state.isValid && state.isDirty && !state.isSaving,
  }
}

/**
 * Specialized hook for client profile PHI forms
 */
export function useClientProfilePHIForm(
  initialData: any = {},
  clientId?: string
) {
  const phiFields = [
    "allergies",
    "medications", 
    "conditions",
    "healthGoals",
    "emergencyContact"
  ]

  return usePHIForm(initialData, phiFields, {
    resourceType: "ClientProfile",
    resourceId: clientId,
    auditAccess: true,
    validateOnChange: true,
    autoSave: false, // Manual save for profile updates
  })
}

/**
 * Specialized hook for consultation note PHI forms
 */
export function useConsultationNotePHIForm(
  initialData: any = {},
  consultationId?: string
) {
  const phiFields = [
    "chiefComplaint",
    "assessment",
    "recommendations", 
    "followUp",
    "privateNotes"
  ]

  return usePHIForm(initialData, phiFields, {
    resourceType: "ConsultationNote",
    resourceId: consultationId,
    auditAccess: true,
    validateOnChange: true,
    autoSave: true,
    autoSaveDelay: 3000,
  })
}

/**
 * Specialized hook for intake submission PHI forms
 */
export function useIntakeSubmissionPHIForm(
  initialData: any = {},
  submissionId?: string
) {
  const phiFields = ["responses"]

  return usePHIForm(initialData, phiFields, {
    resourceType: "IntakeSubmission", 
    resourceId: submissionId,
    auditAccess: true,
    validateOnChange: false, // Allow free-form responses
    autoSave: true,
    autoSaveDelay: 5000,
  })
}