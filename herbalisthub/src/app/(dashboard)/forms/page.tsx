"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Role } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Copy, 
  Trash2, 
  Eye,
  BarChart3,
  Users,
  FileText,
  Calendar,
  Settings
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

interface IntakeForm {
  id: string
  name: string
  description?: string
  category?: string
  estimatedTime?: number
  isActive: boolean
  isRequired: boolean
  version: number
  createdAt: string
  updatedAt: string
  _count: {
    submissions: number
  }
}

export default function FormsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [forms, setForms] = useState<IntakeForm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Redirect if not authorized
  useEffect(() => {
    if (status === "loading") return
    
    if (!session?.user || ![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      router.push("/")
      return
    }
  }, [session, status, router])

  // Load forms
  useEffect(() => {
    const loadForms = async () => {
      if (!session?.user) return

      try {
        const params = new URLSearchParams({
          search: searchQuery,
          category: selectedCategory === "all" ? "" : selectedCategory,
        })

        const response = await fetch(`/api/intake-forms?${params}`)
        if (response.ok) {
          const data = await response.json()
          setForms(data.forms)
        } else {
          toast.error("Failed to load forms")
        }
      } catch (error) {
        console.error("Error loading forms:", error)
        toast.error("Failed to load forms")
      } finally {
        setIsLoading(false)
      }
    }

    loadForms()
  }, [session, searchQuery, selectedCategory])

  const handleCreateForm = () => {
    router.push("/dashboard/forms/builder")
  }

  const handleEditForm = (formId: string) => {
    router.push(`/dashboard/forms/builder?id=${formId}`)
  }

  const handleDuplicateForm = async (form: IntakeForm) => {
    router.push(`/dashboard/forms/builder?template=${form.id}`)
  }

  const handleDeleteForm = async (formId: string) => {
    if (!confirm("Are you sure you want to delete this form?")) return

    try {
      const response = await fetch(`/api/intake-forms/${formId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setForms(forms.filter(f => f.id !== formId))
        toast.success("Form deleted successfully")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to delete form")
      }
    } catch (error) {
      console.error("Error deleting form:", error)
      toast.error("Failed to delete form")
    }
  }

  const handleViewResponses = (formId: string) => {
    router.push(`/dashboard/forms/${formId}/responses`)
  }

  const handleViewAnalytics = (formId: string) => {
    router.push(`/dashboard/forms/${formId}/analytics`)
  }

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         form.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || form.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = [
    { id: "all", label: "All Forms", count: forms.length },
    { id: "General", label: "General", count: forms.filter(f => f.category === "General").length },
    { id: "Medical", label: "Medical", count: forms.filter(f => f.category === "Medical").length },
    { id: "Initial", label: "Initial", count: forms.filter(f => f.category === "Initial").length },
    { id: "Follow-up", label: "Follow-up", count: forms.filter(f => f.category === "Follow-up").length },
  ]

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
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Intake Forms</h1>
          <p className="text-gray-600 mt-1">
            Create and manage client intake forms
          </p>
        </div>
        <Button onClick={handleCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          Create Form
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search forms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.label}
                  <Badge variant="secondary" className="ml-2">
                    {category.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forms Grid */}
      {filteredForms.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredForms.map((form) => (
            <Card key={form.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{form.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {form.description || "No description"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!form.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    {form.isRequired && (
                      <Badge variant="default">Required</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {/* Form Info */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Version {form.version}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {form.estimatedTime || 5} min
                    </div>
                  </div>

                  {/* Submissions Count */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="h-4 w-4" />
                      {form._count.submissions} responses
                    </div>
                    <span className="text-gray-500">
                      Updated {formatDistanceToNow(new Date(form.updatedAt))} ago
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditForm(form.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateForm(form)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteForm(form.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewResponses(form.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Responses
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAnalytics(form.id)}
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Analytics
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery || selectedCategory !== "all" ? "No forms found" : "No forms yet"}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || selectedCategory !== "all" 
                ? "Try adjusting your search or filter criteria"
                : "Create your first intake form to get started"
              }
            </p>
            {(!searchQuery && selectedCategory === "all") && (
              <Button onClick={handleCreateForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Form
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}