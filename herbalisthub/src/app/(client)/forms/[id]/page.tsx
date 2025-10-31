"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Role } from "@prisma/client"
import { FormRenderer } from "@/components/forms/FormRenderer"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Shield,
  FileText,
  Info
} from "lucide-react"
import { toast } from "sonner"

interface FormData {
  id: string
  name: string
  description?: string
  fields: {
    sections: any[]
    settings: Record<string, any>
    metadata: Record<string, any>
  }
  category?: string
  estimatedTime?: number
  version: number
  isActive: boolean
}

interface Submission {
  id: string
  completedAt: string | null
  isReviewed: boolean
}

export default function ClientFormPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const formId = params.id as string

  const [formData, setFormData] = useState<FormData | null>(null)
  const [existingSubmissions, setExistingSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load form data and check existing submissions
  useEffect(() => {
    const loadFormData = async () => {
      if (!session?.user) return

      try {
        setIsLoading(true)
        setError(null)

        // Load form data
        const formResponse = await fetch(`/api/intake-forms/${formId}`)
        if (!formResponse.ok) {
          if (formResponse.status === 404) {
            setError("Form not found")
          } else if (formResponse.status === 403) {
            setError("You don't have permission to access this form")
          } else {
            setError("Failed to load form")
          }
          return
        }

        const form = await formResponse.json()
        
        // Check if form is active
        if (!form.isActive) {
          setError("This form is no longer available")
          return
        }

        setFormData(form)

        // Load existing submissions
        if (form.mySubmissions) {
          setExistingSubmissions(form.mySubmissions)
          
          // Check if already completed and multiple submissions not allowed
          const completedSubmission = form.mySubmissions.find((s: Submission) => s.completedAt)
          if (completedSubmission && !form.fields.settings.allowMultipleSubmissions) {
            setIsCompleted(true)
          }
        }

      } catch (error) {
        console.error("Error loading form:", error)
        setError("Failed to load form")
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user) {
      loadFormData()
    }
  }, [formId, session])

  // Redirect if not authenticated or not a client
  useEffect(() => {
    if (status === "loading") return

    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=/forms/${formId}`)
      return
    }

    if (session.user.role !== Role.CLIENT) {
      router.push("/")
      return
    }
  }, [session, status, router, formId])

  const handleSubmit = async (responses: Record<string, any>, isDraft = false) => {
    if (!formData || !session?.user) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/intake-forms/${formId}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          responses,
          isDraft,
          metadata: {
            userAgent: navigator.userAgent,
            timeSpent: responses._metadata?.timeSpent,
            startedAt: responses._metadata?.startedAt,
          }
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to submit form")
      }

      const result = await response.json()
      
      if (!isDraft) {
        setIsCompleted(true)
        toast.success(
          formData.fields.settings.confirmationMessage || 
          "Thank you! Your form has been submitted successfully."
        )
      } else {
        toast.success("Draft saved successfully")
      }

    } catch (error) {
      console.error("Error submitting form:", error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackToDashboard = () => {
    router.push("/dashboard")
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!session?.user || session.user.role !== Role.CLIENT) {
    return null
  }

  if (error) {
    return (
      <div className="container mx-auto py-12">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-semibold mb-2">Unable to Load Form</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleBackToDashboard}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="container mx-auto py-12">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-6 text-green-500" />
            <h1 className="text-2xl font-bold mb-4">Form Submitted Successfully!</h1>
            <p className="text-gray-600 mb-6">
              {formData?.fields.settings.confirmationMessage || 
               "Thank you for completing the intake form. Your responses have been securely submitted and will be reviewed by your healthcare provider."}
            </p>
            
            {existingSubmissions.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Your Submissions</h3>
                <div className="space-y-2">
                  {existingSubmissions.map((submission) => (
                    <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          Submitted on {new Date(submission.completedAt!).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {submission.isReviewed ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Reviewed
                          </span>
                        ) : (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Pending Review
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button onClick={handleBackToDashboard}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              
              {formData?.fields.settings.allowMultipleSubmissions && (
                <Button variant="outline" onClick={() => setIsCompleted(false)}>
                  Submit Another Response
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToDashboard}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Form Status Alert */}
        {existingSubmissions.length > 0 && !formData.fields.settings.allowMultipleSubmissions && (
          <Alert className="mb-6 max-w-4xl mx-auto">
            <Info className="h-4 w-4" />
            <AlertDescription>
              You have already submitted this form. If you need to make changes, please contact your healthcare provider.
            </AlertDescription>
          </Alert>
        )}

        {/* Form Deadline Warning */}
        {formData.fields.settings.submissionDeadline && (
          <Alert className="mb-6 max-w-4xl mx-auto">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Deadline:</strong> This form must be completed by{" "}
              {new Date(formData.fields.settings.submissionDeadline).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Privacy Notice */}
        <Alert className="mb-6 max-w-4xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Your information is encrypted and protected under HIPAA regulations.
              </span>
              <Button variant="link" size="sm" className="h-auto p-0">
                Privacy Policy
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {/* Form Renderer */}
        <FormRenderer
          formData={formData}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          showProgress={true}
          allowDrafts={formData.fields.settings.allowSaveProgress}
          className="max-w-4xl mx-auto"
        />
      </div>
    </div>
  )
}