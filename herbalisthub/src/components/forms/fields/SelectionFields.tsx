"use client"

import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Shield } from "lucide-react"
import { FormField } from "../FormRenderer"
import { cn } from "@/lib/utils"

interface SelectionFieldProps {
  field: FormField
  value: any
  onChange: (value: any) => void
  error?: string
  disabled?: boolean
}

export function SelectField({ field, value, onChange, error, disabled }: SelectionFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
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

      <select
        id={field.id}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-red-500" : ""
        )}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">
          {field.placeholder || "Select an option..."}
        </option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export function RadioField({ field, value, onChange, error, disabled }: SelectionFieldProps) {
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
        {field.options?.map((option) => (
          <div key={option.value} className="flex items-start space-x-3">
            <input
              type="radio"
              id={`${field.id}_${option.value}`}
              name={field.id}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="mt-1 text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <Label
                htmlFor={`${field.id}_${option.value}`}
                className="text-sm font-medium cursor-pointer"
              >
                {option.label}
              </Label>
              {option.description && (
                <p className="text-xs text-gray-600 mt-1">{option.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export function CheckboxField({ field, value, onChange, error, disabled }: SelectionFieldProps) {
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
        {field.options?.map((option) => {
          const isChecked = Array.isArray(value) ? value.includes(option.value) : false
          return (
            <div key={option.value} className="flex items-start space-x-3">
              <input
                type="checkbox"
                id={`${field.id}_${option.value}`}
                checked={isChecked}
                onChange={(e) => {
                  const currentValues = Array.isArray(value) ? value : []
                  if (e.target.checked) {
                    onChange([...currentValues, option.value])
                  } else {
                    onChange(currentValues.filter(v => v !== option.value))
                  }
                }}
                disabled={disabled}
                className="mt-1 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <Label
                  htmlFor={`${field.id}_${option.value}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {option.label}
                </Label>
                {option.description && (
                  <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {field.validation?.minSelected && (
        <p className="text-xs text-gray-500">
          Please select at least {field.validation.minSelected} option(s)
        </p>
      )}

      {field.validation?.maxSelected && (
        <p className="text-xs text-gray-500">
          You can select up to {field.validation.maxSelected} option(s)
        </p>
      )}
    </div>
  )
}

export function MultiSelectField({ field, value, onChange, error, disabled }: SelectionFieldProps) {
  const selectedValues = Array.isArray(value) ? value : []

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
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

      <select
        id={field.id}
        multiple
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-red-500" : ""
        )}
        value={selectedValues}
        onChange={(e) => {
          const values = Array.from(e.target.selectedOptions, option => option.value)
          onChange(values)
        }}
        disabled={disabled}
      >
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedValues.map((selectedValue) => {
            const option = field.options?.find(opt => opt.value === selectedValue)
            return (
              <Badge key={selectedValue} variant="secondary" className="text-xs">
                {option?.label || selectedValue}
              </Badge>
            )
          })}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Hold Ctrl (Cmd on Mac) to select multiple options
      </p>
    </div>
  )
}