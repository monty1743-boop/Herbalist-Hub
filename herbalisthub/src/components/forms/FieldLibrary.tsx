"use client"

import { useDraggable } from "@dnd-kit/core"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Type, 
  AlignLeft, 
  Mail, 
  Phone, 
  Hash, 
  Calendar, 
  Clock, 
  ChevronDown, 
  Circle, 
  CheckSquare, 
  Upload, 
  PenTool, 
  Star, 
  Sliders, 
  MapPin, 
  Link, 
  Lock,
  Palette,
  Search,
  Heart,
  Shield
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface FieldType {
  id: string
  type: string
  label: string
  description: string
  icon: React.ReactNode
  category: "basic" | "advanced" | "medical" | "layout"
  isHealthData?: boolean
  placeholder?: string
}

const FIELD_TYPES: FieldType[] = [
  // Basic Fields
  {
    id: "text",
    type: "text",
    label: "Text Input",
    description: "Single line text input",
    icon: <Type className="h-4 w-4" />,
    category: "basic",
    placeholder: "Enter text here..."
  },
  {
    id: "textarea",
    type: "textarea", 
    label: "Text Area",
    description: "Multi-line text input",
    icon: <AlignLeft className="h-4 w-4" />,
    category: "basic",
    placeholder: "Enter detailed information..."
  },
  {
    id: "email",
    type: "email",
    label: "Email",
    description: "Email address input with validation",
    icon: <Mail className="h-4 w-4" />,
    category: "basic",
    placeholder: "email@example.com"
  },
  {
    id: "phone",
    type: "phone",
    label: "Phone Number",
    description: "Phone number with formatting",
    icon: <Phone className="h-4 w-4" />,
    category: "basic",
    placeholder: "(555) 123-4567"
  },
  {
    id: "number",
    type: "number",
    label: "Number",
    description: "Numeric input with validation",
    icon: <Hash className="h-4 w-4" />,
    category: "basic",
    placeholder: "0"
  },
  {
    id: "date",
    type: "date",
    label: "Date",
    description: "Date picker",
    icon: <Calendar className="h-4 w-4" />,
    category: "basic"
  },
  {
    id: "time",
    type: "time",
    label: "Time",
    description: "Time picker",
    icon: <Clock className="h-4 w-4" />,
    category: "basic"
  },

  // Selection Fields
  {
    id: "select",
    type: "select",
    label: "Dropdown",
    description: "Single selection dropdown",
    icon: <ChevronDown className="h-4 w-4" />,
    category: "basic"
  },
  {
    id: "radio",
    type: "radio",
    label: "Radio Buttons",
    description: "Single selection from multiple options",
    icon: <Circle className="h-4 w-4" />,
    category: "basic"
  },
  {
    id: "checkbox",
    type: "checkbox",
    label: "Checkboxes",
    description: "Multiple selection options",
    icon: <CheckSquare className="h-4 w-4" />,
    category: "basic"
  },

  // Advanced Fields
  {
    id: "file",
    type: "file",
    label: "File Upload",
    description: "File upload with validation",
    icon: <Upload className="h-4 w-4" />,
    category: "advanced"
  },
  {
    id: "signature",
    type: "signature",
    label: "Digital Signature",
    description: "Capture digital signatures",
    icon: <PenTool className="h-4 w-4" />,
    category: "advanced"
  },
  {
    id: "rating",
    type: "rating",
    label: "Star Rating",
    description: "1-5 star rating system",
    icon: <Star className="h-4 w-4" />,
    category: "advanced"
  },
  {
    id: "scale",
    type: "scale",
    label: "Scale Rating",
    description: "Numeric scale (1-10)",
    icon: <Sliders className="h-4 w-4" />,
    category: "advanced"
  },
  {
    id: "address",
    type: "address",
    label: "Address",
    description: "Complete address input",
    icon: <MapPin className="h-4 w-4" />,
    category: "advanced"
  },
  {
    id: "url",
    type: "url",
    label: "Website URL",
    description: "URL input with validation",
    icon: <Link className="h-4 w-4" />,
    category: "advanced",
    placeholder: "https://example.com"
  },
  {
    id: "password",
    type: "password",
    label: "Password",
    description: "Secure password input",
    icon: <Lock className="h-4 w-4" />,
    category: "advanced"
  },
  {
    id: "color",
    type: "color",
    label: "Color Picker",
    description: "Color selection input",
    icon: <Palette className="h-4 w-4" />,
    category: "advanced"
  },

  // Medical/Health Fields
  {
    id: "symptoms",
    type: "textarea",
    label: "Symptoms",
    description: "Current symptoms description",
    icon: <Heart className="h-4 w-4" />,
    category: "medical",
    isHealthData: true,
    placeholder: "Describe your current symptoms..."
  },
  {
    id: "medications",
    type: "textarea",
    label: "Current Medications",
    description: "List of current medications",
    icon: <Shield className="h-4 w-4" />,
    category: "medical",
    isHealthData: true,
    placeholder: "List all current medications and dosages..."
  },
  {
    id: "allergies",
    type: "textarea",
    label: "Allergies",
    description: "Known allergies and reactions",
    icon: <Shield className="h-4 w-4" />,
    category: "medical",
    isHealthData: true,
    placeholder: "List any known allergies..."
  },
  {
    id: "medical_history",
    type: "textarea",
    label: "Medical History",
    description: "Past medical conditions",
    icon: <Heart className="h-4 w-4" />,
    category: "medical",
    isHealthData: true,
    placeholder: "Describe relevant medical history..."
  }
]

interface DraggableFieldProps {
  fieldType: FieldType
}

function DraggableField({ fieldType }: DraggableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: fieldType.id,
    data: {
      type: "field_type",
      fieldType: fieldType.type,
      label: fieldType.label,
      description: fieldType.description,
      icon: fieldType.icon,
      isHealthData: fieldType.isHealthData,
      placeholder: fieldType.placeholder,
    },
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "p-3 border rounded-lg cursor-grab active:cursor-grabbing",
        "hover:border-primary hover:bg-primary/5 transition-colors",
        "select-none",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="text-gray-600 mt-0.5">
          {fieldType.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">{fieldType.label}</h4>
            {fieldType.isHealthData && (
              <Badge variant="secondary" className="text-xs">
                PHI
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {fieldType.description}
          </p>
        </div>
      </div>
    </div>
  )
}

export function FieldLibrary() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const categories = [
    { id: "all", label: "All Fields", count: FIELD_TYPES.length },
    { id: "basic", label: "Basic", count: FIELD_TYPES.filter(f => f.category === "basic").length },
    { id: "advanced", label: "Advanced", count: FIELD_TYPES.filter(f => f.category === "advanced").length },
    { id: "medical", label: "Medical", count: FIELD_TYPES.filter(f => f.category === "medical").length },
  ]

  const filteredFields = FIELD_TYPES.filter(field => {
    const matchesSearch = field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         field.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || field.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold mb-3">Form Fields</h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filters */}
        <div className="space-y-1">
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "ghost"}
              size="sm"
              className="w-full justify-between"
              onClick={() => setSelectedCategory(category.id)}
            >
              <span>{category.label}</span>
              <Badge variant="secondary" className="ml-2">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredFields.length > 0 ? (
            filteredFields.map(fieldType => (
              <DraggableField key={fieldType.id} fieldType={fieldType} />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No fields found</p>
              <p className="text-xs">Try adjusting your search or filter</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Tips */}
      <div className="p-4 border-t bg-gray-50/50">
        <div className="text-xs text-gray-600">
          <p className="font-medium mb-1">💡 Quick Tips:</p>
          <ul className="space-y-0.5 text-xs">
            <li>• Drag fields to add them to your form</li>
            <li>• PHI fields are automatically encrypted</li>
            <li>• Use medical fields for health information</li>
          </ul>
        </div>
      </div>
    </div>
  )
}