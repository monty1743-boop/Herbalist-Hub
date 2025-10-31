'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  GitBranch, 
  GitCommit, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  RotateCcw,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  Calendar,
  FileText,
  Activity,
  Zap,
  Shield,
  Target,
  ArrowRight,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { FormVersionControl, FormVersion, VersionComparison, VersionDeployment } from '@/lib/forms/version-control'
import { FormMigrationEngine, MigrationResult } from '@/lib/forms/form-migration'

interface VersionManagerProps {
  formId: string
  practitionerId: string
  onVersionChange?: (version: FormVersion) => void
  className?: string
}

interface NewVersionData {
  name: string
  description: string
  changelog: Array<{
    type: 'added' | 'changed' | 'removed' | 'fixed' | 'security'
    description: string
    affectedFields?: string[]
  }>
}

export function VersionManager({
  formId,
  practitionerId,
  onVersionChange,
  className
}: VersionManagerProps) {
  // State management
  const [versions, setVersions] = useState<FormVersion[]>([])
  const [currentVersion, setCurrentVersion] = useState<FormVersion | null>(null)
  const [selectedVersions, setSelectedVersions] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [comparison, setComparison] = useState<VersionComparison | null>(null)
  const [deployments, setDeployments] = useState<VersionDeployment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Dialog states
  const [showCreateVersion, setShowCreateVersion] = useState(false)
  const [showDeployment, setShowDeployment] = useState(false)
  const [showRollback, setShowRollback] = useState(false)
  const [showMigration, setShowMigration] = useState(false)
  
  // Form states
  const [newVersionData, setNewVersionData] = useState<NewVersionData>({
    name: '',
    description: '',
    changelog: []
  })
  const [deploymentStrategy, setDeploymentStrategy] = useState<'immediate' | 'scheduled' | 'gradual' | 'canary'>('immediate')
  const [rollbackVersion, setRollbackVersion] = useState('')
  const [rollbackReason, setRollbackReason] = useState('')
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)

  useEffect(() => {
    loadVersionHistory()
    loadCurrentVersion()
    loadDeployments()
  }, [formId])

  const loadVersionHistory = async () => {
    try {
      setIsLoading(true)
      const history = await FormVersionControl.getVersionHistory(formId)
      setVersions(history)
    } catch (error) {
      console.error('Error loading version history:', error)
      setError('Failed to load version history')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCurrentVersion = async () => {
    try {
      const current = await FormVersionControl.getCurrentVersion(formId)
      setCurrentVersion(current)
    } catch (error) {
      console.error('Error loading current version:', error)
    }
  }

  const loadDeployments = async () => {
    try {
      // Load deployment history
      const response = await fetch(`/api/forms/${formId}/deployments`)
      if (response.ok) {
        const deploymentData = await response.json()
        setDeployments(deploymentData)
      }
    } catch (error) {
      console.error('Error loading deployments:', error)
    }
  }

  const handleCreateVersion = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current form schema
      const formResponse = await fetch(`/api/intake-forms/${formId}`)
      if (!formResponse.ok) {
        throw new Error('Failed to get form data')
      }
      const formData = await formResponse.json()

      const newVersion = await FormVersionControl.createVersion({
        formId,
        name: newVersionData.name,
        description: newVersionData.description,
        changelog: newVersionData.changelog,
        schema: formData,
        createdBy: practitionerId,
        parentVersion: currentVersion?.id
      })

      // Refresh version history
      await loadVersionHistory()
      
      // Reset form
      setNewVersionData({ name: '', description: '', changelog: [] })
      setShowCreateVersion(false)
      
      onVersionChange?.(newVersion)
    } catch (error) {
      console.error('Error creating version:', error)
      setError('Failed to create version')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompareVersions = async () => {
    if (!selectedVersions.from || !selectedVersions.to) {
      setError('Please select two versions to compare')
      return
    }

    try {
      setIsLoading(true)
      const comparisonResult = await FormVersionControl.compareVersions(
        formId,
        selectedVersions.from,
        selectedVersions.to
      )
      setComparison(comparisonResult)
    } catch (error) {
      console.error('Error comparing versions:', error)
      setError('Failed to compare versions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeployVersion = async (versionId: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const deployment = await FormVersionControl.deployVersion(
        versionId,
        practitionerId,
        deploymentStrategy
      )

      await loadDeployments()
      await loadCurrentVersion()
      setShowDeployment(false)
    } catch (error) {
      console.error('Error deploying version:', error)
      setError('Failed to deploy version')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRollback = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await FormVersionControl.rollbackVersion(
        formId,
        rollbackVersion,
        practitionerId,
        rollbackReason
      )

      if (result.success) {
        await loadVersionHistory()
        await loadCurrentVersion()
        setShowRollback(false)
      } else {
        setError(result.errors?.join(', ') || 'Rollback failed')
      }
    } catch (error) {
      console.error('Error rolling back:', error)
      setError('Failed to rollback version')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMigration = async (fromVersion: string, toVersion: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await FormMigrationEngine.migrateFormResponses(
        formId,
        fromVersion,
        toVersion,
        practitionerId
      )

      setMigrationResult(result)
      
      if (!result.success) {
        setError(`Migration failed: ${result.errors.length} errors occurred`)
      }
    } catch (error) {
      console.error('Error migrating data:', error)
      setError('Failed to migrate data')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: FormVersion['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'deprecated':
        return 'bg-gray-100 text-gray-800'
      case 'archived':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <span className="text-green-600">+</span>
      case 'changed':
        return <span className="text-blue-600">~</span>
      case 'removed':
        return <span className="text-red-600">-</span>
      case 'fixed':
        return <span className="text-orange-600">✓</span>
      case 'security':
        return <Shield className="h-4 w-4 text-purple-600" />
      default:
        return <span className="text-gray-600">•</span>
    }
  }

  const addChangelogEntry = () => {
    setNewVersionData(prev => ({
      ...prev,
      changelog: [
        ...prev.changelog,
        { type: 'changed', description: '', affectedFields: [] }
      ]
    }))
  }

  const updateChangelogEntry = (index: number, updates: Partial<typeof newVersionData.changelog[0]>) => {
    setNewVersionData(prev => ({
      ...prev,
      changelog: prev.changelog.map((entry, i) => 
        i === index ? { ...entry, ...updates } : entry
      )
    }))
  }

  const removeChangelogEntry = (index: number) => {
    setNewVersionData(prev => ({
      ...prev,
      changelog: prev.changelog.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className={cn("space-y-6", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Version Control</h2>
          <p className="text-muted-foreground">
            Manage form versions, track changes, and deploy updates
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateVersion(true)}
          >
            <GitCommit className="h-4 w-4 mr-2" />
            New Version
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRollback(true)}
            disabled={!currentVersion?.rollback?.canRollback}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Rollback
          </Button>
        </div>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="history">Version History</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="migration">Migration</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          {/* Current Version */}
          {currentVersion && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Current Version: {currentVersion.version}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentVersion.name}
                    </p>
                  </div>
                  <Badge className={getStatusColor(currentVersion.status)}>
                    {currentVersion.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Published</p>
                    <p className="font-medium">
                      {currentVersion.publishedAt 
                        ? format(new Date(currentVersion.publishedAt), 'PPP')
                        : 'Not published'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Breaking Changes</p>
                    <p className="font-medium">
                      {currentVersion.metadata.breakingChanges ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Compatibility</p>
                    <p className="font-medium">
                      {currentVersion.metadata.compatibilityScore}%
                    </p>
                  </div>
                </div>
                
                {currentVersion.description && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{currentVersion.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Version History */}
          <div className="space-y-3">
            {versions.map((version) => (
              <Card key={version.id} className={cn(
                "transition-colors",
                version.id === currentVersion?.id && "border-green-200"
              )}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{version.version}</span>
                          <Badge className={getStatusColor(version.status)}>
                            {version.status}
                          </Badge>
                        </div>
                        
                        {version.metadata.breakingChanges && (
                          <Badge variant="destructive" className="text-xs">
                            Breaking Changes
                          </Badge>
                        )}
                      </div>
                      
                      <h4 className="font-medium mb-1">{version.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {version.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Created {format(new Date(version.createdAt), 'PPp')}</span>
                        <span>•</span>
                        <span>Migration: {version.metadata.migrationComplexity}</span>
                        <span>•</span>
                        <span>{version.metadata.affectedSubmissions} submissions</span>
                      </div>
                      
                      {/* Changelog */}
                      {version.changelog.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {version.changelog.map((change, index) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              {getChangeTypeIcon(change.type)}
                              <span>{change.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      {version.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => handleDeployVersion(version.id)}
                          disabled={isLoading}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Deploy
                        </Button>
                      )}
                      
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compare Versions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Version</Label>
                  <Select
                    value={selectedVersions.from}
                    onValueChange={(value) => 
                      setSelectedVersions(prev => ({ ...prev, from: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map(version => (
                        <SelectItem key={version.id} value={version.version}>
                          {version.version} - {version.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>To Version</Label>
                  <Select
                    value={selectedVersions.to}
                    onValueChange={(value) => 
                      setSelectedVersions(prev => ({ ...prev, to: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map(version => (
                        <SelectItem key={version.id} value={version.version}>
                          {version.version} - {version.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={handleCompareVersions} disabled={isLoading}>
                <Eye className="h-4 w-4 mr-2" />
                Compare Versions
              </Button>
            </CardContent>
          </Card>

          {/* Comparison Results */}
          {comparison && (
            <Card>
              <CardHeader>
                <CardTitle>Comparison Results</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {comparison.fromVersion} → {comparison.toVersion}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{comparison.summary.totalChanges}</p>
                    <p className="text-sm text-muted-foreground">Total Changes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{comparison.summary.breakingChanges}</p>
                    <p className="text-sm text-muted-foreground">Breaking Changes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{comparison.summary.addedFields}</p>
                    <p className="text-sm text-muted-foreground">Added Fields</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{comparison.summary.modifiedFields}</p>
                    <p className="text-sm text-muted-foreground">Modified Fields</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Detailed Changes</h4>
                  {comparison.differences.map((diff, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={diff.impact === 'high' ? 'destructive' : 
                                        diff.impact === 'medium' ? 'default' : 'secondary'}>
                            {diff.type.replace('_', ' ')}
                          </Badge>
                          <span className="font-medium">{diff.path}</span>
                        </div>
                        <Badge variant="outline">
                          {diff.impact} impact
                        </Badge>
                      </div>
                      {diff.migrationRequired && (
                        <p className="text-sm text-orange-600 mt-1">
                          Migration required
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deployments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deployments.map((deployment) => (
              <Card key={deployment.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">Version {deployment.versionId}</p>
                        <p className="text-sm text-muted-foreground">
                          {deployment.strategy} deployment
                        </p>
                      </div>
                      <Badge className={
                        deployment.status === 'deployed' ? 'bg-green-100 text-green-800' :
                        deployment.status === 'failed' ? 'bg-red-100 text-red-800' :
                        deployment.status === 'deploying' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {deployment.status}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p>Deployed: {format(new Date(deployment.deployedAt), 'PPp')}</p>
                      <p>By: {deployment.deployedBy}</p>
                    </div>
                    
                    <div className="text-sm">
                      <p>Notifications: {deployment.notifications.notificationsSent} sent</p>
                      {deployment.notifications.notificationsFailed > 0 && (
                        <p className="text-red-600">
                          {deployment.notifications.notificationsFailed} failed
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="migration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Migration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Migrate form responses between versions
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setShowMigration(true)}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Migration
              </Button>
            </CardContent>
          </Card>

          {/* Migration Results */}
          {migrationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {migrationResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  Migration Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {migrationResult.migratedRecords}
                    </p>
                    <p className="text-sm text-muted-foreground">Migrated</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {migrationResult.failedRecords}
                    </p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {migrationResult.summary.successRate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {Math.round(migrationResult.summary.processingTime / 1000)}s
                    </p>
                    <p className="text-sm text-muted-foreground">Processing Time</p>
                  </div>
                </div>

                {migrationResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600">Errors</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {migrationResult.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-600">
                          {error.recordId}: {error.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {migrationResult.rollbackInfo?.available && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Rollback available. Backup file: {migrationResult.rollbackInfo.rollbackFile}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Version Dialog */}
      <Dialog open={showCreateVersion} onOpenChange={setShowCreateVersion}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogDescription>
              Create a new version of this form with your recent changes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="versionName">Version Name</Label>
                <Input
                  id="versionName"
                  value={newVersionData.name}
                  onChange={(e) => setNewVersionData(prev => ({ 
                    ...prev, 
                    name: e.target.value 
                  }))}
                  placeholder="e.g., Updated intake questionnaire"
                />
              </div>
              <div className="space-y-2">
                <Label>Parent Version</Label>
                <Input
                  value={currentVersion?.version || 'None'}
                  disabled
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="versionDescription">Description</Label>
              <Textarea
                id="versionDescription"
                value={newVersionData.description}
                onChange={(e) => setNewVersionData(prev => ({ 
                  ...prev, 
                  description: e.target.value 
                }))}
                placeholder="Describe the changes in this version"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Changelog</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addChangelogEntry}
                >
                  Add Entry
                </Button>
              </div>
              
              <div className="space-y-2">
                {newVersionData.changelog.map((entry, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Select
                      value={entry.type}
                      onValueChange={(value: any) => 
                        updateChangelogEntry(index, { type: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="added">Added</SelectItem>
                        <SelectItem value="changed">Changed</SelectItem>
                        <SelectItem value="removed">Removed</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input
                      value={entry.description}
                      onChange={(e) => 
                        updateChangelogEntry(index, { description: e.target.value })
                      }
                      placeholder="Describe the change"
                      className="flex-1"
                    />
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeChangelogEntry(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateVersion(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateVersion} disabled={isLoading}>
              Create Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog open={showRollback} onOpenChange={setShowRollback}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback Version</DialogTitle>
            <DialogDescription>
              Rollback to a previous version of this form
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target Version</Label>
              <Select value={rollbackVersion} onValueChange={setRollbackVersion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version to rollback to" />
                </SelectTrigger>
                <SelectContent>
                  {versions
                    .filter(v => v.status === 'published' && v.id !== currentVersion?.id)
                    .map(version => (
                      <SelectItem key={version.id} value={version.id}>
                        {version.version} - {version.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rollbackReason">Rollback Reason</Label>
              <Textarea
                id="rollbackReason"
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                placeholder="Explain why you're rolling back"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRollback(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRollback} 
              disabled={isLoading || !rollbackVersion || !rollbackReason}
            >
              Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}