'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Save, 
  Eye, 
  Undo, 
  Palette, 
  Settings, 
  FileText, 
  Sparkles,
  Plus,
  Minus,
  Move,
  Edit,
  Lock,
  AlertTriangle,
  CheckCircle,
  Info,
  Download,
  Share
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormTemplateManager, FormTemplate, TemplateCustomization } from '@/lib/forms/template-manager'

interface TemplateCustomizerProps {
  template: FormTemplate
  practitionerId: string
  onSave?: (formId: string) => void
  onCancel?: () => void
  className?: string
}

interface FieldModification {
  action: 'add' | 'remove' | 'modify'
  fieldId: string
  data?: any
}

interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export function TemplateCustomizer({
  template,
  practitionerId,
  onSave,
  onCancel,
  className
}: TemplateCustomizerProps) {
  // State for customization
  const [formName, setFormName] = useState(`${template.name} - Custom`)
  const [formDescription, setFormDescription] = useState('')
  const [fieldModifications, setFieldModifications] = useState<FieldModification[]>([])
  const [stylingChanges, setStylingChanges] = useState<any>({})
  const [settingsChanges, setSettingsChanges] = useState<any>({})
  const [variableValues, setVariableValues] = useState<Record<string, any>>({})
  
  // State for UI
  const [activeTab, setActiveTab] = useState('fields')
  const [previewMode, setPreviewMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Available field types for adding new fields
  const fieldTypes = [
    { value: 'text', label: 'Text Input', icon: FileText },
    { value: 'textarea', label: 'Text Area', icon: FileText },
    { value: 'email', label: 'Email', icon: FileText },
    { value: 'phone', label: 'Phone', icon: FileText },
    { value: 'number', label: 'Number', icon: FileText },
    { value: 'date', label: 'Date', icon: FileText },
    { value: 'select', label: 'Dropdown', icon: FileText },
    { value: 'radio', label: 'Radio Buttons', icon: FileText },
    { value: 'checkbox', label: 'Checkboxes', icon: FileText },
    { value: 'file', label: 'File Upload', icon: FileText }
  ]

  useEffect(() => {
    // Initialize variable values with defaults
    const initialVariables: Record<string, any> = {}
    template.customization.variableFields.forEach(variable => {
      initialVariables[variable.variableName] = variable.defaultValue
    })
    setVariableValues(initialVariables)
  }, [template])

  useEffect(() => {
    // Mark as having unsaved changes when modifications are made
    const hasChanges = fieldModifications.length > 0 || 
                      Object.keys(stylingChanges).length > 0 || 
                      Object.keys(settingsChanges).length > 0 ||
                      formName !== `${template.name} - Custom`
    setHasUnsavedChanges(hasChanges)
  }, [fieldModifications, stylingChanges, settingsChanges, formName, template.name])

  const addFieldModification = (modification: FieldModification) => {
    setFieldModifications(prev => {
      // Remove any existing modification for the same field
      const filtered = prev.filter(mod => mod.fieldId !== modification.fieldId)
      return [...filtered, modification]
    })
  }

  const removeFieldModification = (fieldId: string) => {
    setFieldModifications(prev => prev.filter(mod => mod.fieldId !== fieldId))
  }

  const handleAddField = (sectionId: string, fieldType: string) => {
    const newFieldId = `custom_field_${Date.now()}`
    const newField = {
      id: newFieldId,
      type: fieldType,
      label: `New ${fieldType} Field`,
      required: false,
      sectionId
    }

    addFieldModification({
      action: 'add',
      fieldId: newFieldId,
      data: newField
    })
  }

  const handleRemoveField = (fieldId: string) => {
    // Check if field is required and can't be removed
    if (template.customization.requiredFields.includes(fieldId)) {
      setError('This field is required and cannot be removed')
      return
    }

    addFieldModification({
      action: 'remove',
      fieldId
    })
  }

  const handleModifyField = (fieldId: string, changes: any) => {
    // Check if field is locked
    if (template.customization.lockedFields.includes(fieldId)) {
      setError('This field is locked and cannot be modified')
      return
    }

    addFieldModification({
      action: 'modify',
      fieldId,
      data: changes
    })
  }

  const handleStylingChange = (property: string, value: any) => {
    setStylingChanges(prev => ({
      ...prev,
      [property]: value
    }))
  }

  const handleSettingsChange = (setting: string, value: any) => {
    setSettingsChanges(prev => ({
      ...prev,
      [setting]: value
    }))
  }

  const handleVariableChange = (variableName: string, value: any) => {
    setVariableValues(prev => ({
      ...prev,
      [variableName]: value
    }))
  }

  const validateCustomization = (): ValidationError[] => {
    const errors: ValidationError[] = []

    // Check required fields
    template.customization.requiredFields.forEach(fieldId => {
      const isRemoved = fieldModifications.some(mod => 
        mod.action === 'remove' && mod.fieldId === fieldId
      )
      if (isRemoved) {
        errors.push({
          field: fieldId,
          message: 'Required field cannot be removed',
          severity: 'error'
        })
      }
    })

    // Check locked fields
    template.customization.lockedFields.forEach(fieldId => {
      const isModified = fieldModifications.some(mod => 
        (mod.action === 'modify' || mod.action === 'remove') && mod.fieldId === fieldId
      )
      if (isModified) {
        errors.push({
          field: fieldId,
          message: 'Locked field cannot be modified',
          severity: 'error'
        })
      }
    })

    // Check allowed modifications
    const allowedMods = template.customization.allowedModifications
    
    if (!allowedMods.includes('fields') && fieldModifications.length > 0) {
      errors.push({
        field: 'fields',
        message: 'Field modifications are not allowed for this template',
        severity: 'error'
      })
    }

    if (!allowedMods.includes('styling') && Object.keys(stylingChanges).length > 0) {
      errors.push({
        field: 'styling',
        message: 'Styling modifications are not allowed for this template',
        severity: 'error'
      })
    }

    if (!allowedMods.includes('settings') && Object.keys(settingsChanges).length > 0) {
      errors.push({
        field: 'settings',
        message: 'Settings modifications are not allowed for this template',
        severity: 'error'
      })
    }

    return errors
  }

  const handleSaveCustomization = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Validate customization
      const errors = validateCustomization()
      setValidationErrors(errors)
      
      if (errors.some(e => e.severity === 'error')) {
        setError('Please fix validation errors before saving')
        return
      }

      // Create customization object
      const customization: TemplateCustomization = {
        templateId: template.id,
        practitionerId,
        name: formName,
        description: formDescription,
        modifications: {
          fields: fieldModifications,
          styling: Object.keys(stylingChanges).length > 0 ? stylingChanges : undefined,
          settings: Object.keys(settingsChanges).length > 0 ? settingsChanges : undefined,
          variables: Object.keys(variableValues).length > 0 ? variableValues : undefined
        },
        savedAt: new Date().toISOString()
      }

      // Save customization
      const result = await FormTemplateManager.customizeTemplate(customization)
      
      if (result.success && result.formId) {
        onSave?.(result.formId)
      } else {
        setError(result.errors?.join(', ') || 'Failed to save customization')
      }
    } catch (error) {
      console.error('Error saving customization:', error)
      setError('Failed to save customization')
    } finally {
      setIsLoading(false)
    }
  }

  const getFieldById = (fieldId: string) => {
    for (const section of template.schema.sections) {
      const field = section.fields?.find(f => f.id === fieldId)
      if (field) return field
    }
    return null
  }

  const isFieldModified = (fieldId: string) => {
    return fieldModifications.some(mod => mod.fieldId === fieldId)
  }

  const isFieldRemoved = (fieldId: string) => {
    return fieldModifications.some(mod => mod.action === 'remove' && mod.fieldId === fieldId)
  }

  const getModificationBadge = (fieldId: string) => {
    const mod = fieldModifications.find(m => m.fieldId === fieldId)
    if (!mod) return null

    switch (mod.action) {
      case 'add':
        return <Badge className="bg-green-100 text-green-800">Added</Badge>
      case 'remove':
        return <Badge className="bg-red-100 text-red-800">Removed</Badge>
      case 'modify':
        return <Badge className="bg-blue-100 text-blue-800">Modified</Badge>
      default:
        return null
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p>Validation errors:</p>
              <ul className="list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Customize Template</h2>
          <p className="text-muted-foreground">
            Customize "{template.name}" to fit your practice needs
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          
          <Button 
            size="sm" 
            onClick={handleSaveCustomization}
            disabled={isLoading || !hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Form Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="formName">Form Name</Label>
              <Input
                id="formName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter form name"
              />
            </div>
            <div className="space-y-2">
              <Label>Template Source</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{template.name}</Badge>
                <Badge variant="outline">v{template.version}</Badge>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="formDescription">Description (Optional)</Label>
            <Textarea
              id="formDescription"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe how this form will be used"
            />
          </div>
        </CardContent>
      </Card>

      {/* Template Variables */}
      {template.customization.variableFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Template Variables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {template.customization.variableFields.map(variable => (
              <div key={variable.variableName} className="space-y-2">
                <Label htmlFor={variable.variableName}>
                  {variable.variableName}
                  <span className="text-sm text-muted-foreground ml-2">
                    {variable.description}
                  </span>
                </Label>
                <Input
                  id={variable.variableName}
                  value={variableValues[variable.variableName] || ''}
                  onChange={(e) => handleVariableChange(variable.variableName, e.target.value)}
                  placeholder={variable.defaultValue}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Customization Options */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger 
            value="fields" 
            disabled={!template.customization.allowedModifications.includes('fields')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Fields
          </TabsTrigger>
          <TabsTrigger 
            value="styling" 
            disabled={!template.customization.allowedModifications.includes('styling')}
          >
            <Palette className="h-4 w-4 mr-2" />
            Styling
          </TabsTrigger>
          <TabsTrigger 
            value="logic" 
            disabled={!template.customization.allowedModifications.includes('logic')}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Logic
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            disabled={!template.customization.allowedModifications.includes('settings')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-6">
          {template.schema.sections.map(section => (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddField(section.id, 'text')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
                {section.description && (
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.fields?.map(field => (
                    <div
                      key={field.id}
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-lg",
                        isFieldRemoved(field.id) && "opacity-50 bg-red-50",
                        isFieldModified(field.id) && !isFieldRemoved(field.id) && "bg-blue-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {template.customization.requiredFields.includes(field.id) && (
                            <Badge className="bg-orange-100 text-orange-800">Required</Badge>
                          )}
                          {template.customization.lockedFields.includes(field.id) && (
                            <Lock className="h-4 w-4 text-gray-500" />
                          )}
                          {getModificationBadge(field.id)}
                        </div>
                        
                        <div>
                          <p className="font-medium">{field.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {field.type} {field.required && '(required)'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleModifyField(field.id, { label: `${field.label} (Modified)` })}
                          disabled={template.customization.lockedFields.includes(field.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveField(field.id)}
                          disabled={template.customization.requiredFields.includes(field.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Show added fields */}
                  {fieldModifications
                    .filter(mod => mod.action === 'add' && mod.data?.sectionId === section.id)
                    .map(mod => (
                      <div
                        key={mod.fieldId}
                        className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className="bg-green-100 text-green-800">Added</Badge>
                          <div>
                            <p className="font-medium">{mod.data?.label}</p>
                            <p className="text-sm text-muted-foreground">{mod.data?.type}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFieldModification(mod.fieldId)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="styling" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme and Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={stylingChanges.primaryColor || '#3b82f6'}
                      onChange={(e) => handleStylingChange('primaryColor', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={stylingChanges.primaryColor || '#3b82f6'}
                      onChange={(e) => handleStylingChange('primaryColor', e.target.value)}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={stylingChanges.secondaryColor || '#64748b'}
                      onChange={(e) => handleStylingChange('secondaryColor', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={stylingChanges.secondaryColor || '#64748b'}
                      onChange={(e) => handleStylingChange('secondaryColor', e.target.value)}
                      placeholder="#64748b"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Select
                  value={stylingChanges.fontFamily || 'default'}
                  onValueChange={(value) => handleStylingChange('fontFamily', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="roboto">Roboto</SelectItem>
                    <SelectItem value="open-sans">Open Sans</SelectItem>
                    <SelectItem value="lato">Lato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conditional Logic</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Conditional logic modifications are not yet available in this interface.
                  You can modify the form after creation using the form builder.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Save Progress</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to save and resume form completion
                    </p>
                  </div>
                  <Switch
                    checked={settingsChanges.allowSaveProgress ?? template.schema.settings.allowSaveProgress}
                    onCheckedChange={(checked) => handleSettingsChange('allowSaveProgress', checked)}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Progress Bar</Label>
                    <p className="text-sm text-muted-foreground">
                      Display completion progress to users
                    </p>
                  </div>
                  <Switch
                    checked={settingsChanges.showProgressBar ?? template.schema.settings.showProgressBar}
                    onCheckedChange={(checked) => handleSettingsChange('showProgressBar', checked)}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Users must be logged in to complete form
                    </p>
                  </div>
                  <Switch
                    checked={settingsChanges.requireAuthentication ?? template.schema.settings.requireAuthentication}
                    onCheckedChange={(checked) => handleSettingsChange('requireAuthentication', checked)}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications for form events
                    </p>
                  </div>
                  <Switch
                    checked={settingsChanges.enableNotifications ?? template.schema.settings.enableNotifications}
                    onCheckedChange={(checked) => handleSettingsChange('enableNotifications', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Customization Summary */}
      {hasUnsavedChanges && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Customization Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fieldModifications.length > 0 && (
                <p className="text-sm">
                  <strong>Fields:</strong> {fieldModifications.length} modification(s)
                </p>
              )}
              {Object.keys(stylingChanges).length > 0 && (
                <p className="text-sm">
                  <strong>Styling:</strong> {Object.keys(stylingChanges).length} change(s)
                </p>
              )}
              {Object.keys(settingsChanges).length > 0 && (
                <p className="text-sm">
                  <strong>Settings:</strong> {Object.keys(settingsChanges).length} change(s)
                </p>
              )}
              {Object.keys(variableValues).length > 0 && (
                <p className="text-sm">
                  <strong>Variables:</strong> {Object.keys(variableValues).length} variable(s) set
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}