"use client"

import { useState, useCallback } from "react"
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { FieldLibrary } from "./FieldLibrary"
import { FormCanvas } from "./FormCanvas"
import { FieldEditor } from "./FieldEditor"
import { FormPreview } from "./FormPreview"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Palette, Code, Eye, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FormField {
  id: string
  type: string
  label: string
  placeholder?: string
  description?: string
  required?: boolean
  validation?: Record<string, any>
  options?: Array<{ value: string; label: string }>
  conditionalLogic?: Record<string, any>
  styling?: Record<string, any>
  metadata?: Record<string, any>
}

export interface FormSection {
  id: string
  title: string
  description?: string
  fields: FormField[]
  conditionalLogic?: Record<string, any>
  styling?: Record<string, any>
}

export interface FormData {
  name: string
  description?: string
  fields: {
    sections: FormSection[]
    settings: Record<string, any>
    metadata: Record<string, any>
  }
  category?: string
  estimatedTime?: number
}

interface FormBuilderProps {
  initialData: FormData
  onChange: (data: FormData) => void
  isLoading?: boolean
}

export function FormBuilder({ initialData, onChange, isLoading }: FormBuilderProps) {
  const [formData, setFormData] = useState<FormData>(initialData)
  const [selectedField, setSelectedField] = useState<FormField | null>(null)
  const [selectedSection, setSelectedSection] = useState<FormSection | null>(null)
  const [activeTab, setActiveTab] = useState("design")
  const [draggedField, setDraggedField] = useState<any>(null)

  const updateFormData = useCallback((updatedData: FormData) => {
    setFormData(updatedData)
    onChange(updatedData)
  }, [onChange])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setDraggedField(active.data.current)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedField(null)

    if (!over) return

    const draggedItem = active.data.current
    const targetData = over.data.current

    if (draggedItem?.type === "field_type") {
      // Adding new field from library
      const newField: FormField = {
        id: `field_${Date.now()}`,
        type: draggedItem.fieldType,
        label: draggedItem.label,
        placeholder: draggedItem.placeholder || "",
        required: false,
        validation: {},
        metadata: {
          isHealthData: draggedItem.isHealthData || false,
        }
      }

      addFieldToSection(targetData?.sectionId, newField, targetData?.index)
    } else if (draggedItem?.type === "field" && targetData?.type === "field") {
      // Reordering existing fields
      moveField(
        draggedItem.sectionId,
        draggedItem.fieldIndex,
        targetData.sectionId,
        targetData.fieldIndex
      )
    }
  }

  const addFieldToSection = (sectionId: string, field: FormField, index?: number) => {
    const updatedData = { ...formData }
    const section = updatedData.fields.sections.find(s => s.id === sectionId)
    
    if (section) {
      if (index !== undefined) {
        section.fields.splice(index, 0, field)
      } else {
        section.fields.push(field)
      }
      updateFormData(updatedData)
    }
  }

  const moveField = (
    fromSectionId: string,
    fromIndex: number,
    toSectionId: string,
    toIndex: number
  ) => {
    const updatedData = { ...formData }
    const fromSection = updatedData.fields.sections.find(s => s.id === fromSectionId)
    const toSection = updatedData.fields.sections.find(s => s.id === toSectionId)

    if (fromSection && toSection) {
      const [movedField] = fromSection.fields.splice(fromIndex, 1)
      toSection.fields.splice(toIndex, 0, movedField)
      updateFormData(updatedData)
    }
  }

  const updateField = (sectionId: string, fieldId: string, updates: Partial<FormField>) => {
    const updatedData = { ...formData }
    const section = updatedData.fields.sections.find(s => s.id === sectionId)
    
    if (section) {
      const field = section.fields.find(f => f.id === fieldId)
      if (field) {
        Object.assign(field, updates)
        updateFormData(updatedData)
      }
    }
  }

  const deleteField = (sectionId: string, fieldId: string) => {
    const updatedData = { ...formData }
    const section = updatedData.fields.sections.find(s => s.id === sectionId)
    
    if (section) {
      section.fields = section.fields.filter(f => f.id !== fieldId)
      updateFormData(updatedData)
      setSelectedField(null)
    }
  }

  const addSection = () => {
    const newSection: FormSection = {
      id: `section_${Date.now()}`,
      title: "New Section",
      description: "",
      fields: [],
    }

    const updatedData = { ...formData }
    updatedData.fields.sections.push(newSection)
    updateFormData(updatedData)
  }

  const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
    const updatedData = { ...formData }
    const section = updatedData.fields.sections.find(s => s.id === sectionId)
    
    if (section) {
      Object.assign(section, updates)
      updateFormData(updatedData)
    }
  }

  const deleteSection = (sectionId: string) => {
    if (formData.fields.sections.length <= 1) return // Keep at least one section

    const updatedData = { ...formData }
    updatedData.fields.sections = updatedData.fields.sections.filter(s => s.id !== sectionId)
    updateFormData(updatedData)
    setSelectedSection(null)
  }

  const updateFormSettings = (updates: Record<string, any>) => {
    const updatedData = { ...formData }
    updatedData.fields.settings = { ...updatedData.fields.settings, ...updates }
    updateFormData(updatedData)
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full">
        {/* Left Sidebar - Field Library */}
        <div className="w-80 border-r bg-gray-50/40">
          <FieldLibrary />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="border-b px-6 py-3">
              <TabsList>
                <TabsTrigger value="design" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  JSON
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="design" className="h-full m-0">
                <div className="flex h-full">
                  {/* Form Canvas */}
                  <div className="flex-1 overflow-auto">
                    <FormCanvas
                      formData={formData}
                      onFieldSelect={setSelectedField}
                      onSectionSelect={setSelectedSection}
                      onFieldUpdate={updateField}
                      onFieldDelete={deleteField}
                      onSectionUpdate={updateSection}
                      onSectionDelete={deleteSection}
                      onAddSection={addSection}
                      selectedField={selectedField}
                      selectedSection={selectedSection}
                    />
                  </div>

                  {/* Right Sidebar - Field Editor */}
                  <div className="w-80 border-l bg-white">
                    <FieldEditor
                      selectedField={selectedField}
                      selectedSection={selectedSection}
                      formData={formData}
                      onFieldUpdate={updateField}
                      onSectionUpdate={updateSection}
                      onSettingsUpdate={updateFormSettings}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="h-full m-0">
                <FormPreview formData={formData} />
              </TabsContent>

              <TabsContent value="code" className="h-full m-0">
                <div className="p-6 h-full">
                  <Card className="h-full">
                    <div className="p-4 h-full">
                      <pre className="text-sm font-mono overflow-auto h-full">
                        {JSON.stringify(formData, null, 2)}
                      </pre>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggedField && (
          <div className={cn(
            "bg-white border rounded-lg p-3 shadow-lg opacity-90",
            "min-w-[200px] max-w-[300px]"
          )}>
            <div className="flex items-center gap-2">
              {draggedField.icon}
              <span className="font-medium">{draggedField.label}</span>
            </div>
            {draggedField.description && (
              <p className="text-sm text-gray-600 mt-1">
                {draggedField.description}
              </p>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}