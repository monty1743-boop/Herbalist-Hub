"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Plus, 
  X, 
  Copy, 
  Play, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  Settings,
  Trash2,
  Eye
} from "lucide-react"
import { ConditionalRule, ConditionalLogic, ConditionalOperator, FormBranch } from "@/lib/forms/conditional-logic"
import { LogicValidator, LogicTestCase } from "@/lib/forms/logic-validator"
import { FormField } from "./FormRenderer"
import { cn } from "@/lib/utils"

interface LogicEditorProps {
  field: FormField
  formFields: FormField[]
  logic: ConditionalLogic
  onChange: (logic: ConditionalLogic) => void
  onTest?: (testCases: LogicTestCase[]) => void
  className?: string
}

interface RuleEditorProps {
  rule: ConditionalRule
  formFields: FormField[]
  onChange: (rule: ConditionalRule) => void
  onDelete: () => void
}

interface BranchEditorProps {
  branches: FormBranch[]
  formFields: FormField[]
  formSections: any[]
  onChange: (branches: FormBranch[]) => void
}

const OPERATOR_LABELS = {
  [ConditionalOperator.EQUALS]: "equals",
  [ConditionalOperator.NOT_EQUALS]: "does not equal",
  [ConditionalOperator.GREATER_THAN]: "is greater than",
  [ConditionalOperator.LESS_THAN]: "is less than",
  [ConditionalOperator.GREATER_THAN_OR_EQUAL]: "is greater than or equal to",
  [ConditionalOperator.LESS_THAN_OR_EQUAL]: "is less than or equal to",
  [ConditionalOperator.CONTAINS]: "contains",
  [ConditionalOperator.NOT_CONTAINS]: "does not contain",
  [ConditionalOperator.STARTS_WITH]: "starts with",
  [ConditionalOperator.ENDS_WITH]: "ends with",
  [ConditionalOperator.IS_EMPTY]: "is empty",
  [ConditionalOperator.IS_NOT_EMPTY]: "is not empty",
  [ConditionalOperator.IN_LIST]: "is in list",
  [ConditionalOperator.NOT_IN_LIST]: "is not in list",
  [ConditionalOperator.BETWEEN]: "is between",
  [ConditionalOperator.DATE_BEFORE]: "is before",
  [ConditionalOperator.DATE_AFTER]: "is after",
  [ConditionalOperator.AGE_GREATER_THAN]: "age is greater than",
  [ConditionalOperator.AGE_LESS_THAN]: "age is less than"
}

export function LogicEditor({ 
  field, 
  formFields, 
  logic, 
  onChange, 
  onTest, 
  className 
}: LogicEditorProps) {
  const [validator] = useState(() => new LogicValidator(formFields))
  const [validationResult, setValidationResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("conditions")

  const updateLogic = useCallback((updates: Partial<ConditionalLogic>) => {
    const newLogic = { ...logic, ...updates }
    onChange(newLogic)
    
    // Validate logic
    const result = validator.validateFieldLogic(newLogic, field.id)
    setValidationResult(result)
  }, [logic, onChange, validator, field.id])

  const addRule = useCallback((type: 'showIf' | 'hideIf' | 'requiredIf' | 'disabledIf') => {
    const newRule: ConditionalRule = {
      id: `rule_${Date.now()}`,
      fieldId: '',
      operator: ConditionalOperator.EQUALS,
      value: '',
      valueType: 'static'
    }

    const currentRules = logic[type] || []
    updateLogic({
      [type]: [...currentRules, newRule]
    })
  }, [logic, updateLogic])

  const updateRule = useCallback((
    type: 'showIf' | 'hideIf' | 'requiredIf' | 'disabledIf', 
    index: number, 
    updatedRule: ConditionalRule
  ) => {
    const currentRules = logic[type] || []
    const newRules = [...currentRules]
    newRules[index] = updatedRule

    updateLogic({
      [type]: newRules
    })
  }, [logic, updateLogic])

  const deleteRule = useCallback((
    type: 'showIf' | 'hideIf' | 'requiredIf' | 'disabledIf', 
    index: number
  ) => {
    const currentRules = logic[type] || []
    const newRules = currentRules.filter((_, i) => i !== index)

    updateLogic({
      [type]: newRules.length > 0 ? newRules : undefined
    })
  }, [logic, updateLogic])

  const generateTestCases = useCallback(() => {
    const testCases: LogicTestCase[] = [
      {
        name: "Basic visibility test",
        description: "Test field visibility with standard inputs",
        inputValues: {},
        expectedResults: {
          visibleFields: [field.id],
          requiredFields: [],
          disabledFields: []
        }
      }
    ]

    if (onTest) {
      onTest(testCases)
    }
  }, [field.id, onTest])

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Conditional Logic: {field.label}
          </CardTitle>
          <div className="flex items-center gap-2">
            {validationResult && (
              <Badge variant={validationResult.valid ? "default" : "destructive"}>
                {validationResult.valid ? "Valid" : "Invalid"}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={generateTestCases}>
              <Play className="h-4 w-4 mr-1" />
              Test
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="conditions" className="space-y-6">
            <ConditionalRulesSection
              title="Show Field When"
              description="Field will be visible when these conditions are met"
              rules={logic.showIf || []}
              formFields={formFields}
              onAddRule={() => addRule('showIf')}
              onUpdateRule={(index, rule) => updateRule('showIf', index, rule)}
              onDeleteRule={(index) => deleteRule('showIf', index)}
              operator={logic.operator}
              onOperatorChange={(operator) => updateLogic({ operator })}
            />

            <ConditionalRulesSection
              title="Hide Field When"
              description="Field will be hidden when these conditions are met"
              rules={logic.hideIf || []}
              formFields={formFields}
              onAddRule={() => addRule('hideIf')}
              onUpdateRule={(index, rule) => updateRule('hideIf', index, rule)}
              onDeleteRule={(index) => deleteRule('hideIf', index)}
              operator={logic.operator}
              onOperatorChange={(operator) => updateLogic({ operator })}
            />

            <ConditionalRulesSection
              title="Required When"
              description="Field will be required when these conditions are met"
              rules={logic.requiredIf || []}
              formFields={formFields}
              onAddRule={() => addRule('requiredIf')}
              onUpdateRule={(index, rule) => updateRule('requiredIf', index, rule)}
              onDeleteRule={(index) => deleteRule('requiredIf', index)}
              operator={logic.operator}
              onOperatorChange={(operator) => updateLogic({ operator })}
            />

            <ConditionalRulesSection
              title="Disabled When"
              description="Field will be disabled when these conditions are met"
              rules={logic.disabledIf || []}
              formFields={formFields}
              onAddRule={() => addRule('disabledIf')}
              onUpdateRule={(index, rule) => updateRule('disabledIf', index, rule)}
              onDeleteRule={(index) => deleteRule('disabledIf', index)}
              operator={logic.operator}
              onOperatorChange={(operator) => updateLogic({ operator })}
            />
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <ValidationResults 
              validationResult={validationResult}
              field={field}
              logic={logic}
            />
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <LogicPreview 
              logic={logic}
              formFields={formFields}
            />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <AdvancedSettings
              logic={logic}
              onChange={updateLogic}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

interface ConditionalRulesSectionProps {
  title: string
  description: string
  rules: ConditionalRule[]
  formFields: FormField[]
  onAddRule: () => void
  onUpdateRule: (index: number, rule: ConditionalRule) => void
  onDeleteRule: (index: number) => void
  operator?: 'AND' | 'OR'
  onOperatorChange: (operator: 'AND' | 'OR') => void
}

function ConditionalRulesSection({
  title,
  description,
  rules,
  formFields,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  operator = 'AND',
  onOperatorChange
}: ConditionalRulesSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onAddRule}>
          <Plus className="h-4 w-4 mr-1" />
          Add Rule
        </Button>
      </div>

      {rules.length > 0 && (
        <div className="space-y-3">
          {rules.length > 1 && (
            <div className="flex items-center gap-2">
              <Label className="text-sm">Combine rules with:</Label>
              <Select value={operator} onValueChange={onOperatorChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {rules.map((rule, index) => (
            <div key={rule.id} className="relative">
              {index > 0 && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {operator}
                  </Badge>
                </div>
              )}
              <RuleEditor
                rule={rule}
                formFields={formFields}
                onChange={(updatedRule) => onUpdateRule(index, updatedRule)}
                onDelete={() => onDeleteRule(index)}
              />
            </div>
          ))}
        </div>
      )}

      {rules.length === 0 && (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-sm">No conditions set</p>
          <p className="text-xs">Click "Add Rule" to create your first condition</p>
        </div>
      )}
    </div>
  )
}

function RuleEditor({ rule, formFields, onChange, onDelete }: RuleEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const updateRule = useCallback((updates: Partial<ConditionalRule>) => {
    onChange({ ...rule, ...updates })
  }, [rule, onChange])

  const getFieldType = useCallback((fieldId: string) => {
    const field = formFields.find(f => f.id === fieldId)
    return field?.type || 'text'
  }, [formFields])

  const getOperatorsForField = useCallback((fieldType: string) => {
    const baseOperators = [
      ConditionalOperator.EQUALS,
      ConditionalOperator.NOT_EQUALS,
      ConditionalOperator.IS_EMPTY,
      ConditionalOperator.IS_NOT_EMPTY
    ]

    const textOperators = [
      ConditionalOperator.CONTAINS,
      ConditionalOperator.NOT_CONTAINS,
      ConditionalOperator.STARTS_WITH,
      ConditionalOperator.ENDS_WITH
    ]

    const numberOperators = [
      ConditionalOperator.GREATER_THAN,
      ConditionalOperator.LESS_THAN,
      ConditionalOperator.GREATER_THAN_OR_EQUAL,
      ConditionalOperator.LESS_THAN_OR_EQUAL,
      ConditionalOperator.BETWEEN
    ]

    const listOperators = [
      ConditionalOperator.IN_LIST,
      ConditionalOperator.NOT_IN_LIST
    ]

    const dateOperators = [
      ConditionalOperator.DATE_BEFORE,
      ConditionalOperator.DATE_AFTER,
      ConditionalOperator.DATE_EQUALS
    ]

    switch (fieldType) {
      case 'text':
      case 'textarea':
      case 'email':
        return [...baseOperators, ...textOperators]
      
      case 'number':
        return [...baseOperators, ...numberOperators]
      
      case 'date':
      case 'datetime':
        return [...baseOperators, ...dateOperators]
      
      case 'birthdate':
        return [...baseOperators, ...dateOperators, ConditionalOperator.AGE_GREATER_THAN, ConditionalOperator.AGE_LESS_THAN]
      
      case 'select':
      case 'radio':
        return [...baseOperators, ...listOperators]
      
      case 'checkbox':
        return [...baseOperators, ...listOperators]
      
      default:
        return baseOperators
    }
  }, [])

  const renderValueInput = useCallback(() => {
    const fieldType = getFieldType(rule.fieldId)
    const needsValue = ![
      ConditionalOperator.IS_EMPTY,
      ConditionalOperator.IS_NOT_EMPTY
    ].includes(rule.operator)

    if (!needsValue) return null

    if (rule.valueType === 'field') {
      return (
        <Select 
          value={rule.targetFieldId || ''} 
          onValueChange={(value) => updateRule({ targetFieldId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select field..." />
          </SelectTrigger>
          <SelectContent>
            {formFields
              .filter(f => f.id !== rule.fieldId)
              .map(field => (
                <SelectItem key={field.id} value={field.id}>
                  {field.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )
    }

    if (rule.operator === ConditionalOperator.BETWEEN) {
      const values = Array.isArray(rule.value) ? rule.value : ['', '']
      return (
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Min"
            value={values[0] || ''}
            onChange={(e) => updateRule({ value: [e.target.value, values[1]] })}
          />
          <span className="text-gray-500">and</span>
          <Input
            placeholder="Max"
            value={values[1] || ''}
            onChange={(e) => updateRule({ value: [values[0], e.target.value] })}
          />
        </div>
      )
    }

    if ([ConditionalOperator.IN_LIST, ConditionalOperator.NOT_IN_LIST].includes(rule.operator)) {
      const listValue = Array.isArray(rule.value) ? rule.value.join(', ') : ''
      return (
        <Input
          placeholder="comma, separated, values"
          value={listValue}
          onChange={(e) => updateRule({ 
            value: e.target.value.split(',').map(v => v.trim()).filter(v => v) 
          })}
        />
      )
    }

    // Get field options for select/radio fields
    const sourceField = formFields.find(f => f.id === rule.fieldId)
    if (sourceField?.options && [ConditionalOperator.EQUALS, ConditionalOperator.NOT_EQUALS].includes(rule.operator)) {
      return (
        <Select value={rule.value || ''} onValueChange={(value) => updateRule({ value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select value..." />
          </SelectTrigger>
          <SelectContent>
            {sourceField.options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // Default input
    const inputType = fieldType === 'number' ? 'number' : 
                     fieldType === 'date' ? 'date' :
                     fieldType === 'datetime' ? 'datetime-local' : 'text'

    return (
      <Input
        type={inputType}
        placeholder="Enter value..."
        value={rule.value || ''}
        onChange={(e) => updateRule({ value: e.target.value })}
      />
    )
  }, [rule, formFields, getFieldType, updateRule])

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Field Selection */}
            <Select value={rule.fieldId} onValueChange={(value) => updateRule({ fieldId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select field..." />
              </SelectTrigger>
              <SelectContent>
                {formFields.map(field => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator Selection */}
            <Select 
              value={rule.operator} 
              onValueChange={(value) => updateRule({ operator: value as ConditionalOperator })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition..." />
              </SelectTrigger>
              <SelectContent>
                {getOperatorsForField(getFieldType(rule.fieldId)).map(operator => (
                  <SelectItem key={operator} value={operator}>
                    {OPERATOR_LABELS[operator] || operator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value Type Selection */}
            <Select 
              value={rule.valueType || 'static'} 
              onValueChange={(value) => updateRule({ valueType: value as 'static' | 'field' | 'calculated' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static">Static Value</SelectItem>
                <SelectItem value="field">Another Field</SelectItem>
                <SelectItem value="calculated">Calculated</SelectItem>
              </SelectContent>
            </Select>

            {/* Value Input */}
            <div className="flex gap-2">
              {renderValueInput()}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showAdvanced && (
          <div className="pt-3 border-t space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Rule ID</Label>
                <Input
                  value={rule.id}
                  onChange={(e) => updateRule({ id: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Description</Label>
                <Input
                  placeholder="Optional description..."
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Rule Preview */}
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          <strong>Rule:</strong> {rule.fieldId && formFields.find(f => f.id === rule.fieldId)?.label} {OPERATOR_LABELS[rule.operator]} {
            rule.valueType === 'field' 
              ? `[${formFields.find(f => f.id === rule.targetFieldId)?.label || rule.targetFieldId}]`
              : Array.isArray(rule.value) 
                ? rule.value.join(', ')
                : rule.value
          }
        </div>
      </div>
    </Card>
  )
}

interface ValidationResultsProps {
  validationResult: any
  field: FormField
  logic: ConditionalLogic
}

function ValidationResults({ validationResult, field, logic }: ValidationResultsProps) {
  if (!validationResult) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Click "Test" to validate your conditional logic.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {validationResult.valid ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            All conditional logic rules are valid!
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            There are validation errors in your conditional logic.
          </AlertDescription>
        </Alert>
      )}

      {validationResult.errors?.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-red-600">Errors:</h4>
          {validationResult.errors.map((error: any, index: number) => (
            <div key={index} className="p-3 bg-red-50 border border-red-200 rounded text-sm">
              <div className="font-medium">{error.type}</div>
              <div>{error.message}</div>
            </div>
          ))}
        </div>
      )}

      {validationResult.warnings?.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-yellow-600">Warnings:</h4>
          {validationResult.warnings.map((warning: any, index: number) => (
            <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <div className="font-medium">{warning.type}</div>
              <div>{warning.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface LogicPreviewProps {
  logic: ConditionalLogic
  formFields: FormField[]
}

function LogicPreview({ logic, formFields }: LogicPreviewProps) {
  const getFieldLabel = (fieldId: string) => {
    return formFields.find(f => f.id === fieldId)?.label || fieldId
  }

  const formatRule = (rule: ConditionalRule) => {
    const fieldLabel = getFieldLabel(rule.fieldId)
    const operatorLabel = OPERATOR_LABELS[rule.operator] || rule.operator
    const valueLabel = rule.valueType === 'field' 
      ? `[${getFieldLabel(rule.targetFieldId || '')}]`
      : Array.isArray(rule.value) 
        ? rule.value.join(', ')
        : rule.value

    return `${fieldLabel} ${operatorLabel} ${valueLabel}`
  }

  const formatRules = (rules: ConditionalRule[], operator: string) => {
    if (!rules || rules.length === 0) return null

    return rules.map(formatRule).join(` ${operator} `)
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Logic Summary</h3>
      
      <div className="space-y-3 text-sm">
        {logic.showIf && logic.showIf.length > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <strong className="text-green-800">Show when:</strong>
            <div className="mt-1 text-green-700">
              {formatRules(logic.showIf, logic.operator || 'AND')}
            </div>
          </div>
        )}

        {logic.hideIf && logic.hideIf.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <strong className="text-red-800">Hide when:</strong>
            <div className="mt-1 text-red-700">
              {formatRules(logic.hideIf, logic.operator || 'AND')}
            </div>
          </div>
        )}

        {logic.requiredIf && logic.requiredIf.length > 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded">
            <strong className="text-orange-800">Required when:</strong>
            <div className="mt-1 text-orange-700">
              {formatRules(logic.requiredIf, logic.operator || 'AND')}
            </div>
          </div>
        )}

        {logic.disabledIf && logic.disabledIf.length > 0 && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded">
            <strong className="text-gray-800">Disabled when:</strong>
            <div className="mt-1 text-gray-700">
              {formatRules(logic.disabledIf, logic.operator || 'AND')}
            </div>
          </div>
        )}

        {!logic.showIf && !logic.hideIf && !logic.requiredIf && !logic.disabledIf && (
          <div className="text-center py-8 text-gray-500">
            No conditional logic configured
          </div>
        )}
      </div>
    </div>
  )
}

interface AdvancedSettingsProps {
  logic: ConditionalLogic
  onChange: (updates: Partial<ConditionalLogic>) => void
}

function AdvancedSettings({ logic, onChange }: AdvancedSettingsProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Advanced Settings</h3>
      
      <div className="space-y-4">
        <div>
          <Label>Rule Combination Logic</Label>
          <Select 
            value={logic.operator || 'AND'} 
            onValueChange={(value) => onChange({ operator: value as 'AND' | 'OR' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">
                AND - All conditions must be true
              </SelectItem>
              <SelectItem value="OR">
                OR - Any condition can be true
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-600 mt-1">
            Controls how multiple conditions within the same rule type are combined
          </p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">JSON Configuration</h4>
          <pre className="text-xs bg-white p-3 rounded border max-h-64 overflow-y-auto">
            {JSON.stringify(logic, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}