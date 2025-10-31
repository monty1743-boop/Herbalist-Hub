/**
 * Logic Validation Utilities
 * 
 * Provides validation, testing, and debugging tools for conditional logic in forms.
 */

import { ConditionalLogic, ConditionalRule, FormBranch, ConditionalLogicEngine, ConditionalOperator } from './conditional-logic'

export interface LogicValidationResult {
  valid: boolean
  errors: LogicValidationError[]
  warnings: LogicValidationWarning[]
}

export interface LogicValidationError {
  type: 'circular_dependency' | 'invalid_field_reference' | 'invalid_operator' | 'invalid_value' | 'syntax_error'
  message: string
  fieldId?: string
  ruleId?: string
  severity: 'error' | 'warning'
}

export interface LogicValidationWarning extends LogicValidationError {
  severity: 'warning'
}

export interface LogicTestCase {
  name: string
  description: string
  inputValues: Record<string, any>
  expectedResults: {
    visibleFields: string[]
    requiredFields: string[]
    disabledFields: string[]
    nextSection?: string
    shouldEndForm?: boolean
  }
}

export interface FormAnalytics {
  totalFields: number
  conditionalFields: number
  complexityScore: number
  averageConditionsPerField: number
  branchingPaths: number
  unreachableFields: string[]
  circularDependencies: string[]
}

export class LogicValidator {
  private formFields: Map<string, any> = new Map()
  private formSections: Map<string, any> = new Map()

  constructor(fields: any[] = [], sections: any[] = []) {
    fields.forEach(field => this.formFields.set(field.id, field))
    sections.forEach(section => this.formSections.set(section.id, section))
  }

  /**
   * Validate all conditional logic in a form
   */
  validateForm(formData: any): LogicValidationResult {
    const errors: LogicValidationError[] = []
    const warnings: LogicValidationWarning[] = []

    // Validate individual field logic
    formData.fields?.sections?.forEach((section: any) => {
      section.fields?.forEach((field: any) => {
        if (field.conditionalLogic) {
          const fieldResult = this.validateFieldLogic(field.conditionalLogic, field.id)
          errors.push(...fieldResult.errors)
          warnings.push(...fieldResult.warnings)
        }
      })

      // Validate section logic
      if (section.conditionalLogic) {
        const sectionResult = this.validateSectionLogic(section.conditionalLogic, section.id)
        errors.push(...sectionResult.errors)
        warnings.push(...sectionResult.warnings)
      }
    })

    // Validate form branches
    if (formData.formBranches) {
      const branchResult = this.validateFormBranches(formData.formBranches)
      errors.push(...branchResult.errors)
      warnings.push(...branchResult.warnings)
    }

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(formData)
    circularDeps.forEach(fieldId => {
      errors.push({
        type: 'circular_dependency',
        message: `Circular dependency detected for field: ${fieldId}`,
        fieldId,
        severity: 'error'
      })
    })

    // Check for unreachable fields
    const unreachableFields = this.findUnreachableFields(formData)
    unreachableFields.forEach(fieldId => {
      warnings.push({
        type: 'invalid_field_reference',
        message: `Field may be unreachable due to conditional logic: ${fieldId}`,
        fieldId,
        severity: 'warning'
      })
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate conditional logic for a specific field
   */
  validateFieldLogic(logic: ConditionalLogic, fieldId: string): LogicValidationResult {
    const errors: LogicValidationError[] = []
    const warnings: LogicValidationWarning[] = []

    // Validate show conditions
    if (logic.showIf) {
      const result = this.validateRules(logic.showIf, fieldId)
      errors.push(...result.errors)
      warnings.push(...result.warnings)
    }

    // Validate hide conditions
    if (logic.hideIf) {
      const result = this.validateRules(logic.hideIf, fieldId)
      errors.push(...result.errors)
      warnings.push(...result.warnings)
    }

    // Validate required conditions
    if (logic.requiredIf) {
      const result = this.validateRules(logic.requiredIf, fieldId)
      errors.push(...result.errors)
      warnings.push(...result.warnings)
    }

    // Validate disabled conditions
    if (logic.disabledIf) {
      const result = this.validateRules(logic.disabledIf, fieldId)
      errors.push(...result.errors)
      warnings.push(...result.warnings)
    }

    // Check for conflicting conditions
    if (logic.showIf && logic.hideIf) {
      warnings.push({
        type: 'syntax_error',
        message: `Field ${fieldId} has both show and hide conditions - this may cause unexpected behavior`,
        fieldId,
        severity: 'warning'
      })
    }

    return { valid: errors.length === 0, errors, warnings }
  }

  /**
   * Validate conditional logic for a section
   */
  validateSectionLogic(logic: ConditionalLogic, sectionId: string): LogicValidationResult {
    const errors: LogicValidationError[] = []
    const warnings: LogicValidationWarning[] = []

    if (logic.showIf) {
      const result = this.validateRules(logic.showIf, sectionId)
      errors.push(...result.errors)
      warnings.push(...result.warnings)
    }

    return { valid: errors.length === 0, errors, warnings }
  }

  /**
   * Validate form branch logic
   */
  validateFormBranches(branches: FormBranch[]): LogicValidationResult {
    const errors: LogicValidationError[] = []
    const warnings: LogicValidationWarning[] = []

    branches.forEach(branch => {
      // Validate branch conditions
      const result = this.validateRules(branch.conditions, branch.id)
      errors.push(...result.errors)
      warnings.push(...result.warnings)

      // Validate branch targets
      if (branch.targetSectionId && !this.formSections.has(branch.targetSectionId)) {
        errors.push({
          type: 'invalid_field_reference',
          message: `Branch references non-existent section: ${branch.targetSectionId}`,
          fieldId: branch.id,
          severity: 'error'
        })
      }

      if (branch.targetFieldId && !this.formFields.has(branch.targetFieldId)) {
        errors.push({
          type: 'invalid_field_reference',
          message: `Branch references non-existent field: ${branch.targetFieldId}`,
          fieldId: branch.id,
          severity: 'error'
        })
      }
    })

    return { valid: errors.length === 0, errors, warnings }
  }

  /**
   * Validate individual conditional rules
   */
  private validateRules(rules: ConditionalRule[], contextId: string): LogicValidationResult {
    const errors: LogicValidationError[] = []
    const warnings: LogicValidationWarning[] = []

    rules.forEach(rule => {
      // Check if referenced field exists
      if (!this.formFields.has(rule.fieldId)) {
        errors.push({
          type: 'invalid_field_reference',
          message: `Rule references non-existent field: ${rule.fieldId}`,
          fieldId: contextId,
          ruleId: rule.id,
          severity: 'error'
        })
      }

      // Check if target field exists (for field-to-field comparisons)
      if (rule.valueType === 'field' && rule.targetFieldId && !this.formFields.has(rule.targetFieldId)) {
        errors.push({
          type: 'invalid_field_reference',
          message: `Rule references non-existent target field: ${rule.targetFieldId}`,
          fieldId: contextId,
          ruleId: rule.id,
          severity: 'error'
        })
      }

      // Validate operator
      if (!Object.values(ConditionalOperator).includes(rule.operator)) {
        errors.push({
          type: 'invalid_operator',
          message: `Invalid operator: ${rule.operator}`,
          fieldId: contextId,
          ruleId: rule.id,
          severity: 'error'
        })
      }

      // Validate value based on operator
      const valueValidation = this.validateRuleValue(rule)
      if (!valueValidation.valid) {
        errors.push({
          type: 'invalid_value',
          message: valueValidation.message,
          fieldId: contextId,
          ruleId: rule.id,
          severity: 'error'
        })
      }

      // Check for self-reference
      if (rule.fieldId === contextId) {
        errors.push({
          type: 'circular_dependency',
          message: `Field cannot reference itself in conditional logic`,
          fieldId: contextId,
          ruleId: rule.id,
          severity: 'error'
        })
      }
    })

    return { valid: errors.length === 0, errors, warnings }
  }

  /**
   * Validate rule value based on operator
   */
  private validateRuleValue(rule: ConditionalRule): { valid: boolean; message: string } {
    switch (rule.operator) {
      case ConditionalOperator.BETWEEN:
      case ConditionalOperator.NOT_BETWEEN:
        if (!Array.isArray(rule.value) || rule.value.length !== 2) {
          return { valid: false, message: 'Between operators require an array of two values' }
        }
        break

      case ConditionalOperator.IN_LIST:
      case ConditionalOperator.NOT_IN_LIST:
        if (!Array.isArray(rule.value)) {
          return { valid: false, message: 'List operators require an array value' }
        }
        break

      case ConditionalOperator.REGEX_MATCH:
        try {
          new RegExp(rule.value)
        } catch {
          return { valid: false, message: 'Invalid regular expression pattern' }
        }
        break

      case ConditionalOperator.DATE_BEFORE:
      case ConditionalOperator.DATE_AFTER:
      case ConditionalOperator.DATE_EQUALS:
        if (rule.valueType !== 'field' && isNaN(new Date(rule.value).getTime())) {
          return { valid: false, message: 'Date operators require a valid date value' }
        }
        break

      case ConditionalOperator.AGE_GREATER_THAN:
      case ConditionalOperator.AGE_LESS_THAN:
        if (typeof rule.value !== 'number' || rule.value < 0) {
          return { valid: false, message: 'Age operators require a positive number' }
        }
        break
    }

    return { valid: true, message: '' }
  }

  /**
   * Detect circular dependencies in conditional logic
   */
  detectCircularDependencies(formData: any): string[] {
    const dependencies = new Map<string, string[]>()
    
    // Build dependency graph
    formData.fields?.sections?.forEach((section: any) => {
      section.fields?.forEach((field: any) => {
        if (field.conditionalLogic) {
          const deps: string[] = []
          
          // Extract field dependencies from all rule types
          const allRules = [
            ...(field.conditionalLogic.showIf || []),
            ...(field.conditionalLogic.hideIf || []),
            ...(field.conditionalLogic.requiredIf || []),
            ...(field.conditionalLogic.disabledIf || [])
          ]
          
          allRules.forEach((rule: ConditionalRule) => {
            deps.push(rule.fieldId)
            if (rule.valueType === 'field' && rule.targetFieldId) {
              deps.push(rule.targetFieldId)
            }
          })
          
          dependencies.set(field.id, deps)
        }
      })
    })

    // Detect cycles using DFS
    const circularDeps: string[] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (fieldId: string): boolean => {
      if (recursionStack.has(fieldId)) {
        circularDeps.push(fieldId)
        return true
      }
      
      if (visited.has(fieldId)) return false
      
      visited.add(fieldId)
      recursionStack.add(fieldId)
      
      const deps = dependencies.get(fieldId) || []
      for (const depId of deps) {
        if (hasCycle(depId)) return true
      }
      
      recursionStack.delete(fieldId)
      return false
    }

    dependencies.forEach((_, fieldId) => {
      if (!visited.has(fieldId)) {
        hasCycle(fieldId)
      }
    })

    return [...new Set(circularDeps)]
  }

  /**
   * Find fields that may be unreachable due to conditional logic
   */
  findUnreachableFields(formData: any): string[] {
    const engine = new ConditionalLogicEngine()
    const allFields: string[] = []
    const conditionalFields = new Set<string>()

    // Collect all fields
    formData.fields?.sections?.forEach((section: any) => {
      section.fields?.forEach((field: any) => {
        allFields.push(field.id)
        if (field.conditionalLogic) {
          conditionalFields.add(field.id)
        }
      })
    })

    // Test various input combinations to find unreachable fields
    const unreachableFields = new Set<string>(conditionalFields)
    const testCases = this.generateTestCases(allFields, 100) // Generate 100 test cases

    testCases.forEach(testCase => {
      engine.updateResponses(testCase)
      
      // Check which conditional fields become visible
      formData.fields?.sections?.forEach((section: any) => {
        section.fields?.forEach((field: any) => {
          if (field.conditionalLogic) {
            const result = engine.evaluateFieldLogic(field.conditionalLogic)
            if (result.visible) {
              unreachableFields.delete(field.id)
            }
          }
        })
      })
    })

    return Array.from(unreachableFields)
  }

  /**
   * Generate test cases for logic validation
   */
  generateTestCases(fieldIds: string[], count: number = 50): Record<string, any>[] {
    const testCases: Record<string, any>[] = []

    for (let i = 0; i < count; i++) {
      const testCase: Record<string, any> = {}
      
      fieldIds.forEach(fieldId => {
        // Generate random values based on field type
        const field = this.formFields.get(fieldId)
        testCase[fieldId] = this.generateRandomValue(field)
      })
      
      testCases.push(testCase)
    }

    return testCases
  }

  /**
   * Generate random value for field testing
   */
  private generateRandomValue(field: any): any {
    if (!field) return null

    switch (field.type) {
      case 'text':
      case 'email':
      case 'textarea':
        return Math.random() > 0.5 ? `test_value_${Math.floor(Math.random() * 100)}` : ''
      
      case 'number':
        return Math.floor(Math.random() * 100)
      
      case 'select':
      case 'radio':
        return field.options?.[Math.floor(Math.random() * field.options.length)]?.value || ''
      
      case 'checkbox':
        const selectedOptions = field.options?.filter(() => Math.random() > 0.5) || []
        return selectedOptions.map((opt: any) => opt.value)
      
      case 'date':
        const randomDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
        return randomDate.toISOString().split('T')[0]
      
      case 'boolean':
        return Math.random() > 0.5
      
      default:
        return Math.random() > 0.5 ? `value_${Math.floor(Math.random() * 10)}` : ''
    }
  }

  /**
   * Run automated tests on conditional logic
   */
  runTests(testCases: LogicTestCase[], formData: any): { passed: number; failed: number; results: any[] } {
    const engine = new ConditionalLogicEngine()
    const results: any[] = []
    let passed = 0
    let failed = 0

    testCases.forEach(testCase => {
      engine.updateResponses(testCase.inputValues)
      
      const actualResults = {
        visibleFields: this.getVisibleFields(formData, engine),
        requiredFields: this.getRequiredFields(formData, engine),
        disabledFields: this.getDisabledFields(formData, engine),
        nextSection: engine.getNextSection('current'),
        shouldEndForm: engine.shouldEndForm()
      }

      const testPassed = this.compareResults(actualResults, testCase.expectedResults)
      
      if (testPassed) {
        passed++
      } else {
        failed++
      }

      results.push({
        testCase: testCase.name,
        passed: testPassed,
        expected: testCase.expectedResults,
        actual: actualResults
      })
    })

    return { passed, failed, results }
  }

  /**
   * Generate form analytics
   */
  analyzeForm(formData: any): FormAnalytics {
    let totalFields = 0
    let conditionalFields = 0
    let totalConditions = 0

    formData.fields?.sections?.forEach((section: any) => {
      section.fields?.forEach((field: any) => {
        totalFields++
        if (field.conditionalLogic) {
          conditionalFields++
          const conditionCount = (field.conditionalLogic.showIf?.length || 0) +
                                (field.conditionalLogic.hideIf?.length || 0) +
                                (field.conditionalLogic.requiredIf?.length || 0) +
                                (field.conditionalLogic.disabledIf?.length || 0)
          totalConditions += conditionCount
        }
      })
    })

    const complexityScore = this.calculateComplexityScore(formData)
    const averageConditionsPerField = conditionalFields > 0 ? totalConditions / conditionalFields : 0
    const branchingPaths = this.countBranchingPaths(formData)
    const unreachableFields = this.findUnreachableFields(formData)
    const circularDependencies = this.detectCircularDependencies(formData)

    return {
      totalFields,
      conditionalFields,
      complexityScore,
      averageConditionsPerField,
      branchingPaths,
      unreachableFields,
      circularDependencies
    }
  }

  /**
   * Calculate form complexity score
   */
  private calculateComplexityScore(formData: any): number {
    let score = 0
    
    formData.fields?.sections?.forEach((section: any) => {
      section.fields?.forEach((field: any) => {
        if (field.conditionalLogic) {
          score += 1 // Base conditional field
          
          // Add complexity for multiple conditions
          const conditionCount = (field.conditionalLogic.showIf?.length || 0) +
                                (field.conditionalLogic.hideIf?.length || 0) +
                                (field.conditionalLogic.requiredIf?.length || 0) +
                                (field.conditionalLogic.disabledIf?.length || 0)
          score += conditionCount * 0.5
          
          // Add complexity for complex operators
          const complexOperators = [
            ConditionalOperator.REGEX_MATCH,
            ConditionalOperator.BETWEEN,
            ConditionalOperator.DATE_BEFORE,
            ConditionalOperator.AGE_GREATER_THAN
          ]
          
          const allRules = [
            ...(field.conditionalLogic.showIf || []),
            ...(field.conditionalLogic.hideIf || []),
            ...(field.conditionalLogic.requiredIf || []),
            ...(field.conditionalLogic.disabledIf || [])
          ]
          
          allRules.forEach((rule: ConditionalRule) => {
            if (complexOperators.includes(rule.operator)) {
              score += 1
            }
          })
        }
      })
    })

    return Math.round(score * 10) / 10
  }

  /**
   * Count branching paths in form
   */
  private countBranchingPaths(formData: any): number {
    const branches = formData.formBranches || []
    return branches.length + (formData.fields?.sections?.length || 0)
  }

  /**
   * Helper methods for test execution
   */
  private getVisibleFields(formData: any, engine: ConditionalLogicEngine): string[] {
    const visibleFields: string[] = []
    
    formData.fields?.sections?.forEach((section: any) => {
      section.fields?.forEach((field: any) => {
        if (field.conditionalLogic) {
          const result = engine.evaluateFieldLogic(field.conditionalLogic)
          if (result.visible) {
            visibleFields.push(field.id)
          }
        } else {
          visibleFields.push(field.id) // Always visible if no conditional logic
        }
      })
    })
    
    return visibleFields
  }

  private getRequiredFields(formData: any, engine: ConditionalLogicEngine): string[] {
    const requiredFields: string[] = []
    
    formData.fields?.sections?.forEach((section: any) => {
      section.fields?.forEach((field: any) => {
        if (field.required || (field.conditionalLogic && engine.evaluateFieldLogic(field.conditionalLogic).required)) {
          requiredFields.push(field.id)
        }
      })
    })
    
    return requiredFields
  }

  private getDisabledFields(formData: any, engine: ConditionalLogicEngine): string[] {
    const disabledFields: string[] = []
    
    formData.fields?.sections?.forEach((section: any) => {
      section.fields?.forEach((field: any) => {
        if (field.conditionalLogic && engine.evaluateFieldLogic(field.conditionalLogic).disabled) {
          disabledFields.push(field.id)
        }
      })
    })
    
    return disabledFields
  }

  private compareResults(actual: any, expected: any): boolean {
    // Simple deep comparison for test results
    return JSON.stringify(actual) === JSON.stringify(expected)
  }
}