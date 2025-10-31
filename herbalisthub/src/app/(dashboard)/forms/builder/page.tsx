"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Role } from "@prisma/client"
import { FormBuilder } from "@/components/forms/FormBuilder"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, Eye, Settings } from "lucide-react"
import { toast } from "sonner"

export default function FormBuilderPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const formId = searchParams.get("id")
  const templateId = searchParams.get("template")
  
  const [formData, setFormData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Redirect if not authorized
  useEffect(() => {
    if (status === "loading") return
    
    if (!session?.user || ![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      router.push("/")
      return
    }
  }, [session, status, router])

  // Load existing form or template
  useEffect(() => {
    const loadFormData = async () => {
      if (!session?.user) return

      try {
        if (formId) {
          // Load existing form for editing
          const response = await fetch(`/api/intake-forms/${formId}`)
          if (response.ok) {
            const data = await response.json()
            setFormData(data)
          } else {
            toast.error("Failed to load form")
            router.push("/dashboard/forms")
          }
        } else if (templateId) {
          // Load template
          const response = await fetch(`/api/intake-forms/${templateId}`)
          if (response.ok) {
            const template = await response.json()
            // Create new form based on template
            setFormData({
              name: `${template.name} (Copy)`,
              description: template.description,
              fields: template.fields,
              category: template.category,
              estimatedTime: template.estimatedTime,
            })
            setHasUnsavedChanges(true)
          } else {
            toast.error("Failed to load template")
          }
        } else {
          // Create new blank form
          setFormData({
            name: "New Intake Form",
            description: "",
            fields: {
              sections: [
                {
                  id: "section_1",
                  title: "General Information",
                  description: "",
                  fields: [],
                }
              ],
              settings: {
                allowSaveProgress: true,
                requiresAuthentication: true,
              },
              metadata: {
                isTemplate: false,
              }
            },
            category: "General",
            estimatedTime: 10,
          })
          setHasUnsavedChanges(true)
        }
      } catch (error) {
        console.error("Error loading form data:", error)
        toast.error("Failed to load form data")
      } finally {
        setIsLoading(false)
      }
    }

    loadFormData()
  }, [formId, templateId, session, router])

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges || !formData) return

    const autoSaveTimer = setTimeout(async () => {
      await handleSave(true) // Auto-save as draft
    }, 30000) // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer)
  }, [formData, hasUnsavedChanges])

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handleFormChange = (updatedFormData: any) => {
    setFormData(updatedFormData)
    setHasUnsavedChanges(true)
  }

  const handleSave = async (isDraft = false) => {
    if (!formData || !session?.user) return

    setIsSaving(true)
    try {
      const saveData = {
        ...formData,
        fields: formData.fields,
        metadata: {
          ...formData.fields.metadata,
          isDraft,
        }
      }

      let response
      if (formId && !isDraft) {
        // Update existing form
        response = await fetch(`/api/intake-forms/${formId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saveData),
        })
      } else {
        // Create new form
        response = await fetch("/api/intake-forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saveData),
        })
      }

      if (response.ok) {
        const result = await response.json()
        setHasUnsavedChanges(false)
        
        if (!isDraft) {
          toast.success("Form saved successfully")
          if (!formId) {
            // Redirect to edit the newly created form
            router.push(`/dashboard/forms/builder?id=${result.form.id}`)
          }
        } else {
          toast.success("Draft saved automatically", { duration: 2000 })
        }
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to save form")
      }
    } catch (error) {
      console.error("Error saving form:", error)
      toast.error("Failed to save form")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreview = () => {
    // Open preview in new tab
    const previewUrl = formId 
      ? `/forms/preview?id=${formId}` 
      : `/forms/preview?data=${encodeURIComponent(JSON.stringify(formData))}`
    window.open(previewUrl, "_blank")
  }

  const handleSettings = () => {
    // Open form settings modal
    // TODO: Implement settings modal
    toast.info("Form settings coming soon")
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!session?.user || ![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
    return null
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/forms")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Button>
            <div>
              <h1 className="text-xl font-semibold">
                {formId ? "Edit Form" : "Create Form"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {formData?.name || "Untitled Form"}
                {hasUnsavedChanges && " (Unsaved changes)"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSettings}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={!formData}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={() => handleSave(false)}
              disabled={isSaving || !hasUnsavedChanges}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </header>

      {/* Form Builder Content */}
      <div className="flex-1 overflow-hidden">
        {formData && (
          <FormBuilder
            initialData={formData}
            onChange={handleFormChange}
            isLoading={isSaving}
          />
        )}
      </div>
    </div>
  )
}