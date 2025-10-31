"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Globe, 
  Lock, 
  Users, 
  ShoppingBag,
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Upload,
  AlertCircle,
  Shield
} from "lucide-react"
import { toast } from "sonner"

interface PublishingStatus {
  formula: {
    id: string
    name: string
    isPublic: boolean
    isDraft: boolean
    publishedAt?: string
  }
  status: string
  visibility: string
  validation: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
  canPublish: boolean
  publishingBlockers: string[]
  publishingWarnings: string[]
}

interface PublishingWorkflowProps {
  formulaId: string
  onStatusChange?: () => void
}

const VisibilityLevel = {
  PRIVATE: "PRIVATE",
  PRACTICE: "PRACTICE", 
  PUBLIC: "PUBLIC",
  MARKETPLACE: "MARKETPLACE"
} as const

export function PublishingWorkflow({ formulaId, onStatusChange }: PublishingWorkflowProps) {
  const [status, setStatus] = useState<PublishingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [selectedVisibility, setSelectedVisibility] = useState<string>(VisibilityLevel.PUBLIC)
  const [publishingNotes, setPublishingNotes] = useState("")
  const [skipValidation, setSkipValidation] = useState(false)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/formulas/${formulaId}/publish`)
        if (!response.ok) {
          throw new Error("Failed to fetch publishing status")
        }
        const data = await response.json()
        setStatus(data)
        setSelectedVisibility(data.visibility || VisibilityLevel.PUBLIC)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load publishing status")
      } finally {
        setLoading(false)
      }
    }

    if (formulaId) {
      fetchStatus()
    }
  }, [formulaId])

  const handlePublish = async () => {
    if (!status) return

    setPublishing(true)
    
    try {
      const response = await fetch(`/api/formulas/${formulaId}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visibility: selectedVisibility,
          publishingNotes,
          skipValidation,
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        if (result.warnings && result.warnings.length > 0) {
          toast.warning(`Published with warnings: ${result.warnings.join(", ")}`)
        }
        // Refresh status
        const statusResponse = await fetch(`/api/formulas/${formulaId}/publish`)
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          setStatus(statusData)
        }
        onStatusChange?.()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error publishing formula:", error)
      toast.error("Failed to publish formula")
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    if (!confirm("Are you sure you want to unpublish this formula? It will no longer be visible to the public.")) {
      return
    }

    setPublishing(true)
    
    try {
      const response = await fetch(`/api/formulas/${formulaId}/publish`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Formula unpublished by user"
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        // Refresh status
        const statusResponse = await fetch(`/api/formulas/${formulaId}/publish`)
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          setStatus(statusData)
        }
        onStatusChange?.()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error unpublishing formula:", error)
      toast.error("Failed to unpublish formula")
    } finally {
      setPublishing(false)
    }
  }

  const handleChangeVisibility = async () => {
    if (!status) return

    setPublishing(true)
    
    try {
      const response = await fetch(`/api/formulas/${formulaId}/publish`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visibility: selectedVisibility,
          notes: publishingNotes || `Changed visibility to ${selectedVisibility.toLowerCase()}`
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        // Refresh status
        const statusResponse = await fetch(`/api/formulas/${formulaId}/publish`)
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          setStatus(statusData)
        }
        onStatusChange?.()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error changing visibility:", error)
      toast.error("Failed to change visibility")
    } finally {
      setPublishing(false)
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case VisibilityLevel.PRIVATE:
        return <Lock className="h-4 w-4" />
      case VisibilityLevel.PRACTICE:
        return <Users className="h-4 w-4" />
      case VisibilityLevel.PUBLIC:
        return <Globe className="h-4 w-4" />
      case VisibilityLevel.MARKETPLACE:
        return <ShoppingBag className="h-4 w-4" />
      default:
        return <Lock className="h-4 w-4" />
    }
  }

  const getVisibilityDescription = (visibility: string) => {
    switch (visibility) {
      case VisibilityLevel.PRIVATE:
        return "Only you can see this formula"
      case VisibilityLevel.PRACTICE:
        return "Practice members can see this formula"
      case VisibilityLevel.PUBLIC:
        return "Anyone can see this formula"
      case VisibilityLevel.MARKETPLACE:
        return "Available in the public marketplace"
      default:
        return "Unknown visibility level"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800"
      case "PUBLISHED":
        return "bg-green-100 text-green-800"
      case "PENDING_REVIEW":
        return "bg-yellow-100 text-yellow-800"
      case "REJECTED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !status) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error || "Failed to load publishing status"}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Publishing & Visibility
        </CardTitle>
        <CardDescription>
          Manage who can see and access this formula
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {status.formula.isPublic && !status.formula.isDraft ? (
                <Eye className="h-5 w-5 text-green-600" />
              ) : (
                <EyeOff className="h-5 w-5 text-gray-600" />
              )}
              <div>
                <p className="font-medium">{status.formula.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={getStatusColor(status.status)}>
                    {status.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getVisibilityIcon(status.visibility)}
                    {status.visibility.toLowerCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          {status.formula.publishedAt && (
            <div className="text-sm text-muted-foreground">
              Published: {new Date(status.formula.publishedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Validation Status */}
        {status.publishingBlockers.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Publishing is blocked by the following issues:</div>
              <ul className="list-disc list-inside space-y-1">
                {status.publishingBlockers.map((blocker, index) => (
                  <li key={index}>{blocker}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {status.publishingWarnings.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Publishing warnings:</div>
              <ul className="list-disc list-inside space-y-1">
                {status.publishingWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {status.canPublish && status.publishingWarnings.length === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Formula is ready for publishing. All validation checks have passed.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Publishing Controls */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="visibility">Visibility Level</Label>
            <Select value={selectedVisibility} onValueChange={setSelectedVisibility}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select visibility level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VisibilityLevel.PRIVATE}>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <div>
                      <div>Private</div>
                      <div className="text-xs text-muted-foreground">Only you can see</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value={VisibilityLevel.PRACTICE}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <div>Practice</div>
                      <div className="text-xs text-muted-foreground">Practice members can see</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value={VisibilityLevel.PUBLIC}>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <div>
                      <div>Public</div>
                      <div className="text-xs text-muted-foreground">Anyone can see</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value={VisibilityLevel.MARKETPLACE}>
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    <div>
                      <div>Marketplace</div>
                      <div className="text-xs text-muted-foreground">Available for purchase</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              {getVisibilityDescription(selectedVisibility)}
            </p>
          </div>

          <div>
            <Label htmlFor="publishingNotes">Publishing Notes (Optional)</Label>
            <Textarea
              id="publishingNotes"
              placeholder="Add any notes about this publishing action..."
              value={publishingNotes}
              onChange={(e) => setPublishingNotes(e.target.value)}
              className="mt-2"
            />
          </div>

          {!status.canPublish && (
            <div className="flex items-center space-x-2">
              <Switch
                id="skipValidation"
                checked={skipValidation}
                onCheckedChange={setSkipValidation}
              />
              <Label htmlFor="skipValidation" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Skip validation (Admin only)
              </Label>
            </div>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="space-x-2">
            {status.formula.isPublic && !status.formula.isDraft ? (
              <>
                <Button
                  onClick={handleChangeVisibility}
                  disabled={publishing || selectedVisibility === status.visibility}
                >
                  {publishing ? "Updating..." : "Update Visibility"}
                </Button>
                <Button
                  onClick={handleUnpublish}
                  variant="outline"
                  disabled={publishing}
                >
                  {publishing ? "Unpublishing..." : "Unpublish"}
                </Button>
              </>
            ) : (
              <Button
                onClick={handlePublish}
                disabled={publishing || (!status.canPublish && !skipValidation)}
              >
                {publishing ? "Publishing..." : "Publish Formula"}
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            {status.canPublish ? (
              "Ready to publish"
            ) : (
              `${status.publishingBlockers.length} issue(s) blocking publication`
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}