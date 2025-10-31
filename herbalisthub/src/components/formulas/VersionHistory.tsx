"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  History, 
  Clock, 
  User, 
  FileText, 
  RotateCcw, 
  Eye, 
  GitBranch,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface VersionHistoryItem {
  id: string
  version: number
  changeType: string
  changeTitle: string
  changeNotes?: string
  changes?: any
  formulaSnapshot: any
  createdAt: string
  creator: {
    id: string
    name: string
    email: string
  }
}

interface VersionHistoryProps {
  formulaId: string
}

export function VersionHistory({ formulaId }: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null)
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null)

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await fetch(`/api/formulas/${formulaId}/versions`)
        if (!response.ok) {
          throw new Error("Failed to fetch version history")
        }
        const data = await response.json()
        setVersions(data.versions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load version history")
      } finally {
        setLoading(false)
      }
    }

    if (formulaId) {
      fetchVersions()
    }
  }, [formulaId])

  const handleRestoreVersion = async (version: number) => {
    if (!confirm(`Are you sure you want to restore to version ${version}? This will create a new version based on the selected version.`)) {
      return
    }

    setRestoringVersion(version.toString())
    
    try {
      const response = await fetch(`/api/formulas/${formulaId}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version,
          notes: `Restored from version ${version}`
        })
      })

      if (!response.ok) {
        throw new Error("Failed to restore version")
      }

      toast.success(`Successfully restored to version ${version}`)
      // Refresh the version history
      window.location.reload()
    } catch (error) {
      console.error("Error restoring version:", error)
      toast.error("Failed to restore version")
    } finally {
      setRestoringVersion(null)
    }
  }

  const toggleVersionDetails = (versionId: string) => {
    setExpandedVersion(expandedVersion === versionId ? null : versionId)
  }

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case "CREATED":
        return "bg-green-100 text-green-800"
      case "UPDATED":
        return "bg-blue-100 text-blue-800"
      case "INGREDIENT_ADDED":
        return "bg-purple-100 text-purple-800"
      case "INGREDIENT_REMOVED":
        return "bg-red-100 text-red-800"
      case "INGREDIENT_MODIFIED":
        return "bg-yellow-100 text-yellow-800"
      case "PUBLISHED":
        return "bg-emerald-100 text-emerald-800"
      case "SCALED":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case "CREATED":
        return <FileText className="h-4 w-4" />
      case "SCALED":
        return <GitBranch className="h-4 w-4" />
      default:
        return <History className="h-4 w-4" />
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

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          <CardDescription>
            Track all changes and modifications to this formula
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No version history available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Version History
        </CardTitle>
        <CardDescription>
          Track all changes and modifications to this formula ({versions.length} versions)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {versions.map((version, index) => (
            <div key={version.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getChangeTypeIcon(version.changeType)}
                    <span className="font-medium">Version {version.version}</span>
                    {index === 0 && (
                      <Badge variant="default" className="text-xs">Latest</Badge>
                    )}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={getChangeTypeColor(version.changeType)}
                  >
                    {version.changeType.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleVersionDetails(version.id)}
                  >
                    {expandedVersion === version.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {index > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreVersion(version.version)}
                      disabled={restoringVersion === version.version.toString()}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      {restoringVersion === version.version.toString() ? "Restoring..." : "Restore"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-2">
                <p className="text-sm font-medium">{version.changeTitle}</p>
                {version.changeNotes && (
                  <p className="text-sm text-muted-foreground mt-1">{version.changeNotes}</p>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {version.creator.name}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(version.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>

              {expandedVersion === version.id && (
                <>
                  <Separator className="my-3" />
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Formula Snapshot</h4>
                      <div className="bg-muted p-3 rounded text-sm">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium">Name:</span> {version.formulaSnapshot.name}
                          </div>
                          <div>
                            <span className="font-medium">Category:</span> {version.formulaSnapshot.category || "None"}
                          </div>
                          <div>
                            <span className="font-medium">Ingredients:</span> {version.formulaSnapshot.ingredients?.length || 0}
                          </div>
                          <div>
                            <span className="font-medium">Yield:</span> {version.formulaSnapshot.yieldAmount} {version.formulaSnapshot.yieldUnit}
                          </div>
                        </div>
                      </div>
                    </div>

                    {version.changes && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Changes</h4>
                        <div className="bg-muted p-3 rounded text-sm">
                          <pre className="text-xs overflow-x-auto">
                            {JSON.stringify(version.changes, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}