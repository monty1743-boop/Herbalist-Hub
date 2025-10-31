"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Settings,
  Plus, 
  Trash2, 
  Shield, 
  Palette, 
  Code,
  HelpCircle
} from "lucide-react"
import { FormData, FormField, FormSection } from "./FormBuilder"
import { cn } from "@/lib/utils"

interface FieldEditorProps {
  selectedField: FormField | null
  selectedSection: FormSection | null
  formData: FormData
  onFieldUpdate: (sectionId: string, fieldId: string, updates: Partial<FormField>) => void
  onSectionUpdate: (sectionId: string, updates: Partial<FormSection>) => void
  onSettingsUpdate: (updates: Record<string, any>) => void
}

export function FieldEditor({
  selectedField,
  selectedSection,
  formData,
  onFieldUpdate,
  onSectionUpdate,
  onSettingsUpdate,
}: FieldEditorProps) {
  const [activeTab, setActiveTab] = useState("properties")

  if (!selectedField && !selectedSection) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Properties
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-center p-6">
          <div className="text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h4 className="font-medium mb-2">No Selection</h4>
            <p className="text-sm">
              Select a field or section to edit its properties
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (selectedField) {
    return <FieldProperties field={selectedField} formData={formData} onUpdate={onFieldUpdate} />
  }

  if (selectedSection) {
    return <SectionProperties section={selectedSection} onUpdate={onSectionUpdate} />
  }

  return null
}

interface FieldPropertiesProps {
  field: FormField
  formData: FormData
  onUpdate: (sectionId: string, fieldId: string, updates: Partial<FormField>) => void
}

function FieldProperties({ field, formData, onUpdate }: FieldPropertiesProps) {
  // Find which section this field belongs to
  const section = formData.fields.sections.find(s => 
    s.fields.some(f => f.id === field.id)
  )

  if (!section) return null

  const updateField = (updates: Partial<FormField>) => {
    onUpdate(section.id, field.id, updates)
  }

  const addOption = () => {
    const options = field.options || []
    const newOption = {
      value: `option_${options.length + 1}`,
      label: `Option ${options.length + 1}`,
    }
    updateField({ options: [...options, newOption] })
  }

  const updateOption = (index: number, updates: Partial<{ value: string; label: string }>) => {
    const options = [...(field.options || [])]
    options[index] = { ...options[index], ...updates }
    updateField({ options })
  }

  const removeOption = (index: number) => {
    const options = [...(field.options || [])]
    options.splice(index, 1)
    updateField({ options })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Field Properties
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {field.label} ({field.type})
        </p>
      </div>

      <ScrollArea className="flex-1">
        <Tabs value="properties" className="h-full">
          <div className="p-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="properties">Basic</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
          </div>

          <div className="px-4 pb-4">
            <TabsContent value="properties" className="space-y-4 mt-0">
              {/* Basic Properties */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="field-label">Label</Label>
                  <Input
                    id="field-label"
                    value={field.label}
                    onChange={(e) => updateField({ label: e.target.value })}
                    placeholder="Field label"
                  />
                </div>

                <div>
                  <Label htmlFor="field-placeholder">Placeholder</Label>
                  <Input
                    id="field-placeholder"
                    value={field.placeholder || ""}
                    onChange={(e) => updateField({ placeholder: e.target.value })}
                    placeholder="Placeholder text"
                  />
                </div>

                <div>
                  <Label htmlFor="field-description">Description</Label>
                  <Textarea
                    id="field-description"
                    value={field.description || ""}
                    onChange={(e) => updateField({ description: e.target.value })}
                    placeholder="Help text for this field"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Required Field</Label>
                    <p className="text-sm text-gray-600">
                      Users must fill this field
                    </p>
                  </div>
                  <Switch
                    checked={field.required || false}
                    onCheckedChange={(checked) => updateField({ required: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      Health Information (PHI)
                      <Shield className="h-4 w-4" />
                    </Label>
                    <p className="text-sm text-gray-600">
                      This field contains protected health information
                    </p>
                  </div>
                  <Switch
                    checked={field.metadata?.isHealthData || false}
                    onCheckedChange={(checked) => 
                      updateField({ 
                        metadata: { 
                          ...field.metadata, 
                          isHealthData: checked 
                        } 
                      })
                    }
                  />
                </div>

                {/* Field Options for select, radio, checkbox */}
                {["select", "radio", "checkbox"].includes(field.type) && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>Options</Label>
                      <Button size="sm" onClick={addOption}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Option
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {(field.options || []).map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="Option label"
                            value={option.label}
                            onChange={(e) => updateOption(index, { label: e.target.value })}
                          />
                          <Input
                            placeholder="Value"
                            value={option.value}
                            onChange={(e) => updateOption(index, { value: e.target.value })}
                            className="w-32"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="validation" className="space-y-4 mt-0">
              {/* Validation Rules */}
              <div className="space-y-4">
                {["text", "textarea", "email", "phone", "url", "password"].includes(field.type) && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="min-length">Min Length</Label>
                        <Input
                          id="min-length"
                          type="number"
                          value={field.validation?.minLength || ""}
                          onChange={(e) => updateField({ 
                            validation: { 
                              ...field.validation, 
                              minLength: e.target.value ? parseInt(e.target.value) : undefined 
                            } 
                          })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-length">Max Length</Label>
                        <Input
                          id="max-length"
                          type="number"
                          value={field.validation?.maxLength || ""}
                          onChange={(e) => updateField({ 
                            validation: { 
                              ...field.validation, 
                              maxLength: e.target.value ? parseInt(e.target.value) : undefined 
                            } 
                          })}
                          placeholder="∞"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="pattern">Pattern (RegEx)</Label>
                      <Input
                        id="pattern"
                        value={field.validation?.pattern || ""}
                        onChange={(e) => updateField({ 
                          validation: { 
                            ...field.validation, 
                            pattern: e.target.value 
                          } 
                        })}
                        placeholder="^[A-Za-z]+$"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Regular expression pattern for validation
                      </p>
                    </div>
                  </>
                )}

                {["number", "rating", "scale"].includes(field.type) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="min-value">Min Value</Label>
                      <Input
                        id="min-value"
                        type="number"
                        value={field.validation?.min || ""}
                        onChange={(e) => updateField({ 
                          validation: { 
                            ...field.validation, 
                            min: e.target.value ? parseFloat(e.target.value) : undefined 
                          } 
                        })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-value">Max Value</Label>
                      <Input
                        id="max-value"
                        type="number"
                        value={field.validation?.max || ""}
                        onChange={(e) => updateField({ 
                          validation: { 
                            ...field.validation, 
                            max: e.target.value ? parseFloat(e.target.value) : undefined 
                          } 
                        })}
                        placeholder="∞"
                      />
                    </div>
                  </div>
                )}

                {field.type === "file" && (
                  <>
                    <div>
                      <Label htmlFor="allowed-extensions">Allowed File Types</Label>
                      <Input
                        id="allowed-extensions"
                        value={field.validation?.allowedExtensions?.join(", ") || ""}
                        onChange={(e) => updateField({ 
                          validation: { 
                            ...field.validation, 
                            allowedExtensions: e.target.value.split(",").map(ext => ext.trim()).filter(Boolean)
                          } 
                        })}
                        placeholder=".pdf, .jpg, .png"
                      />
                    </div>

                    <div>
                      <Label htmlFor="max-file-size">Max File Size (MB)</Label>
                      <Input
                        id="max-file-size"
                        type="number"
                        value={field.validation?.maxFileSize ? field.validation.maxFileSize / (1024 * 1024) : ""}
                        onChange={(e) => updateField({ 
                          validation: { 
                            ...field.validation, 
                            maxFileSize: e.target.value ? parseFloat(e.target.value) * 1024 * 1024 : undefined 
                          } 
                        })}
                        placeholder="10"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="custom-message">Custom Error Message</Label>
                  <Input
                    id="custom-message"
                    value={field.validation?.customMessage || ""}
                    onChange={(e) => updateField({ 
                      validation: { 
                        ...field.validation, 
                        customMessage: e.target.value 
                      } 
                    })}
                    placeholder="This field is invalid"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-0">
              {/* Advanced Options */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="field-width">Field Width</Label>
                  <Select
                    value={field.styling?.width || "full"}
                    onValueChange={(value) => updateField({ 
                      styling: { 
                        ...field.styling, 
                        width: value 
                      } 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Width</SelectItem>
                      <SelectItem value="half">Half Width</SelectItem>
                      <SelectItem value="third">One Third</SelectItem>
                      <SelectItem value="quarter">One Quarter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="field-category">Category</Label>
                  <Input
                    id="field-category"
                    value={field.metadata?.category || ""}
                    onChange={(e) => updateField({ 
                      metadata: { 
                        ...field.metadata, 
                        category: e.target.value 
                      } 
                    })}
                    placeholder="General, Medical, Contact..."
                  />
                </div>

                <div>
                  <Label htmlFor="internal-notes">Internal Notes</Label>
                  <Textarea
                    id="internal-notes"
                    value={field.metadata?.internalNotes || ""}
                    onChange={(e) => updateField({ 
                      metadata: { 
                        ...field.metadata, 
                        internalNotes: e.target.value 
                      } 
                    })}
                    placeholder="Notes for staff only"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    These notes are only visible to staff
                  </p>
                </div>

                <div>
                  <Label htmlFor="custom-class">Custom CSS Class</Label>
                  <Input
                    id="custom-class"
                    value={field.styling?.className || ""}
                    onChange={(e) => updateField({ 
                      styling: { 
                        ...field.styling, 
                        className: e.target.value 
                      } 
                    })}
                    placeholder="custom-field-class"
                  />
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Field Data
                  </h4>
                  <div className="bg-gray-50 rounded p-3 text-xs font-mono">
                    <pre>{JSON.stringify(field, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </ScrollArea>
    </div>
  )
}

interface SectionPropertiesProps {
  section: FormSection
  onUpdate: (sectionId: string, updates: Partial<FormSection>) => void
}

function SectionProperties({ section, onUpdate }: SectionPropertiesProps) {
  const updateSection = (updates: Partial<FormSection>) => {
    onUpdate(section.id, updates)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Section Properties
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {section.title}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="section-title">Section Title</Label>
            <Input
              id="section-title"
              value={section.title}
              onChange={(e) => updateSection({ title: e.target.value })}
              placeholder="Section title"
            />
          </div>

          <div>
            <Label htmlFor="section-description">Description</Label>
            <Textarea
              id="section-description"
              value={section.description || ""}
              onChange={(e) => updateSection({ description: e.target.value })}
              placeholder="Optional section description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="section-layout">Layout</Label>
            <Select
              value={section.styling?.layout || "single_column"}
              onValueChange={(value) => updateSection({ 
                styling: { 
                  ...section.styling, 
                  layout: value 
                } 
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_column">Single Column</SelectItem>
                <SelectItem value="two_column">Two Columns</SelectItem>
                <SelectItem value="grid">Grid Layout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Section Statistics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Fields:</span>
                <Badge variant="secondary">{section.fields.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Required Fields:</span>
                <Badge variant="secondary">
                  {section.fields.filter(f => f.required).length}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>PHI Fields:</span>
                <Badge variant="secondary">
                  {section.fields.filter(f => f.metadata?.isHealthData).length}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}