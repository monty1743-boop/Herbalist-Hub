"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { 
  Star, 
  AlertCircle,
  Shield
} from "lucide-react"
import { FormField } from "./FormRenderer"
import { cn } from "@/lib/utils"

// Import specialized field components
import { 
  TextField, 
  EmailField, 
  PhoneField, 
  UrlField, 
  PasswordField, 
  TextareaField, 
  NumberField 
} from "./fields/TextFields"
import { 
  SelectField, 
  RadioField, 
  CheckboxField, 
  MultiSelectField 
} from "./fields/SelectionFields"
import { 
  DateField, 
  TimeField, 
  DateTimeField, 
  DateRangeField, 
  BirthdateField 
} from "./fields/DateTimeFields"
import { 
  FileUploadField, 
  MultipleFileUploadField 
} from "./fields/FileUploadField"
import { 
  SignatureField, 
  InitialsField 
} from "./fields/SignatureField"
import { 
  SymptomRatingField, 
  MedicationField, 
  VitalSignsField, 
  AllergiesField 
} from "./fields/MedicalFields"

interface FieldComponentsProps {
  field: FormField
  value: any
  onChange: (value: any) => void
  error?: string
  disabled?: boolean
}

export function FieldComponents({ field, value, onChange, error, disabled }: FieldComponentsProps) {
  const getFieldWidth = () => {
    switch (field.styling?.width) {
      case "half":
        return "w-full md:w-1/2"
      case "third":
        return "w-full md:w-1/3"
      case "quarter":
        return "w-full md:w-1/4"
      default:
        return "w-full"
    }
  }

  const renderFieldInput = () => {
    const props = { field, value, onChange, error, disabled }

    switch (field.type) {
      // Text Fields
      case "text":
        return <TextField {...props} />
      case "email":
        return <EmailField {...props} />
      case "phone":
        return <PhoneField {...props} />
      case "url":
        return <UrlField {...props} />
      case "password":
        return <PasswordField {...props} />
      case "textarea":
        return <TextareaField {...props} />
      case "number":
        return <NumberField {...props} />

      // Selection Fields
      case "select":
        return <SelectField {...props} />
      case "radio":
        return <RadioField {...props} />
      case "checkbox":
        return <CheckboxField {...props} />
      case "multiselect":
        return <MultiSelectField {...props} />

      // Date/Time Fields
      case "date":
        return <DateField {...props} />
      case "time":
        return <TimeField {...props} />
      case "datetime":
        return <DateTimeField {...props} />
      case "daterange":
        return <DateRangeField {...props} />
      case "birthdate":
        return <BirthdateField {...props} />

      // File Fields
      case "file":
        return field.validation?.multiple 
          ? <MultipleFileUploadField {...props} />
          : <FileUploadField {...props} />

      // Signature Fields
      case "signature":
        return <SignatureField {...props} />
      case "initials":
        return <InitialsField {...props} />

      // Medical Fields
      case "symptom_rating":
        return <SymptomRatingField {...props} />
      case "medication":
        return <MedicationField {...props} />
      case "vital_signs":
        return <VitalSignsField {...props} />
      case "allergies":
        return <AllergiesField {...props} />

      // Legacy field types (keep existing implementations for backwards compatibility)
      case "rating":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>

            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}

            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-8 w-8 cursor-pointer transition-colors",
                    star <= (value || 0) ? "text-yellow-500 fill-current" : "text-gray-300 hover:text-yellow-400",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                  onClick={() => !disabled && onChange(star)}
                />
              ))}
              {value && (
                <span className="ml-2 text-sm text-gray-600">
                  {value} out of 5 stars
                </span>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )

      case "scale":
        const min = field.validation?.min || 1
        const max = field.validation?.max || 10
        const currentValue = value || min
        
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.metadata?.isHealthData && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  PHI
                </Badge>
              )}
            </div>

            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}

            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{min}</span>
                <span className="font-medium text-lg">{currentValue}</span>
                <span>{max}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                value={currentValue}
                onChange={(e) => onChange(parseInt(e.target.value))}
                disabled={disabled}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {error && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )

      case "range":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={field.id} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>

            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}

            <div className="space-y-3">
              <Input
                type="range"
                min={field.validation?.min || 0}
                max={field.validation?.max || 100}
                value={value || field.validation?.min || 0}
                onChange={(e) => onChange(parseInt(e.target.value))}
                disabled={disabled}
                className={error ? "border-red-500" : ""}
              />
              <div className="text-center text-sm text-gray-600">
                Value: {value || field.validation?.min || 0}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )

      case "color":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={field.id} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>

            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}

            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={value || "#000000"}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-12 h-10 border rounded cursor-pointer disabled:cursor-not-allowed"
              />
              <Input
                value={value || "#000000"}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#000000"
                className={cn("font-mono flex-1", error ? "border-red-500" : "")}
                disabled={disabled}
              />
            </div>

            {error && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )

      case "address":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.metadata?.isHealthData && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  PHI
                </Badge>
              )}
            </div>

            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}

            <div className="space-y-3">
              <Input
                placeholder="Street address"
                value={value?.street || ""}
                onChange={(e) => onChange({ ...value, street: e.target.value })}
                disabled={disabled}
                className={error ? "border-red-500" : ""}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="City"
                  value={value?.city || ""}
                  onChange={(e) => onChange({ ...value, city: e.target.value })}
                  disabled={disabled}
                />
                <Input
                  placeholder="State/Province"
                  value={value?.state || ""}
                  onChange={(e) => onChange({ ...value, state: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="ZIP/Postal code"
                  value={value?.zip || ""}
                  onChange={(e) => onChange({ ...value, zip: e.target.value })}
                  disabled={disabled}
                />
                <Input
                  placeholder="Country"
                  value={value?.country || ""}
                  onChange={(e) => onChange({ ...value, country: e.target.value })}
                  disabled={disabled}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="p-4 bg-gray-100 rounded text-center text-gray-500">
            Unsupported field type: {field.type}
          </div>
        )
    }
  }

  return (
    <div className={cn("space-y-2", getFieldWidth(), field.styling?.className)}>
      {renderFieldInput()}
    </div>
  )
}