/**
 * Conditional Logic Engine for Dynamic Form Behavior
 * 
 * This module provides sophisticated conditional logic capabilities for form fields,
 * enabling complex branching, validation, and dynamic form behavior based on user responses.
 */

export interface ConditionalRule {
  id: string
  fieldId: string
  operator: ConditionalOperator
  value: any
  valueType?: 'static' | 'field' | 'calculated'
  targetFieldId?: string // For field-to-field comparisons
}

export interface ConditionalLogic {
  showIf?: ConditionalRule[]
  hideIf?: ConditionalRule[]
  requiredIf?: ConditionalRule[]
  disabledIf?: ConditionalRule[]
  operator?: 'AND' | 'OR' // How to combine multiple rules
}

export interface CalculatedField {
  id: string
  formula: string
  dependencies: string[]
  type: 'number' | 'string' | 'boolean' | 'date'
}

export interface FormBranch {
  id: string
  name: string
  conditions: ConditionalRule[]
  operator: 'AND' | 'OR'
  targetSectionId?: string
  targetFieldId?: string
  action: 'show_section' | 'hide_section' | 'jump_to_section' | 'end_form'
}

export enum ConditionalOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  IN_LIST = 'in_list',
  NOT_IN_LIST = 'not_in_list',
  BETWEEN = 'between',
  NOT_BETWEEN = 'not_between',
  REGEX_MATCH = 'regex_match',
  DATE_BEFORE = 'date_before',
  DATE_AFTER = 'date_after',
  DATE_EQUALS = 'date_equals',
  AGE_GREATER_THAN = 'age_greater_than',
  AGE_LESS_THAN = 'age_less_than'
}

export class ConditionalLogicEngine {
  private responses: Record<string, any> = {}
  private calculatedFields: Map<string, CalculatedField> = new Map()
  private formBranches: FormBranch[] = []

  constructor(initialResponses: Record<string, any> = {}) {
    this.responses = { ...initialResponses }
  }

  /**
   * Update form responses and recalculate dependent fields
   */
  updateResponses(newResponses: Record<string, any>): void {
    this.responses = { ...this.responses, ...newResponses }
    this.recalculateFields()
  }

  /**
   * Evaluate a single conditional rule
   */
  evaluateRule(rule: ConditionalRule): boolean {
    const fieldValue = this.getFieldValue(rule.fieldId)
    const compareValue = rule.valueType === 'field' 
      ? this.getFieldValue(rule.targetFieldId || '')
      : rule.value

    switch (rule.operator) {
      case ConditionalOperator.EQUALS:
        return this.compareValues(fieldValue, compareValue, '===')

      case ConditionalOperator.NOT_EQUALS:
        return this.compareValues(fieldValue, compareValue, '!==')

      case ConditionalOperator.GREATER_THAN:
        return this.compareValues(fieldValue, compareValue, '>')

      case ConditionalOperator.LESS_THAN:
        return this.compareValues(fieldValue, compareValue, '<')

      case ConditionalOperator.GREATER_THAN_OR_EQUAL:
        return this.compareValues(fieldValue, compareValue, '>=')

      case ConditionalOperator.LESS_THAN_OR_EQUAL:
        return this.compareValues(fieldValue, compareValue, '<=')

      case ConditionalOperator.CONTAINS:
        return this.stringContains(fieldValue, compareValue)

      case ConditionalOperator.NOT_CONTAINS:
        return !this.stringContains(fieldValue, compareValue)

      case ConditionalOperator.STARTS_WITH:
        return String(fieldValue || '').startsWith(String(compareValue || ''))

      case ConditionalOperator.ENDS_WITH:
        return String(fieldValue || '').endsWith(String(compareValue || ''))

      case ConditionalOperator.IS_EMPTY:
        return this.isEmpty(fieldValue)

      case ConditionalOperator.IS_NOT_EMPTY:
        return !this.isEmpty(fieldValue)

      case ConditionalOperator.IN_LIST:
        return Array.isArray(compareValue) && compareValue.includes(fieldValue)

      case ConditionalOperator.NOT_IN_LIST:
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue)

      case ConditionalOperator.BETWEEN:
        return this.isBetween(fieldValue, compareValue)

      case ConditionalOperator.NOT_BETWEEN:
        return !this.isBetween(fieldValue, compareValue)

      case ConditionalOperator.REGEX_MATCH:
        return this.regexMatch(fieldValue, compareValue)

      case ConditionalOperator.DATE_BEFORE:
        return this.compareDates(fieldValue, compareValue, '<')

      case ConditionalOperator.DATE_AFTER:
        return this.compareDates(fieldValue, compareValue, '>')

      case ConditionalOperator.DATE_EQUALS:
        return this.compareDates(fieldValue, compareValue, '===')

      case ConditionalOperator.AGE_GREATER_THAN:
        return this.compareAge(fieldValue, compareValue, '>')

      case ConditionalOperator.AGE_LESS_THAN:
        return this.compareAge(fieldValue, compareValue, '<')

      default:
        console.warn(`Unknown conditional operator: ${rule.operator}`)
        return false
    }
  }

  /**
   * Evaluate multiple conditional rules with AND/OR logic
   */
  evaluateConditions(conditions: ConditionalRule[], operator: 'AND' | 'OR' = 'AND'): boolean {
    if (!conditions || conditions.length === 0) return true

    const results = conditions.map(condition => this.evaluateRule(condition))

    return operator === 'AND' 
      ? results.every(result => result)
      : results.some(result => result)
  }

  /**
   * Evaluate conditional logic for field visibility
   */
  evaluateFieldLogic(logic: ConditionalLogic): {
    visible: boolean
    required: boolean
    disabled: boolean
  } {
    let visible = true
    let required = false
    let disabled = false

    // Evaluate show conditions
    if (logic.showIf && logic.showIf.length > 0) {
      visible = this.evaluateConditions(logic.showIf, logic.operator)
    }

    // Evaluate hide conditions
    if (logic.hideIf && logic.hideIf.length > 0) {
      const shouldHide = this.evaluateConditions(logic.hideIf, logic.operator)
      visible = visible && !shouldHide
    }

    // Evaluate required conditions
    if (logic.requiredIf && logic.requiredIf.length > 0) {
      required = this.evaluateConditions(logic.requiredIf, logic.operator)
    }

    // Evaluate disabled conditions
    if (logic.disabledIf && logic.disabledIf.length > 0) {
      disabled = this.evaluateConditions(logic.disabledIf, logic.operator)
    }

    return { visible, required, disabled }
  }

  /**
   * Add calculated field
   */
  addCalculatedField(field: CalculatedField): void {
    this.calculatedFields.set(field.id, field)
    this.calculateField(field.id)
  }

  /**
   * Calculate a specific field value
   */
  calculateField(fieldId: string): any {
    const field = this.calculatedFields.get(fieldId)
    if (!field) return null

    try {
      // Simple formula evaluation (in production, use a proper expression parser)
      let formula = field.formula

      // Replace field references with actual values
      field.dependencies.forEach(depFieldId => {
        const value = this.getFieldValue(depFieldId)
        const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0
        formula = formula.replace(new RegExp(`\\b${depFieldId}\\b`, 'g'), numericValue.toString())
      })

      // Evaluate mathematical expressions (basic implementation)
      const result = this.evaluateFormula(formula, field.type)
      this.responses[fieldId] = result
      return result

    } catch (error) {
      console.error(`Error calculating field ${fieldId}:`, error)
      return null
    }
  }

  /**
   * Recalculate all calculated fields
   */
  private recalculateFields(): void {
    // Sort by dependencies to ensure proper calculation order
    const sortedFields = this.topologicalSort()
    sortedFields.forEach(fieldId => this.calculateField(fieldId))
  }

  /**
   * Add form branch logic
   */
  addFormBranch(branch: FormBranch): void {
    this.formBranches.push(branch)
  }

  /**
   * Evaluate form branches and return next actions
   */
  evaluateFormBranches(): FormBranch[] {
    return this.formBranches.filter(branch => 
      this.evaluateConditions(branch.conditions, branch.operator)
    )
  }

  /**
   * Get next section based on branching logic
   */
  getNextSection(currentSectionId: string): string | null {
    const activeBranches = this.evaluateFormBranches()
    
    for (const branch of activeBranches) {
      if (branch.action === 'jump_to_section' && branch.targetSectionId) {
        return branch.targetSectionId
      }
    }

    return null // Continue with normal flow
  }

  /**
   * Check if form should end based on branching logic
   */
  shouldEndForm(): boolean {
    const activeBranches = this.evaluateFormBranches()
    return activeBranches.some(branch => branch.action === 'end_form')
  }

  /**
   * Get all visible sections based on conditional logic
   */
  getVisibleSections(allSections: any[]): any[] {
    const activeBranches = this.evaluateFormBranches()
    const hiddenSections = new Set<string>()
    
    activeBranches.forEach(branch => {
      if (branch.action === 'hide_section' && branch.targetSectionId) {
        hiddenSections.add(branch.targetSectionId)
      }
    })

    return allSections.filter(section => 
      !hiddenSections.has(section.id) && 
      this.evaluateSectionLogic(section)
    )
  }

  /**
   * Evaluate conditional logic for a section
   */
  private evaluateSectionLogic(section: any): boolean {
    if (!section.conditionalLogic?.showIf) return true
    return this.evaluateConditions(section.conditionalLogic.showIf)
  }

  /**
   * Helper methods
   */
  private getFieldValue(fieldId: string): any {
    return this.responses[fieldId]
  }

  private compareValues(value1: any, value2: any, operator: string): boolean {
    // Convert to numbers if both can be numeric
    const num1 = typeof value1 === 'number' ? value1 : parseFloat(value1)
    const num2 = typeof value2 === 'number' ? value2 : parseFloat(value2)

    if (!isNaN(num1) && !isNaN(num2)) {
      switch (operator) {
        case '>': return num1 > num2
        case '<': return num1 < num2
        case '>=': return num1 >= num2
        case '<=': return num1 <= num2
        case '===': return num1 === num2
        case '!==': return num1 !== num2
      }
    }

    // String comparison
    switch (operator) {
      case '===': return value1 === value2
      case '!==': return value1 !== value2
      case '>': return String(value1) > String(value2)
      case '<': return String(value1) < String(value2)
      case '>=': return String(value1) >= String(value2)
      case '<=': return String(value1) <= String(value2)
      default: return false
    }
  }

  private stringContains(value: any, searchValue: any): boolean {
    return String(value || '').toLowerCase().includes(String(searchValue || '').toLowerCase())
  }

  private isEmpty(value: any): boolean {
    return value === null || value === undefined || value === '' || 
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0)
  }

  private isBetween(value: any, range: [any, any]): boolean {
    if (!Array.isArray(range) || range.length !== 2) return false
    const numValue = typeof value === 'number' ? value : parseFloat(value)
    const [min, max] = range.map(v => typeof v === 'number' ? v : parseFloat(v))
    return !isNaN(numValue) && !isNaN(min) && !isNaN(max) && numValue >= min && numValue <= max
  }

  private regexMatch(value: any, pattern: string): boolean {
    try {
      const regex = new RegExp(pattern)
      return regex.test(String(value || ''))
    } catch {
      return false
    }
  }

  private compareDates(date1: any, date2: any, operator: string): boolean {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false

    switch (operator) {
      case '<': return d1 < d2
      case '>': return d1 > d2
      case '===': return d1.getTime() === d2.getTime()
      default: return false
    }
  }

  private compareAge(birthDate: any, compareAge: number, operator: string): boolean {
    const birth = new Date(birthDate)
    if (isNaN(birth.getTime())) return false

    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    switch (operator) {
      case '>': return age > compareAge
      case '<': return age < compareAge
      default: return false
    }
  }

  private evaluateFormula(formula: string, type: string): any {
    // Basic formula evaluation (in production, use a proper math expression parser)
    try {
      // Remove any non-mathematical characters for security
      const cleanFormula = formula.replace(/[^0-9+\-*/.() ]/g, '')
      const result = Function(`"use strict"; return (${cleanFormula})`)()

      switch (type) {
        case 'number': return typeof result === 'number' ? result : 0
        case 'string': return String(result)
        case 'boolean': return Boolean(result)
        default: return result
      }
    } catch {
      return null
    }
  }

  private topologicalSort(): string[] {
    // Simplified topological sort for calculated field dependencies
    const visited = new Set<string>()
    const result: string[] = []

    const visit = (fieldId: string) => {
      if (visited.has(fieldId)) return
      visited.add(fieldId)

      const field = this.calculatedFields.get(fieldId)
      if (field) {
        field.dependencies.forEach(depId => {
          if (this.calculatedFields.has(depId)) {
            visit(depId)
          }
        })
        result.push(fieldId)
      }
    }

    this.calculatedFields.forEach((_, fieldId) => visit(fieldId))
    return result
  }
}

/**
 * Utility functions for conditional logic
 */
export class ConditionalLogicUtils {
  /**
   * Validate conditional rule configuration
   */
  static validateRule(rule: ConditionalRule): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!rule.fieldId) {
      errors.push('Field ID is required')
    }

    if (!rule.operator) {
      errors.push('Operator is required')
    }

    if (rule.operator === ConditionalOperator.BETWEEN || rule.operator === ConditionalOperator.NOT_BETWEEN) {
      if (!Array.isArray(rule.value) || rule.value.length !== 2) {
        errors.push('Between operator requires an array of two values')
      }
    }

    if (rule.valueType === 'field' && !rule.targetFieldId) {
      errors.push('Target field ID is required for field-to-field comparisons')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Optimize conditional logic for performance
   */
  static optimizeLogic(logic: ConditionalLogic): ConditionalLogic {
    // Remove duplicate conditions
    const removeDuplicates = (rules: ConditionalRule[]) => {
      const seen = new Set<string>()
      return rules.filter(rule => {
        const key = `${rule.fieldId}-${rule.operator}-${JSON.stringify(rule.value)}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    return {
      ...logic,
      showIf: logic.showIf ? removeDuplicates(logic.showIf) : undefined,
      hideIf: logic.hideIf ? removeDuplicates(logic.hideIf) : undefined,
      requiredIf: logic.requiredIf ? removeDuplicates(logic.requiredIf) : undefined,
      disabledIf: logic.disabledIf ? removeDuplicates(logic.disabledIf) : undefined
    }
  }

  /**
   * Generate human-readable description of conditional logic
   */
  static describeLogic(logic: ConditionalLogic): string {
    const descriptions: string[] = []

    if (logic.showIf?.length) {
      const conditions = logic.showIf.map(rule => this.describeRule(rule)).join(` ${logic.operator || 'AND'} `)
      descriptions.push(`Show when: ${conditions}`)
    }

    if (logic.hideIf?.length) {
      const conditions = logic.hideIf.map(rule => this.describeRule(rule)).join(` ${logic.operator || 'AND'} `)
      descriptions.push(`Hide when: ${conditions}`)
    }

    if (logic.requiredIf?.length) {
      const conditions = logic.requiredIf.map(rule => this.describeRule(rule)).join(` ${logic.operator || 'AND'} `)
      descriptions.push(`Required when: ${conditions}`)
    }

    return descriptions.join('; ')
  }

  private static describeRule(rule: ConditionalRule): string {
    const operatorDescriptions = {
      [ConditionalOperator.EQUALS]: 'equals',
      [ConditionalOperator.NOT_EQUALS]: 'does not equal',
      [ConditionalOperator.GREATER_THAN]: 'is greater than',
      [ConditionalOperator.LESS_THAN]: 'is less than',
      [ConditionalOperator.CONTAINS]: 'contains',
      [ConditionalOperator.IS_EMPTY]: 'is empty',
      [ConditionalOperator.IS_NOT_EMPTY]: 'is not empty'
    } as Record<string, string>

    const operatorDesc = operatorDescriptions[rule.operator] || rule.operator
    const valueDesc = rule.valueType === 'field' ? `[${rule.targetFieldId}]` : JSON.stringify(rule.value)

    return `${rule.fieldId} ${operatorDesc} ${valueDesc}`
  }
}