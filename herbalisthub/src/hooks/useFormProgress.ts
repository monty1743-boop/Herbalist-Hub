"use client"

import { useState, useEffect, useCallback } from "react"

interface FormProgress {
  responses: Record<string, any>
  lastSaved: string
  timeSpent: number
  currentSection: number
  startedAt: string
}

export function useFormProgress(formId: string) {
  const [timeSpent, setTimeSpent] = useState(0)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const getStorageKey = (key: string) => `form_progress_${formId}_${key}`

  // Load progress from localStorage
  const getProgress = useCallback((): Record<string, any> => {
    if (typeof window === "undefined") return {}
    
    try {
      const saved = localStorage.getItem(getStorageKey("responses"))
      return saved ? JSON.parse(saved) : {}
    } catch (error) {
      console.error("Error loading form progress:", error)
      return {}
    }
  }, [formId])

  // Save progress to localStorage
  const saveProgress = useCallback(async (responses: Record<string, any>) => {
    if (typeof window === "undefined") return

    try {
      const progressData: FormProgress = {
        responses,
        lastSaved: new Date().toISOString(),
        timeSpent,
        currentSection: 0, // This could be expanded to track current section
        startedAt: localStorage.getItem(getStorageKey("startedAt")) || new Date().toISOString()
      }

      localStorage.setItem(getStorageKey("responses"), JSON.stringify(responses))
      localStorage.setItem(getStorageKey("metadata"), JSON.stringify(progressData))
      setLastSaved(new Date())
      
      // Also save to server if user is authenticated
      // This could be expanded to sync with backend
    } catch (error) {
      console.error("Error saving form progress:", error)
      throw error
    }
  }, [formId, timeSpent])

  // Clear progress from localStorage
  const clearProgress = useCallback(() => {
    if (typeof window === "undefined") return

    try {
      localStorage.removeItem(getStorageKey("responses"))
      localStorage.removeItem(getStorageKey("metadata"))
      localStorage.removeItem(getStorageKey("startedAt"))
      localStorage.removeItem(getStorageKey("timeSpent"))
      setTimeSpent(0)
      setLastSaved(null)
    } catch (error) {
      console.error("Error clearing form progress:", error)
    }
  }, [formId])

  // Update time spent
  const updateTimeSpent = useCallback((seconds: number) => {
    setTimeSpent(seconds)
    if (typeof window !== "undefined") {
      localStorage.setItem(getStorageKey("timeSpent"), seconds.toString())
    }
  }, [formId])

  // Get time spent
  const getTimeSpent = useCallback((): number => {
    if (typeof window === "undefined") return 0
    
    try {
      const saved = localStorage.getItem(getStorageKey("timeSpent"))
      return saved ? parseInt(saved) : 0
    } catch (error) {
      console.error("Error getting time spent:", error)
      return 0
    }
  }, [formId])

  // Check if form has been started
  const hasProgress = useCallback((): boolean => {
    if (typeof window === "undefined") return false
    
    const responses = getProgress()
    return Object.keys(responses).length > 0
  }, [getProgress])

  // Get progress metadata
  const getProgressMetadata = useCallback((): FormProgress | null => {
    if (typeof window === "undefined") return null
    
    try {
      const saved = localStorage.getItem(getStorageKey("metadata"))
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.error("Error getting progress metadata:", error)
      return null
    }
  }, [formId])

  // Calculate completion percentage
  const getCompletionPercentage = useCallback((allFieldIds: string[]): number => {
    const responses = getProgress()
    const completedFields = allFieldIds.filter(fieldId => {
      const value = responses[fieldId]
      return value !== undefined && value !== null && value !== ""
    })
    
    return allFieldIds.length > 0 ? Math.round((completedFields.length / allFieldIds.length) * 100) : 0
  }, [getProgress])

  // Auto-save with debouncing
  const autoSave = useCallback(
    debounce(async (responses: Record<string, any>) => {
      try {
        await saveProgress(responses)
      } catch (error) {
        console.error("Auto-save failed:", error)
      }
    }, 2000), // Debounce for 2 seconds
    [saveProgress]
  )

  // Initialize on mount
  useEffect(() => {
    if (typeof window === "undefined") return

    // Set start time if not already set
    if (!localStorage.getItem(getStorageKey("startedAt"))) {
      localStorage.setItem(getStorageKey("startedAt"), new Date().toISOString())
    }

    // Load saved time
    const savedTime = getTimeSpent()
    setTimeSpent(savedTime)

    // Load last saved time
    const metadata = getProgressMetadata()
    if (metadata?.lastSaved) {
      setLastSaved(new Date(metadata.lastSaved))
    }
  }, [formId, getTimeSpent, getProgressMetadata])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending auto-saves
      autoSave.cancel?.()
    }
  }, [autoSave])

  return {
    getProgress,
    saveProgress,
    clearProgress,
    updateTimeSpent,
    getTimeSpent,
    hasProgress,
    getProgressMetadata,
    getCompletionPercentage,
    autoSave,
    timeSpent,
    lastSaved,
  }
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel?: () => void } {
  let timeout: NodeJS.Timeout | null = null

  const debounced = ((...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
      timeout = null
    }, wait)
  }) as T & { cancel?: () => void }

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced
}

// Hook for managing form validation state
export function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)

  const setFieldError = useCallback((fieldId: string, error: string | null) => {
    setErrors(prev => {
      if (error === null) {
        const { [fieldId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [fieldId]: error }
    })
  }, [])

  const clearFieldError = useCallback((fieldId: string) => {
    setFieldError(fieldId, null)
  }, [setFieldError])

  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  const hasErrors = Object.keys(errors).length > 0
  const getFieldError = useCallback((fieldId: string) => errors[fieldId], [errors])

  return {
    errors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    hasErrors,
    getFieldError,
    isValidating,
    setIsValidating,
  }
}

// Hook for managing form accessibility
export function useFormAccessibility() {
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null)
  const [announcements, setAnnouncements] = useState<string[]>([])

  const focusField = useCallback((fieldId: string) => {
    setFocusedFieldId(fieldId)
    
    // Focus the actual field element
    setTimeout(() => {
      const element = document.getElementById(fieldId)
      if (element) {
        element.focus()
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }, 100)
  }, [])

  const announce = useCallback((message: string) => {
    setAnnouncements(prev => [...prev, message])
    
    // Clear announcement after a delay
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1))
    }, 3000)
  }, [])

  const focusFirstError = useCallback((errors: Record<string, string>) => {
    const firstErrorField = Object.keys(errors)[0]
    if (firstErrorField) {
      focusField(firstErrorField)
      announce(`Error in ${firstErrorField}: ${errors[firstErrorField]}`)
    }
  }, [focusField, announce])

  return {
    focusedFieldId,
    focusField,
    announce,
    announcements,
    focusFirstError,
  }
}

// Hook for managing form analytics
export function useFormAnalytics(formId: string) {
  const [analytics, setAnalytics] = useState({
    fieldInteractions: {} as Record<string, number>,
    timeOnFields: {} as Record<string, number>,
    abandonmentPoints: [] as string[],
  })

  const trackFieldInteraction = useCallback((fieldId: string) => {
    setAnalytics(prev => ({
      ...prev,
      fieldInteractions: {
        ...prev.fieldInteractions,
        [fieldId]: (prev.fieldInteractions[fieldId] || 0) + 1
      }
    }))
  }, [])

  const trackTimeOnField = useCallback((fieldId: string, timeSpent: number) => {
    setAnalytics(prev => ({
      ...prev,
      timeOnFields: {
        ...prev.timeOnFields,
        [fieldId]: (prev.timeOnFields[fieldId] || 0) + timeSpent
      }
    }))
  }, [])

  const trackAbandonmentPoint = useCallback((fieldId: string) => {
    setAnalytics(prev => ({
      ...prev,
      abandonmentPoints: [...prev.abandonmentPoints, fieldId]
    }))
  }, [])

  const getAnalytics = useCallback(() => analytics, [analytics])

  return {
    trackFieldInteraction,
    trackTimeOnField,
    trackAbandonmentPoint,
    getAnalytics,
  }
}