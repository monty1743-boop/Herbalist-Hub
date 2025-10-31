"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  GripVertical, 
  Settings, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff,
  Edit,
  Copy
} from "lucide-react"
import { FormData, FormField, FormSection } from "./FormBuilder"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface FormCanvasProps {
  formData: FormData
  onFieldSelect: (field: FormField | null) => void
  onSectionSelect: (section: FormSection | null) => void
  onFieldUpdate: (sectionId: string, fieldId: string, updates: Partial<FormField>) => void
  onFieldDelete: (sectionId: string, fieldId: string) => void
  onSectionUpdate: (sectionId: string, updates: Partial<FormSection>) => void
  onSectionDelete: (sectionId: string) => void
  onAddSection: () => void
  selectedField: FormField | null
  selectedSection: FormSection | null
}

interface SortableFieldProps {
  field: FormField
  sectionId: string
  index: number
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<FormField>) => void
  onDelete: () => void
}

function SortableField({ 
  field, 
  sectionId, 
  index, 
  isSelected, 
  onSelect, 
  onUpdate, 
  onDelete 
}: SortableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(field.label)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data: {
      type: "field",
      sectionId,
      fieldIndex: index,
      field,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleLabelEdit = () => {
    if (isEditing) {
      onUpdate({ label: editValue })
      setIsEditing(false)
    } else {
      setIsEditing(true)
    }
  }

  const renderFieldPreview = () => {
    const baseClasses = "w-full"
    
    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "url":
      case "password":
        return (
          <Input 
            placeholder={field.placeholder || "Enter text..."} 
            className={baseClasses}
            disabled
          />
        )
      case "textarea":
        return (
          <Textarea 
            placeholder={field.placeholder || "Enter detailed information..."} 
            className={baseClasses}
            disabled
            rows={3}
          />
        )
      case "number":
        return (
          <Input 
            type="number" 
            placeholder={field.placeholder || "0"} 
            className={baseClasses}
            disabled
          />
        )
      case "date":
        return (
          <Input 
            type="date" 
            className={baseClasses}
            disabled
          />
        )
      case "time":
        return (
          <Input 
            type="time" 
            className={baseClasses}
            disabled
          />
        )
      case "select":
        return (
          <div className="relative">
            <select className="w-full px-3 py-2 border rounded-md bg-gray-50" disabled>
              <option>Select an option...</option>
              {field.options?.map((option, idx) => (
                <option key={idx} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )
      case "radio":
        return (
          <div className="space-y-2">
            {(field.options || [{ value: "option1", label: "Option 1" }]).map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <input type="radio" disabled className="text-primary" />
                <label className="text-sm">{option.label}</label>
              </div>
            ))}
          </div>
        )
      case "checkbox":
        return (
          <div className="space-y-2">
            {(field.options || [{ value: "option1", label: "Option 1" }]).map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <input type="checkbox" disabled className="text-primary" />
                <label className="text-sm">{option.label}</label>
              </div>
            ))}
          </div>
        )
      case "file":
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <div className="text-gray-500">
              <Upload className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm">Click to upload or drag and drop</p>
            </div>
          </div>
        )
      case "signature":
        return (
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 h-24 flex items-center justify-center">
            <p className="text-gray-500 text-sm">Signature area</p>
          </div>
        )
      case "rating":
        return (
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-6 w-6 text-gray-300" />
            ))}
          </div>
        )
      case "scale":
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>1</span>
              <span>10</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="10" 
              className="w-full" 
              disabled 
            />
          </div>
        )
      default:
        return (
          <div className="p-3 bg-gray-100 rounded text-center text-gray-500">
            {field.type} field
          </div>
        )
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-white border rounded-lg p-4 transition-all",
        isSelected && "ring-2 ring-primary border-primary",
        isDragging && "opacity-50 shadow-lg"
      )}
      onClick={onSelect}
    >
      {/* Field Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          
          {isEditing ? (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleLabelEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLabelEdit()
                if (e.key === "Escape") {
                  setEditValue(field.label)
                  setIsEditing(false)
                }
              }}
              className="h-6 text-sm font-medium"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <h4 
                className="font-medium text-sm cursor-pointer hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}
              >
                {field.label}
              </h4>
              {field.required && (
                <span className="text-red-500 text-sm">*</span>
              )}
              {field.metadata?.isHealthData && (
                <Badge variant="secondary" className="text-xs">
                  PHI
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Field Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onUpdate({ required: !field.required })
            }}
            className="h-6 w-6 p-0"
          >
            {field.required ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Implement field duplication
            }}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Field Description */}
      {field.description && (
        <p className="text-sm text-gray-600 mb-3">{field.description}</p>
      )}

      {/* Field Preview */}
      <div className="pointer-events-none">
        {renderFieldPreview()}
      </div>
    </div>
  )
}

interface DroppableSectionProps {
  section: FormSection
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<FormSection>) => void
  onDelete: () => void
  onFieldSelect: (field: FormField | null) => void
  onFieldUpdate: (fieldId: string, updates: Partial<FormField>) => void
  onFieldDelete: (fieldId: string) => void
  selectedField: FormField | null
}

function DroppableSection({
  section,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onFieldSelect,
  onFieldUpdate,
  onFieldDelete,
  selectedField,
}: DroppableSectionProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(section.title)

  const { setNodeRef, isOver } = useDroppable({
    id: section.id,
    data: {
      type: "section",
      sectionId: section.id,
    },
  })

  const handleTitleEdit = () => {
    if (isEditingTitle) {
      onUpdate({ title: editTitle })
      setIsEditingTitle(false)
    } else {
      setIsEditingTitle(true)
    }
  }

  return (
    <Card 
      className={cn(
        "transition-all",
        isSelected && "ring-2 ring-primary",
        isOver && "ring-2 ring-blue-500 bg-blue-50"
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          {isEditingTitle ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleEdit()
                if (e.key === "Escape") {
                  setEditTitle(section.title)
                  setIsEditingTitle(false)
                }
              }}
              className="text-lg font-semibold"
              autoFocus
            />
          ) : (
            <h3 
              className="text-lg font-semibold cursor-pointer hover:text-primary"
              onClick={(e) => {
                e.stopPropagation()
                onSelect()
                setIsEditingTitle(true)
              }}
            >
              {section.title}
            </h3>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelect}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {section.description && (
          <p className="text-sm text-gray-600">{section.description}</p>
        )}
      </CardHeader>

      <CardContent ref={setNodeRef}>
        <SortableContext 
          items={section.fields.map(f => f.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {section.fields.length > 0 ? (
              section.fields.map((field, index) => (
                <SortableField
                  key={field.id}
                  field={field}
                  sectionId={section.id}
                  index={index}
                  isSelected={selectedField?.id === field.id}
                  onSelect={() => onFieldSelect(field)}
                  onUpdate={(updates) => onFieldUpdate(field.id, updates)}
                  onDelete={() => onFieldDelete(field.id)}
                />
              ))
            ) : (
              <div className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
              )}>
                <div className="text-gray-500">
                  <Plus className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Drop fields here</p>
                  <p className="text-sm">Drag fields from the library to add them to this section</p>
                </div>
              </div>
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  )
}

export function FormCanvas({
  formData,
  onFieldSelect,
  onSectionSelect,
  onFieldUpdate,
  onFieldDelete,
  onSectionUpdate,
  onSectionDelete,
  onAddSection,
  selectedField,
  selectedSection,
}: FormCanvasProps) {
  return (
    <div className="p-6">
      <ScrollArea className="h-full">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Form Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">{formData.name}</h1>
            {formData.description && (
              <p className="text-gray-600 mt-2">{formData.description}</p>
            )}
            {formData.estimatedTime && (
              <p className="text-sm text-gray-500 mt-1">
                Estimated time: {formData.estimatedTime} minutes
              </p>
            )}
          </div>

          {/* Form Sections */}
          <div className="space-y-6">
            {formData.fields.sections.map((section) => (
              <DroppableSection
                key={section.id}
                section={section}
                isSelected={selectedSection?.id === section.id}
                onSelect={() => onSectionSelect(section)}
                onUpdate={(updates) => onSectionUpdate(section.id, updates)}
                onDelete={() => onSectionDelete(section.id)}
                onFieldSelect={onFieldSelect}
                onFieldUpdate={(fieldId, updates) => onFieldUpdate(section.id, fieldId, updates)}
                onFieldDelete={(fieldId) => onFieldDelete(section.id, fieldId)}
                selectedField={selectedField}
              />
            ))}
          </div>

          {/* Add Section Button */}
          <Card className="border-dashed border-2">
            <CardContent className="p-6">
              <Button
                variant="ghost"
                onClick={onAddSection}
                className="w-full h-16 border-dashed border-2 border-gray-300 hover:border-primary"
              >
                <Plus className="h-6 w-6 mr-2" />
                Add New Section
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}