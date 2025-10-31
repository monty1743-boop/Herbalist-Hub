"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { FormRenderer } from "@/components/forms/FormRenderer"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function FormPreviewPage() {
  const searchParams = useSearchParams()
  const formId = searchParams.get("id")
  const encodedData = searchParams.get("data")
  
  const [formData, setFormData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (encodedData) {
          // Load from encoded data (for unsaved forms)
          try {
            const data = JSON.parse(decodeURIComponent(encodedData))
            setFormData(data)
          } catch (e) {
            setError("Invalid form data")
          }
        } else if (formId) {
          // Load from API
          const response = await fetch(`/api/intake-forms/${formId}`)
          if (response.ok) {
            const data = await response.json()
            setFormData(data)
          } else {
            setError("Form not found")
          }
        } else {
          setError("No form data provided")
        }
      } catch (error) {
        console.error("Error loading form:", error)
        setError("Failed to load form")
      } finally {
        setIsLoading(false)
      }
    }

    loadFormData()
  }, [formId, encodedData])

  const handleSubmit = async (responses: Record<string, any>, isDraft = false) => {
    // In preview mode, just log the responses
    console.log("Form submission (preview mode):", { responses, isDraft })
    alert(`Form submitted in preview mode!\n\nResponses: ${JSON.stringify(responses, null, 2)}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-12">
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="container mx-auto py-12">
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No form data available</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Preview Notice */}
        <Alert className="mb-6 max-w-4xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Preview Mode:</strong> This is a preview of your form. Submissions will not be saved.
          </AlertDescription>
        </Alert>

        {/* Form Renderer */}
        <FormRenderer
          formData={formData}
          onSubmit={handleSubmit}
          showProgress={true}
          allowDrafts={false}
          className="max-w-4xl mx-auto"
        />
      </div>
    </div>
  )
}