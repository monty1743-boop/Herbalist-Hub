import { z } from 'zod'
import { FormResponseEncryption } from './response-encryption'
import { FormResponseAudit } from './response-audit'

export interface MigrationRule {
  id: string
  name: string
  description: string
  fromVersion: string
  toVersion: string
  type: 'field_mapping' | 'data_transformation' | 'validation_update' | 'structure_change'
  rules: Array<{
    source: string
    target: string
    transformation?: 'copy' | 'convert' | 'split' | 'merge' | 'calculate' | 'default'
    transformationConfig?: any
    condition?: string
    required: boolean
  }>
  rollbackRules?: Array<{
    source: string
    target: string
    transformation?: string
    condition?: string
  }>
  validationRules: Array<{
    field: string
    rule: string
    errorMessage: string
  }>
}

export interface MigrationResult {
  success: boolean
  migratedRecords: number
  failedRecords: number
  errors: Array<{
    recordId: string
    error: string
    field?: string
  }>
  warnings: Array<{
    recordId: string
    warning: string
    field?: string
  }>
  summary: {
    totalProcessed: number
    successRate: number
    processingTime: number
    dataIntegrityChecks: {
      passed: number
      failed: number
      warnings: number
    }
  }
  rollbackInfo?: {
    available: boolean
    rollbackFile?: string
    instructions: string[]
  }
}

export interface DataTransformation {
  type: 'copy' | 'convert' | 'split' | 'merge' | 'calculate' | 'default'
  config: any
}

export interface MigrationContext {
  formId: string
  fromVersion: string
  toVersion: string
  fromSchema: any
  toSchema: any
  practitionerId: string
  migrationId: string
  options: {
    createBackup: boolean
    validateIntegrity: boolean
    rollbackOnFailure: boolean
    batchSize: number
    maxErrors: number
  }
}

/**
 * Form Migration Engine
 * Handles data migration between form versions
 */
export class FormMigrationEngine {
  
  /**
   * Migrate form responses from one version to another
   */
  static async migrateFormResponses(
    formId: string,
    fromVersion: string,
    toVersion: string,
    practitionerId: string,
    options: {
      createBackup?: boolean
      validateIntegrity?: boolean
      rollbackOnFailure?: boolean
      batchSize?: number
      maxErrors?: number
    } = {}
  ): Promise<MigrationResult> {
    const migrationId = crypto.randomUUID()
    
    try {
      // Set up migration context
      const context: MigrationContext = {
        formId,
        fromVersion,
        toVersion,
        fromSchema: await this.getFormSchema(formId, fromVersion),
        toSchema: await this.getFormSchema(formId, toVersion),
        practitionerId,
        migrationId,
        options: {
          createBackup: options.createBackup ?? true,
          validateIntegrity: options.validateIntegrity ?? true,
          rollbackOnFailure: options.rollbackOnFailure ?? true,
          batchSize: options.batchSize ?? 100,
          maxErrors: options.maxErrors ?? 10
        }
      }

      // Create migration rules
      const migrationRules = await this.generateMigrationRules(context)
      
      // Create backup if requested
      let backupFile: string | undefined
      if (context.options.createBackup) {
        backupFile = await this.createBackup(formId, fromVersion)
      }

      // Get form responses to migrate
      const responses = await this.getFormResponses(formId, fromVersion)
      
      // Process migration in batches
      const result = await this.processMigrationBatches(context, migrationRules, responses)
      
      // Add rollback info
      result.rollbackInfo = {
        available: Boolean(backupFile),
        rollbackFile: backupFile,
        instructions: this.generateRollbackInstructions(context, backupFile)
      }

      // Log migration completion
      await FormResponseAudit.logMigrationCompletion({
        migrationId,
        formId,
        fromVersion,
        toVersion,
        practitionerId,
        result,
        completedAt: new Date().toISOString()
      })

      return result
    } catch (error) {
      console.error('Migration failed:', error)
      
      // Log migration failure
      await FormResponseAudit.logMigrationFailure({
        migrationId,
        formId,
        fromVersion,
        toVersion,
        practitionerId,
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date().toISOString()
      })

      return {
        success: false,
        migratedRecords: 0,
        failedRecords: 0,
        errors: [{ recordId: 'system', error: error instanceof Error ? error.message : 'Migration failed' }],
        warnings: [],
        summary: {
          totalProcessed: 0,
          successRate: 0,
          processingTime: 0,
          dataIntegrityChecks: { passed: 0, failed: 0, warnings: 0 }
        }
      }
    }
  }

  /**
   * Generate migration rules by comparing schemas
   */
  static async generateMigrationRules(context: MigrationContext): Promise<MigrationRule[]> {
    const rules: MigrationRule[] = []
    
    // Analyze schema differences
    const differences = this.analyzeSchemaChanges(context.fromSchema, context.toSchema)
    
    // Generate rules for each type of change
    for (const diff of differences) {
      switch (diff.type) {
        case 'field_added':
          rules.push(this.createFieldAddedRule(diff))
          break
        case 'field_removed':
          rules.push(this.createFieldRemovedRule(diff))
          break
        case 'field_renamed':
          rules.push(this.createFieldRenamedRule(diff))
          break
        case 'field_type_changed':
          rules.push(this.createFieldTypeChangedRule(diff))
          break
        case 'field_options_changed':
          rules.push(this.createFieldOptionsChangedRule(diff))
          break
        case 'section_restructured':
          rules.push(this.createSectionRestructuredRule(diff))
          break
      }
    }

    return rules
  }

  /**
   * Validate migration before execution
   */
  static async validateMigration(
    context: MigrationContext,
    migrationRules: MigrationRule[]
  ): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
    recommendations: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Check for data loss scenarios
    const removedFields = migrationRules.filter(rule => 
      rule.rules.some(r => r.transformation === 'default' && !r.target)
    )
    
    if (removedFields.length > 0) {
      warnings.push(`${removedFields.length} fields will be removed during migration`)
      recommendations.push('Consider creating a backup before proceeding')
    }

    // Check for type conversion issues
    const typeChanges = migrationRules.filter(rule => rule.type === 'data_transformation')
    if (typeChanges.length > 0) {
      warnings.push('Data type conversions detected - some data may be lost or transformed')
    }

    // Validate migration rules consistency
    for (const rule of migrationRules) {
      const validation = this.validateMigrationRule(rule, context)
      errors.push(...validation.errors)
      warnings.push(...validation.warnings)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Rollback migration to previous version
   */
  static async rollbackMigration(
    formId: string,
    migrationId: string,
    backupFile: string,
    practitionerId: string
  ): Promise<{
    success: boolean
    restoredRecords: number
    errors: string[]
  }> {
    try {
      // Load backup data
      const backupData = await this.loadBackup(backupFile)
      
      // Restore form responses
      const restored = await this.restoreFormResponses(formId, backupData)
      
      // Log rollback
      await FormResponseAudit.logMigrationRollback({
        migrationId,
        formId,
        practitionerId,
        backupFile,
        restoredRecords: restored.count,
        rolledBackAt: new Date().toISOString()
      })

      return {
        success: true,
        restoredRecords: restored.count,
        errors: []
      }
    } catch (error) {
      console.error('Rollback failed:', error)
      return {
        success: false,
        restoredRecords: 0,
        errors: [error instanceof Error ? error.message : 'Rollback failed']
      }
    }
  }

  // Private helper methods

  private static async getFormSchema(formId: string, version: string): Promise<any> {
    const response = await fetch(`/api/forms/${formId}/versions/${version}/schema`)
    if (!response.ok) {
      throw new Error(`Failed to get schema for version ${version}`)
    }
    return await response.json()
  }

  private static async getFormResponses(formId: string, version: string): Promise<any[]> {
    const response = await fetch(`/api/forms/${formId}/responses?version=${version}`)
    if (!response.ok) {
      throw new Error('Failed to get form responses')
    }
    return await response.json()
  }

  private static analyzeSchemaChanges(fromSchema: any, toSchema: any): Array<any> {
    const changes: Array<any> = []
    
    // Compare sections and fields
    const fromFields = this.extractAllFields(fromSchema)
    const toFields = this.extractAllFields(toSchema)
    
    // Find added fields
    toFields.forEach(toField => {
      if (!fromFields.find(f => f.id === toField.id)) {
        changes.push({
          type: 'field_added',
          field: toField,
          impact: 'low'
        })
      }
    })
    
    // Find removed fields
    fromFields.forEach(fromField => {
      if (!toFields.find(f => f.id === fromField.id)) {
        changes.push({
          type: 'field_removed',
          field: fromField,
          impact: 'high'
        })
      }
    })
    
    // Find modified fields
    fromFields.forEach(fromField => {
      const toField = toFields.find(f => f.id === fromField.id)
      if (toField) {
        if (fromField.type !== toField.type) {
          changes.push({
            type: 'field_type_changed',
            fromField,
            toField,
            impact: 'high'
          })
        }
        
        if (JSON.stringify(fromField.options) !== JSON.stringify(toField.options)) {
          changes.push({
            type: 'field_options_changed',
            fromField,
            toField,
            impact: 'medium'
          })
        }
      }
    })
    
    return changes
  }

  private static extractAllFields(schema: any): any[] {
    const fields: any[] = []
    
    if (schema.sections) {
      schema.sections.forEach((section: any) => {
        if (section.fields) {
          fields.push(...section.fields)
        }
      })
    }
    
    return fields
  }

  private static createFieldAddedRule(diff: any): MigrationRule {
    return {
      id: crypto.randomUUID(),
      name: `Add field ${diff.field.id}`,
      description: `Add new field "${diff.field.label}" with default value`,
      fromVersion: '',
      toVersion: '',
      type: 'field_mapping',
      rules: [{
        source: '',
        target: diff.field.id,
        transformation: 'default',
        transformationConfig: { defaultValue: this.getDefaultValueForField(diff.field) },
        required: false
      }],
      validationRules: []
    }
  }

  private static createFieldRemovedRule(diff: any): MigrationRule {
    return {
      id: crypto.randomUUID(),
      name: `Remove field ${diff.field.id}`,
      description: `Remove field "${diff.field.label}" and preserve data in backup`,
      fromVersion: '',
      toVersion: '',
      type: 'field_mapping',
      rules: [{
        source: diff.field.id,
        target: '',
        transformation: 'copy',
        required: false
      }],
      rollbackRules: [{
        source: diff.field.id,
        target: diff.field.id,
        transformation: 'copy'
      }],
      validationRules: []
    }
  }

  private static createFieldRenamedRule(diff: any): MigrationRule {
    return {
      id: crypto.randomUUID(),
      name: `Rename field ${diff.fromField.id}`,
      description: `Rename field from "${diff.fromField.label}" to "${diff.toField.label}"`,
      fromVersion: '',
      toVersion: '',
      type: 'field_mapping',
      rules: [{
        source: diff.fromField.id,
        target: diff.toField.id,
        transformation: 'copy',
        required: true
      }],
      validationRules: []
    }
  }

  private static createFieldTypeChangedRule(diff: any): MigrationRule {
    return {
      id: crypto.randomUUID(),
      name: `Convert field type ${diff.fromField.id}`,
      description: `Convert field "${diff.fromField.label}" from ${diff.fromField.type} to ${diff.toField.type}`,
      fromVersion: '',
      toVersion: '',
      type: 'data_transformation',
      rules: [{
        source: diff.fromField.id,
        target: diff.toField.id,
        transformation: 'convert',
        transformationConfig: {
          fromType: diff.fromField.type,
          toType: diff.toField.type,
          converter: this.getTypeConverter(diff.fromField.type, diff.toField.type)
        },
        required: true
      }],
      validationRules: [{
        field: diff.toField.id,
        rule: `validate_${diff.toField.type}`,
        errorMessage: `Invalid ${diff.toField.type} value`
      }]
    }
  }

  private static createFieldOptionsChangedRule(diff: any): MigrationRule {
    return {
      id: crypto.randomUUID(),
      name: `Update options for ${diff.fromField.id}`,
      description: `Update options for field "${diff.fromField.label}"`,
      fromVersion: '',
      toVersion: '',
      type: 'validation_update',
      rules: [{
        source: diff.fromField.id,
        target: diff.toField.id,
        transformation: 'copy',
        transformationConfig: {
          validateOptions: true,
          newOptions: diff.toField.options,
          fallbackValue: diff.toField.options[0]?.value
        },
        required: true
      }],
      validationRules: [{
        field: diff.toField.id,
        rule: 'validate_options',
        errorMessage: 'Invalid option selected'
      }]
    }
  }

  private static createSectionRestructuredRule(diff: any): MigrationRule {
    return {
      id: crypto.randomUUID(),
      name: 'Restructure sections',
      description: 'Reorganize form sections',
      fromVersion: '',
      toVersion: '',
      type: 'structure_change',
      rules: [],
      validationRules: []
    }
  }

  private static getDefaultValueForField(field: any): any {
    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'email':
        return ''
      case 'number':
        return 0
      case 'checkbox':
        return false
      case 'select':
      case 'radio':
        return field.options?.[0]?.value || ''
      case 'date':
        return null
      default:
        return null
    }
  }

  private static getTypeConverter(fromType: string, toType: string): string {
    const converterMap: Record<string, Record<string, string>> = {
      'text': {
        'number': 'parseFloat',
        'date': 'parseDate',
        'email': 'validateEmail'
      },
      'number': {
        'text': 'toString',
        'date': 'timestampToDate'
      },
      'date': {
        'text': 'dateToString',
        'number': 'dateToTimestamp'
      }
    }
    
    return converterMap[fromType]?.[toType] || 'identity'
  }

  private static validateMigrationRule(rule: MigrationRule, context: MigrationContext): {
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate rule structure
    if (!rule.rules || rule.rules.length === 0) {
      errors.push(`Migration rule "${rule.name}" has no transformation rules`)
    }

    // Validate source fields exist in from schema
    rule.rules.forEach(r => {
      if (r.source && !this.fieldExistsInSchema(context.fromSchema, r.source)) {
        errors.push(`Source field "${r.source}" not found in from schema`)
      }
    })

    // Validate target fields exist in to schema
    rule.rules.forEach(r => {
      if (r.target && !this.fieldExistsInSchema(context.toSchema, r.target)) {
        errors.push(`Target field "${r.target}" not found in to schema`)
      }
    })

    return { errors, warnings }
  }

  private static fieldExistsInSchema(schema: any, fieldId: string): boolean {
    if (!schema.sections) return false
    
    return schema.sections.some((section: any) => 
      section.fields?.some((field: any) => field.id === fieldId)
    )
  }

  private static async processMigrationBatches(
    context: MigrationContext,
    migrationRules: MigrationRule[],
    responses: any[]
  ): Promise<MigrationResult> {
    const startTime = Date.now()
    let migratedRecords = 0
    let failedRecords = 0
    const errors: Array<{ recordId: string; error: string; field?: string }> = []
    const warnings: Array<{ recordId: string; warning: string; field?: string }> = []

    // Process in batches
    const batchSize = context.options.batchSize
    for (let i = 0; i < responses.length; i += batchSize) {
      const batch = responses.slice(i, i + batchSize)
      
      for (const response of batch) {
        try {
          const migratedResponse = await this.migrateResponse(response, migrationRules, context)
          
          // Save migrated response
          await this.saveResponse(migratedResponse, context)
          migratedRecords++
          
          // Validate data integrity
          if (context.options.validateIntegrity) {
            const validation = await this.validateResponseIntegrity(migratedResponse, context.toSchema)
            if (!validation.valid) {
              warnings.push({
                recordId: response.id,
                warning: `Data integrity issues: ${validation.issues.join(', ')}`
              })
            }
          }
        } catch (error) {
          failedRecords++
          errors.push({
            recordId: response.id,
            error: error instanceof Error ? error.message : 'Migration failed'
          })
          
          // Check if we've exceeded maximum allowed errors
          if (errors.length >= context.options.maxErrors) {
            throw new Error(`Migration stopped: exceeded maximum allowed errors (${context.options.maxErrors})`)
          }
        }
      }
    }

    const processingTime = Date.now() - startTime

    return {
      success: errors.length === 0 || (errors.length < context.options.maxErrors),
      migratedRecords,
      failedRecords,
      errors,
      warnings,
      summary: {
        totalProcessed: responses.length,
        successRate: (migratedRecords / responses.length) * 100,
        processingTime,
        dataIntegrityChecks: {
          passed: migratedRecords - warnings.length,
          failed: 0,
          warnings: warnings.length
        }
      }
    }
  }

  private static async migrateResponse(
    response: any,
    migrationRules: MigrationRule[],
    context: MigrationContext
  ): Promise<any> {
    const migratedResponse = {
      ...response,
      version: context.toVersion,
      responses: {}
    }

    // Apply migration rules
    for (const rule of migrationRules) {
      for (const ruleItem of rule.rules) {
        try {
          const value = this.applyTransformation(
            response.responses[ruleItem.source],
            ruleItem,
            response.responses
          )
          
          if (ruleItem.target) {
            migratedResponse.responses[ruleItem.target] = value
          }
        } catch (error) {
          throw new Error(`Failed to apply rule "${rule.name}": ${error}`)
        }
      }
    }

    return migratedResponse
  }

  private static applyTransformation(value: any, rule: any, allResponses: any): any {
    switch (rule.transformation) {
      case 'copy':
        return value
      
      case 'default':
        return rule.transformationConfig?.defaultValue || null
      
      case 'convert':
        return this.convertValue(value, rule.transformationConfig)
      
      case 'split':
        return this.splitValue(value, rule.transformationConfig)
      
      case 'merge':
        return this.mergeValues(allResponses, rule.transformationConfig)
      
      case 'calculate':
        return this.calculateValue(allResponses, rule.transformationConfig)
      
      default:
        return value
    }
  }

  private static convertValue(value: any, config: any): any {
    if (value == null) return null
    
    switch (config.converter) {
      case 'parseFloat':
        const num = parseFloat(value)
        return isNaN(num) ? 0 : num
      
      case 'toString':
        return String(value)
      
      case 'parseDate':
        return new Date(value).toISOString()
      
      case 'dateToTimestamp':
        return new Date(value).getTime()
      
      default:
        return value
    }
  }

  private static splitValue(value: string, config: any): any {
    if (!value) return config.defaultValue || ''
    
    const parts = value.split(config.delimiter || ' ')
    return parts[config.index || 0] || config.defaultValue || ''
  }

  private static mergeValues(responses: any, config: any): any {
    const values = config.sourceFields.map((field: string) => responses[field]).filter(Boolean)
    return values.join(config.delimiter || ' ')
  }

  private static calculateValue(responses: any, config: any): any {
    // Simple calculator for common operations
    switch (config.operation) {
      case 'sum':
        return config.fields.reduce((sum: number, field: string) => 
          sum + (parseFloat(responses[field]) || 0), 0)
      
      case 'average':
        const vals = config.fields.map((field: string) => parseFloat(responses[field]) || 0)
        return vals.reduce((sum, val) => sum + val, 0) / vals.length
      
      default:
        return 0
    }
  }

  private static async saveResponse(response: any, context: MigrationContext): Promise<void> {
    // Save migrated response
    await fetch('/api/form-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    })
  }

  private static async validateResponseIntegrity(response: any, schema: any): Promise<{
    valid: boolean
    issues: string[]
  }> {
    const issues: string[] = []
    
    // Validate all required fields are present
    const requiredFields = this.getRequiredFields(schema)
    requiredFields.forEach(fieldId => {
      if (!response.responses[fieldId]) {
        issues.push(`Missing required field: ${fieldId}`)
      }
    })
    
    return {
      valid: issues.length === 0,
      issues
    }
  }

  private static getRequiredFields(schema: any): string[] {
    const requiredFields: string[] = []
    
    if (schema.sections) {
      schema.sections.forEach((section: any) => {
        if (section.fields) {
          section.fields.forEach((field: any) => {
            if (field.required) {
              requiredFields.push(field.id)
            }
          })
        }
      })
    }
    
    return requiredFields
  }

  private static async createBackup(formId: string, version: string): Promise<string> {
    const backupId = `backup_${formId}_${version}_${Date.now()}`
    
    // Create backup file
    const responses = await this.getFormResponses(formId, version)
    const backupData = {
      formId,
      version,
      responses,
      createdAt: new Date().toISOString()
    }
    
    // Save backup
    await fetch('/api/form-backups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: backupId, data: backupData })
    })
    
    return backupId
  }

  private static async loadBackup(backupFile: string): Promise<any> {
    const response = await fetch(`/api/form-backups/${backupFile}`)
    if (!response.ok) {
      throw new Error('Failed to load backup file')
    }
    return await response.json()
  }

  private static async restoreFormResponses(formId: string, backupData: any): Promise<{ count: number }> {
    // Restore responses from backup
    for (const response of backupData.responses) {
      await this.saveResponse(response, { formId } as any)
    }
    
    return { count: backupData.responses.length }
  }

  private static generateRollbackInstructions(context: MigrationContext, backupFile?: string): string[] {
    const instructions = [
      '1. Stop all form submissions temporarily',
      '2. Verify backup file integrity',
      '3. Execute rollback migration'
    ]
    
    if (backupFile) {
      instructions.push(`4. Restore from backup file: ${backupFile}`)
    }
    
    instructions.push(
      '5. Validate restored data',
      '6. Resume form submissions',
      '7. Notify users of rollback completion'
    )
    
    return instructions
  }
}

// Zod schemas for validation
export const MigrationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  fromVersion: z.string(),
  toVersion: z.string(),
  type: z.enum(['field_mapping', 'data_transformation', 'validation_update', 'structure_change']),
  rules: z.array(z.object({
    source: z.string(),
    target: z.string(),
    transformation: z.enum(['copy', 'convert', 'split', 'merge', 'calculate', 'default']).optional(),
    transformationConfig: z.any().optional(),
    condition: z.string().optional(),
    required: z.boolean()
  })),
  validationRules: z.array(z.object({
    field: z.string(),
    rule: z.string(),
    errorMessage: z.string()
  }))
})