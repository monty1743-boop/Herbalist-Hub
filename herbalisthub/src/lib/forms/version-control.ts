import { z } from 'zod'

export interface FormVersion {
  id: string
  formId: string
  version: string
  name: string
  description: string
  changelog: Array<{
    type: 'added' | 'changed' | 'removed' | 'fixed' | 'security'
    description: string
    affectedFields?: string[]
    migrationRequired?: boolean
  }>
  schema: any
  createdBy: string
  createdAt: string
  status: 'draft' | 'published' | 'deprecated' | 'archived'
  publishedAt?: string
  parentVersion?: string
  metadata: {
    breakingChanges: boolean
    migrationComplexity: 'simple' | 'moderate' | 'complex'
    affectedSubmissions: number
    estimatedMigrationTime: number // in minutes
    compatibilityScore: number // 0-100
    backwardCompatible: boolean
  }
  approval?: {
    required: boolean
    approvedBy?: string
    approvedAt?: string
    rejectedBy?: string
    rejectedAt?: string
    rejectionReason?: string
  }
  rollback?: {
    canRollback: boolean
    rollbackTo?: string
    rollbackReason?: string
    rollbackBy?: string
    rollbackAt?: string
  }
}

export interface VersionComparison {
  fromVersion: string
  toVersion: string
  differences: Array<{
    type: 'field_added' | 'field_removed' | 'field_modified' | 'section_added' | 'section_removed' | 'section_modified' | 'settings_changed' | 'styling_changed'
    path: string
    oldValue?: any
    newValue?: any
    impact: 'low' | 'medium' | 'high'
    migrationRequired: boolean
  }>
  summary: {
    totalChanges: number
    breakingChanges: number
    addedFields: number
    removedFields: number
    modifiedFields: number
    migrationComplexity: 'simple' | 'moderate' | 'complex'
  }
}

export interface MigrationPlan {
  id: string
  formId: string
  fromVersion: string
  toVersion: string
  createdAt: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  steps: Array<{
    id: string
    type: 'data_migration' | 'schema_update' | 'notification' | 'validation' | 'cleanup'
    description: string
    estimatedTime: number
    dependencies: string[]
    status: 'pending' | 'running' | 'completed' | 'failed'
    startedAt?: string
    completedAt?: string
    error?: string
  }>
  affectedSubmissions: Array<{
    submissionId: string
    clientId: string
    status: 'pending' | 'migrated' | 'failed'
    backupCreated: boolean
    migrationLog?: string[]
  }>
  notifications: Array<{
    clientId: string
    notificationType: 'form_updated' | 'migration_required' | 'migration_completed' | 'action_required'
    status: 'pending' | 'sent' | 'failed'
    sentAt?: string
    content: {
      subject: string
      message: string
      actionRequired?: boolean
      actionUrl?: string
      deadline?: string
    }
  }>
  rollbackPlan?: {
    available: boolean
    steps: Array<{
      description: string
      automated: boolean
    }>
    estimatedTime: number
  }
}

export interface VersionDeployment {
  id: string
  formId: string
  versionId: string
  deployedBy: string
  deployedAt: string
  strategy: 'immediate' | 'scheduled' | 'gradual' | 'canary'
  schedule?: {
    scheduledAt: string
    timezone: string
  }
  gradualRollout?: {
    phases: Array<{
      name: string
      percentage: number
      startDate: string
      criteria: string[]
    }>
    currentPhase: number
  }
  canaryDeployment?: {
    canaryGroups: string[]
    successCriteria: Array<{
      metric: string
      threshold: number
      operator: 'gt' | 'lt' | 'eq'
    }>
    rollbackTriggers: string[]
  }
  status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'rolled_back'
  notifications: {
    practitionersNotified: boolean
    clientsNotified: boolean
    notificationsSent: number
    notificationsFailed: number
  }
}

/**
 * Form Version Control System
 * Manages form versioning, change tracking, migration, and deployment
 */
export class FormVersionControl {
  
  /**
   * Create new version of a form
   */
  static async createVersion(data: {
    formId: string
    name: string
    description: string
    changelog: FormVersion['changelog']
    schema: any
    createdBy: string
    parentVersion?: string
  }): Promise<FormVersion> {
    try {
      // Get current version for comparison
      const currentVersion = await this.getCurrentVersion(data.formId)
      
      // Generate version number
      const versionNumber = await this.generateVersionNumber(data.formId, currentVersion)
      
      // Analyze changes
      const analysis = currentVersion 
        ? await this.analyzeChanges(currentVersion.schema, data.schema)
        : this.createInitialAnalysis()

      const newVersion: FormVersion = {
        id: crypto.randomUUID(),
        formId: data.formId,
        version: versionNumber,
        name: data.name,
        description: data.description,
        changelog: data.changelog,
        schema: data.schema,
        createdBy: data.createdBy,
        createdAt: new Date().toISOString(),
        status: 'draft',
        parentVersion: data.parentVersion || currentVersion?.id,
        metadata: {
          breakingChanges: analysis.hasBreakingChanges,
          migrationComplexity: analysis.migrationComplexity,
          affectedSubmissions: analysis.affectedSubmissions,
          estimatedMigrationTime: analysis.estimatedMigrationTime,
          compatibilityScore: analysis.compatibilityScore,
          backwardCompatible: analysis.backwardCompatible
        },
        approval: {
          required: analysis.hasBreakingChanges || analysis.migrationComplexity !== 'simple'
        },
        rollback: {
          canRollback: Boolean(currentVersion),
          rollbackTo: currentVersion?.id
        }
      }

      // Save version
      await this.saveVersion(newVersion)

      return newVersion
    } catch (error) {
      console.error('Error creating version:', error)
      throw error
    }
  }

  /**
   * Compare two versions
   */
  static async compareVersions(
    formId: string,
    fromVersion: string,
    toVersion: string
  ): Promise<VersionComparison> {
    try {
      const [fromVersionData, toVersionData] = await Promise.all([
        this.getVersion(formId, fromVersion),
        this.getVersion(formId, toVersion)
      ])

      if (!fromVersionData || !toVersionData) {
        throw new Error('Version not found')
      }

      return this.performVersionComparison(fromVersionData, toVersionData)
    } catch (error) {
      console.error('Error comparing versions:', error)
      throw error
    }
  }

  /**
   * Deploy version to production
   */
  static async deployVersion(
    versionId: string,
    deployedBy: string,
    strategy: VersionDeployment['strategy'] = 'immediate',
    options?: {
      schedule?: VersionDeployment['schedule']
      gradualRollout?: VersionDeployment['gradualRollout']
      canaryDeployment?: VersionDeployment['canaryDeployment']
    }
  ): Promise<VersionDeployment> {
    try {
      const version = await this.getVersionById(versionId)
      if (!version) {
        throw new Error('Version not found')
      }

      // Check if version is approved (if approval required)
      if (version.approval?.required && !version.approval.approvedAt) {
        throw new Error('Version requires approval before deployment')
      }

      // Create migration plan if needed
      let migrationPlan: MigrationPlan | undefined
      if (version.metadata.migrationComplexity !== 'simple') {
        migrationPlan = await this.createMigrationPlan(version)
      }

      const deployment: VersionDeployment = {
        id: crypto.randomUUID(),
        formId: version.formId,
        versionId,
        deployedBy,
        deployedAt: new Date().toISOString(),
        strategy,
        schedule: options?.schedule,
        gradualRollout: options?.gradualRollout,
        canaryDeployment: options?.canaryDeployment,
        status: strategy === 'scheduled' ? 'pending' : 'deploying',
        notifications: {
          practitionersNotified: false,
          clientsNotified: false,
          notificationsSent: 0,
          notificationsFailed: 0
        }
      }

      // Save deployment
      await this.saveDeployment(deployment)

      // Execute deployment based on strategy
      switch (strategy) {
        case 'immediate':
          await this.executeImmediateDeployment(deployment, migrationPlan)
          break
        case 'scheduled':
          await this.scheduleDeployment(deployment, migrationPlan)
          break
        case 'gradual':
          await this.startGradualDeployment(deployment, migrationPlan)
          break
        case 'canary':
          await this.startCanaryDeployment(deployment, migrationPlan)
          break
      }

      return deployment
    } catch (error) {
      console.error('Error deploying version:', error)
      throw error
    }
  }

  /**
   * Rollback to previous version
   */
  static async rollbackVersion(
    formId: string,
    targetVersionId: string,
    rollbackBy: string,
    reason: string
  ): Promise<{
    success: boolean
    rollbackVersionId?: string
    migrationPlan?: MigrationPlan
    errors?: string[]
  }> {
    try {
      const currentVersion = await this.getCurrentVersion(formId)
      const targetVersion = await this.getVersionById(targetVersionId)

      if (!currentVersion || !targetVersion) {
        throw new Error('Version not found')
      }

      // Check if rollback is allowed
      if (!currentVersion.rollback?.canRollback) {
        throw new Error('Rollback not allowed for this version')
      }

      // Create rollback migration plan
      const migrationPlan = await this.createRollbackMigrationPlan(currentVersion, targetVersion)

      // Create rollback version
      const rollbackVersion: FormVersion = {
        ...targetVersion,
        id: crypto.randomUUID(),
        version: await this.generateVersionNumber(formId, currentVersion),
        name: `${targetVersion.name} (Rollback)`,
        description: `Rollback to version ${targetVersion.version}: ${reason}`,
        createdBy: rollbackBy,
        createdAt: new Date().toISOString(),
        status: 'published',
        publishedAt: new Date().toISOString(),
        parentVersion: currentVersion.id,
        rollback: {
          canRollback: true,
          rollbackTo: currentVersion.id,
          rollbackReason: reason,
          rollbackBy,
          rollbackAt: new Date().toISOString()
        }
      }

      // Save rollback version
      await this.saveVersion(rollbackVersion)

      // Execute rollback migration
      await this.executeMigrationPlan(migrationPlan)

      // Update current version status
      await this.updateVersionStatus(currentVersion.id, 'deprecated')

      // Send notifications about rollback
      await this.sendRollbackNotifications(formId, rollbackVersion, currentVersion, reason)

      return {
        success: true,
        rollbackVersionId: rollbackVersion.id,
        migrationPlan
      }
    } catch (error) {
      console.error('Error rolling back version:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Rollback failed']
      }
    }
  }

  /**
   * Get version history for a form
   */
  static async getVersionHistory(formId: string): Promise<FormVersion[]> {
    try {
      const response = await fetch(`/api/forms/${formId}/versions`)
      if (!response.ok) {
        throw new Error('Failed to get version history')
      }
      return await response.json()
    } catch (error) {
      console.error('Error getting version history:', error)
      return []
    }
  }

  /**
   * Get current active version
   */
  static async getCurrentVersion(formId: string): Promise<FormVersion | null> {
    try {
      const response = await fetch(`/api/forms/${formId}/current-version`)
      if (!response.ok) {
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error getting current version:', error)
      return null
    }
  }

  /**
   * Approve version for deployment
   */
  static async approveVersion(
    versionId: string,
    approvedBy: string,
    comments?: string
  ): Promise<void> {
    try {
      const response = await fetch(`/api/form-versions/${versionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvedBy,
          approvedAt: new Date().toISOString(),
          comments
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve version')
      }
    } catch (error) {
      console.error('Error approving version:', error)
      throw error
    }
  }

  /**
   * Reject version
   */
  static async rejectVersion(
    versionId: string,
    rejectedBy: string,
    reason: string
  ): Promise<void> {
    try {
      const response = await fetch(`/api/form-versions/${versionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectedBy,
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject version')
      }
    } catch (error) {
      console.error('Error rejecting version:', error)
      throw error
    }
  }

  // Private helper methods

  private static async generateVersionNumber(formId: string, currentVersion?: FormVersion): Promise<string> {
    if (!currentVersion) {
      return '1.0.0'
    }

    const [major, minor, patch] = currentVersion.version.split('.').map(Number)
    
    // For now, increment minor version for all changes
    // In a real system, this would be based on the type of changes
    return `${major}.${minor + 1}.0`
  }

  private static async analyzeChanges(oldSchema: any, newSchema: any): Promise<{
    hasBreakingChanges: boolean
    migrationComplexity: 'simple' | 'moderate' | 'complex'
    affectedSubmissions: number
    estimatedMigrationTime: number
    compatibilityScore: number
    backwardCompatible: boolean
  }> {
    // Analyze differences between schemas
    const differences = this.findSchemaDifferences(oldSchema, newSchema)
    
    const hasBreakingChanges = differences.some(diff => 
      diff.type === 'field_removed' || 
      (diff.type === 'field_modified' && diff.impact === 'high')
    )

    const migrationComplexity = hasBreakingChanges ? 'complex' : 
                                differences.length > 5 ? 'moderate' : 'simple'

    return {
      hasBreakingChanges,
      migrationComplexity,
      affectedSubmissions: 0, // Would calculate from actual submissions
      estimatedMigrationTime: differences.length * 2, // 2 minutes per change
      compatibilityScore: hasBreakingChanges ? 50 : 85,
      backwardCompatible: !hasBreakingChanges
    }
  }

  private static createInitialAnalysis() {
    return {
      hasBreakingChanges: false,
      migrationComplexity: 'simple' as const,
      affectedSubmissions: 0,
      estimatedMigrationTime: 0,
      compatibilityScore: 100,
      backwardCompatible: true
    }
  }

  private static findSchemaDifferences(oldSchema: any, newSchema: any): Array<any> {
    const differences: Array<any> = []
    
    // Compare sections
    const oldSections = oldSchema.sections || []
    const newSections = newSchema.sections || []
    
    // Find added sections
    newSections.forEach((newSection: any) => {
      if (!oldSections.find((s: any) => s.id === newSection.id)) {
        differences.push({
          type: 'section_added',
          path: `sections.${newSection.id}`,
          newValue: newSection,
          impact: 'low',
          migrationRequired: false
        })
      }
    })
    
    // Find removed sections
    oldSections.forEach((oldSection: any) => {
      if (!newSections.find((s: any) => s.id === oldSection.id)) {
        differences.push({
          type: 'section_removed',
          path: `sections.${oldSection.id}`,
          oldValue: oldSection,
          impact: 'high',
          migrationRequired: true
        })
      }
    })
    
    // Compare fields within sections
    oldSections.forEach((oldSection: any) => {
      const newSection = newSections.find((s: any) => s.id === oldSection.id)
      if (newSection) {
        const fieldDiffs = this.compareFields(oldSection.fields || [], newSection.fields || [])
        differences.push(...fieldDiffs)
      }
    })
    
    return differences
  }

  private static compareFields(oldFields: any[], newFields: any[]): Array<any> {
    const differences: Array<any> = []
    
    // Find added fields
    newFields.forEach(newField => {
      if (!oldFields.find(f => f.id === newField.id)) {
        differences.push({
          type: 'field_added',
          path: `fields.${newField.id}`,
          newValue: newField,
          impact: 'low',
          migrationRequired: false
        })
      }
    })
    
    // Find removed fields
    oldFields.forEach(oldField => {
      if (!newFields.find(f => f.id === oldField.id)) {
        differences.push({
          type: 'field_removed',
          path: `fields.${oldField.id}`,
          oldValue: oldField,
          impact: 'high',
          migrationRequired: true
        })
      }
    })
    
    // Find modified fields
    oldFields.forEach(oldField => {
      const newField = newFields.find(f => f.id === oldField.id)
      if (newField && JSON.stringify(oldField) !== JSON.stringify(newField)) {
        differences.push({
          type: 'field_modified',
          path: `fields.${oldField.id}`,
          oldValue: oldField,
          newValue: newField,
          impact: this.assessFieldModificationImpact(oldField, newField),
          migrationRequired: this.fieldModificationRequiresMigration(oldField, newField)
        })
      }
    })
    
    return differences
  }

  private static assessFieldModificationImpact(oldField: any, newField: any): 'low' | 'medium' | 'high' {
    // Type change is high impact
    if (oldField.type !== newField.type) return 'high'
    
    // Required change is medium impact
    if (oldField.required !== newField.required) return 'medium'
    
    // Label change is low impact
    return 'low'
  }

  private static fieldModificationRequiresMigration(oldField: any, newField: any): boolean {
    // Type changes require migration
    if (oldField.type !== newField.type) return true
    
    // Making field required requires migration
    if (!oldField.required && newField.required) return true
    
    // Options changes for select fields require migration
    if (oldField.type === 'select' && JSON.stringify(oldField.options) !== JSON.stringify(newField.options)) {
      return true
    }
    
    return false
  }

  private static async performVersionComparison(
    fromVersion: FormVersion,
    toVersion: FormVersion
  ): Promise<VersionComparison> {
    const differences = this.findSchemaDifferences(fromVersion.schema, toVersion.schema)
    
    const summary = {
      totalChanges: differences.length,
      breakingChanges: differences.filter(d => d.impact === 'high').length,
      addedFields: differences.filter(d => d.type === 'field_added').length,
      removedFields: differences.filter(d => d.type === 'field_removed').length,
      modifiedFields: differences.filter(d => d.type === 'field_modified').length,
      migrationComplexity: differences.some(d => d.impact === 'high') ? 'complex' as const :
                          differences.length > 5 ? 'moderate' as const : 'simple' as const
    }

    return {
      fromVersion: fromVersion.version,
      toVersion: toVersion.version,
      differences,
      summary
    }
  }

  private static async createMigrationPlan(version: FormVersion): Promise<MigrationPlan> {
    // Create a migration plan based on the version changes
    const migrationPlan: MigrationPlan = {
      id: crypto.randomUUID(),
      formId: version.formId,
      fromVersion: version.parentVersion || 'none',
      toVersion: version.id,
      createdAt: new Date().toISOString(),
      status: 'pending',
      steps: [],
      affectedSubmissions: [],
      notifications: [],
      rollbackPlan: {
        available: Boolean(version.parentVersion),
        steps: [
          { description: 'Restore previous schema', automated: true },
          { description: 'Migrate response data back', automated: true },
          { description: 'Notify clients of rollback', automated: false }
        ],
        estimatedTime: 15
      }
    }

    // Add migration steps based on complexity
    if (version.metadata.breakingChanges) {
      migrationPlan.steps.push({
        id: crypto.randomUUID(),
        type: 'data_migration',
        description: 'Migrate existing form responses to new schema',
        estimatedTime: version.metadata.estimatedMigrationTime,
        dependencies: [],
        status: 'pending'
      })
    }

    migrationPlan.steps.push({
      id: crypto.randomUUID(),
      type: 'schema_update',
      description: 'Update form schema to new version',
      estimatedTime: 5,
      dependencies: [],
      status: 'pending'
    })

    migrationPlan.steps.push({
      id: crypto.randomUUID(),
      type: 'notification',
      description: 'Notify clients of form updates',
      estimatedTime: 10,
      dependencies: [],
      status: 'pending'
    })

    return migrationPlan
  }

  private static async getVersion(formId: string, version: string): Promise<FormVersion | null> {
    try {
      const response = await fetch(`/api/forms/${formId}/versions/${version}`)
      if (!response.ok) return null
      return await response.json()
    } catch (error) {
      console.error('Error getting version:', error)
      return null
    }
  }

  private static async getVersionById(versionId: string): Promise<FormVersion | null> {
    try {
      const response = await fetch(`/api/form-versions/${versionId}`)
      if (!response.ok) return null
      return await response.json()
    } catch (error) {
      console.error('Error getting version by ID:', error)
      return null
    }
  }

  private static async saveVersion(version: FormVersion): Promise<void> {
    const response = await fetch('/api/form-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(version)
    })
    
    if (!response.ok) {
      throw new Error('Failed to save version')
    }
  }

  private static async saveDeployment(deployment: VersionDeployment): Promise<void> {
    const response = await fetch('/api/form-deployments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deployment)
    })
    
    if (!response.ok) {
      throw new Error('Failed to save deployment')
    }
  }

  private static async executeImmediateDeployment(
    deployment: VersionDeployment,
    migrationPlan?: MigrationPlan
  ): Promise<void> {
    // Execute immediate deployment
    if (migrationPlan) {
      await this.executeMigrationPlan(migrationPlan)
    }
    
    // Update deployment status
    await this.updateDeploymentStatus(deployment.id, 'deployed')
    
    // Send notifications
    await this.sendDeploymentNotifications(deployment)
  }

  private static async scheduleDeployment(
    deployment: VersionDeployment,
    migrationPlan?: MigrationPlan
  ): Promise<void> {
    // Schedule deployment for later
    // This would integrate with a job scheduler
    console.log('Deployment scheduled for:', deployment.schedule?.scheduledAt)
  }

  private static async startGradualDeployment(
    deployment: VersionDeployment,
    migrationPlan?: MigrationPlan
  ): Promise<void> {
    // Start gradual rollout
    // This would implement phased deployment logic
    console.log('Starting gradual deployment')
  }

  private static async startCanaryDeployment(
    deployment: VersionDeployment,
    migrationPlan?: MigrationPlan
  ): Promise<void> {
    // Start canary deployment
    // This would deploy to a subset of users first
    console.log('Starting canary deployment')
  }

  private static async createRollbackMigrationPlan(
    currentVersion: FormVersion,
    targetVersion: FormVersion
  ): Promise<MigrationPlan> {
    // Create migration plan for rollback
    return {
      id: crypto.randomUUID(),
      formId: currentVersion.formId,
      fromVersion: currentVersion.id,
      toVersion: targetVersion.id,
      createdAt: new Date().toISOString(),
      status: 'pending',
      steps: [
        {
          id: crypto.randomUUID(),
          type: 'data_migration',
          description: 'Rollback form responses to previous schema',
          estimatedTime: 10,
          dependencies: [],
          status: 'pending'
        }
      ],
      affectedSubmissions: [],
      notifications: []
    }
  }

  private static async executeMigrationPlan(migrationPlan: MigrationPlan): Promise<void> {
    // Execute migration plan steps
    for (const step of migrationPlan.steps) {
      await this.executeMigrationStep(step)
    }
  }

  private static async executeMigrationStep(step: any): Promise<void> {
    // Execute individual migration step
    console.log('Executing migration step:', step.description)
    
    // Update step status
    step.status = 'completed'
    step.completedAt = new Date().toISOString()
  }

  private static async updateVersionStatus(versionId: string, status: FormVersion['status']): Promise<void> {
    await fetch(`/api/form-versions/${versionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
  }

  private static async updateDeploymentStatus(deploymentId: string, status: VersionDeployment['status']): Promise<void> {
    await fetch(`/api/form-deployments/${deploymentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
  }

  private static async sendRollbackNotifications(
    formId: string,
    rollbackVersion: FormVersion,
    previousVersion: FormVersion,
    reason: string
  ): Promise<void> {
    // Send notifications about rollback
    await fetch('/api/notifications/form-rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formId,
        rollbackVersion: rollbackVersion.version,
        previousVersion: previousVersion.version,
        reason
      })
    })
  }

  private static async sendDeploymentNotifications(deployment: VersionDeployment): Promise<void> {
    // Send notifications about deployment
    await fetch('/api/notifications/form-deployment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deployment)
    })
  }
}

// Zod schemas for validation
export const FormVersionSchema = z.object({
  id: z.string(),
  formId: z.string(),
  version: z.string(),
  name: z.string(),
  description: z.string(),
  changelog: z.array(z.object({
    type: z.enum(['added', 'changed', 'removed', 'fixed', 'security']),
    description: z.string(),
    affectedFields: z.array(z.string()).optional(),
    migrationRequired: z.boolean().optional()
  })),
  schema: z.any(),
  createdBy: z.string(),
  createdAt: z.string(),
  status: z.enum(['draft', 'published', 'deprecated', 'archived']),
  publishedAt: z.string().optional(),
  parentVersion: z.string().optional(),
  metadata: z.object({
    breakingChanges: z.boolean(),
    migrationComplexity: z.enum(['simple', 'moderate', 'complex']),
    affectedSubmissions: z.number(),
    estimatedMigrationTime: z.number(),
    compatibilityScore: z.number(),
    backwardCompatible: z.boolean()
  })
})