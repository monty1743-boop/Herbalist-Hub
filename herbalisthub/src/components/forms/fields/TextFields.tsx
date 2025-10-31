"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Eye, 
  EyeOff, 
  AlertCircle,
  Shield
} from "lucide-react"
import { FormField } from "../FormRenderer"
import { cn } from "@/lib/utils"

interface TextFieldProps {
  field: FormField
  value: any
  onChange: (value: any) => void
  error?: string
  disabled?: boolean
}

export function TextField({ field, value, onChange, error, disabled }: TextFieldProps) {
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

      <Input
        id={field.id}
        type="text"
        placeholder={field.placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={field.validation?.maxLength}
        minLength={field.validation?.minLength}
        pattern={field.validation?.pattern}
        className={error ? "border-red-500" : ""}
      />

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {field.validation?.maxLength && value && (
        <div className="text-xs text-gray-500 text-right">
          {(value || "").length} / {field.validation.maxLength} characters
        </div>
      )}
    </div>
  )
}

export function EmailField({ field, value, onChange, error, disabled }: TextFieldProps) {
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

      <Input
        id={field.id}
        type="email"
        placeholder={field.placeholder || "Enter email address"}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={error ? "border-red-500" : ""}
      />

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export function PhoneField({ field, value, onChange, error, disabled }: TextFieldProps) {
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX
    if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    } else {
      return digits
    }
  }

  const handlePhoneChange = (inputValue: string) => {
    const formatted = formatPhoneNumber(inputValue)
    onChange(formatted)
  }

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

      <Input
        id={field.id}
        type="tel"
        placeholder={field.placeholder || "(555) 123-4567"}
        value={value || ""}
        onChange={(e) => handlePhoneChange(e.target.value)}
        disabled={disabled}
        maxLength={14}
        className={error ? "border-red-500" : ""}
      />

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export function UrlField({ field, value, onChange, error, disabled }: TextFieldProps) {
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

      <Input
        id={field.id}
        type="url"
        placeholder={field.placeholder || "https://example.com"}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={error ? "border-red-500" : ""}
      />

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export function PasswordField({ field, value, onChange, error, disabled }: TextFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

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

      <div className="relative">
        <Input
          id={field.id}
          type={showPassword ? "text" : "password"}
          placeholder={field.placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn("pr-10", error ? "border-red-500" : "")}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {field.validation?.minLength && (
        <p className="text-xs text-gray-500">
          Minimum {field.validation.minLength} characters required
        </p>
      )}
    </div>
  )
}

export function TextareaField({ field, value, onChange, error, disabled }: TextFieldProps) {
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

      <Textarea
        id={field.id}
        placeholder={field.placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={field.validation?.rows || 4}
        maxLength={field.validation?.maxLength}
        className={error ? "border-red-500" : ""}
      />

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {field.validation?.maxLength && value && (
        <div className="text-xs text-gray-500 text-right">
          {(value || "").length} / {field.validation.maxLength} characters
        </div>
      )}
    </div>
  )
}

export function NumberField({ field, value, onChange, error, disabled }: TextFieldProps) {
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

      <Input
        id={field.id}
        type="number"
        placeholder={field.placeholder}
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || "")}
        disabled={disabled}
        min={field.validation?.min}
        max={field.validation?.max}
        step={field.validation?.step || "any"}
        className={error ? "border-red-500" : ""}
      />

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {(field.validation?.min !== undefined || field.validation?.max !== undefined) && (
        <p className="text-xs text-gray-500">
          {field.validation?.min !== undefined && field.validation?.max !== undefined
            ? `Range: ${field.validation.min} - ${field.validation.max}`
            : field.validation?.min !== undefined
            ? `Minimum: ${field.validation.min}`
            : `Maximum: ${field.validation.max}`}
        </p>
      )}
    </div>
  )
}