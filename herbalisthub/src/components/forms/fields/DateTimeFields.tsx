"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  AlertCircle, 
  Shield, 
  Calendar as CalendarIcon,
  Clock
} from "lucide-react"
import { FormField } from "../FormRenderer"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useState } from "react"

interface DateTimeFieldProps {
  field: FormField
  value: any
  onChange: (value: any) => void
  error?: string
  disabled?: boolean
}

export function DateField({ field, value, onChange, error, disabled }: DateTimeFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedDate = value ? new Date(value) : undefined

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

      <div className="flex gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground",
                error && "border-red-500"
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : (field.placeholder || "Pick a date")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                onChange(date ? date.toISOString().split('T')[0] : "")
                setIsOpen(false)
              }}
              disabled={(date) => {
                if (disabled) return true
                if (field.validation?.minDate && date < new Date(field.validation.minDate)) return true
                if (field.validation?.maxDate && date > new Date(field.validation.maxDate)) return true
                return false
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Input
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          min={field.validation?.minDate}
          max={field.validation?.maxDate}
          className={cn("flex-1", error ? "border-red-500" : "")}
        />
      </div>

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {(field.validation?.minDate || field.validation?.maxDate) && (
        <p className="text-xs text-gray-500">
          {field.validation?.minDate && field.validation?.maxDate
            ? `Date range: ${field.validation.minDate} to ${field.validation.maxDate}`
            : field.validation?.minDate
            ? `Minimum date: ${field.validation.minDate}`
            : `Maximum date: ${field.validation.maxDate}`}
        </p>
      )}
    </div>
  )
}

export function TimeField({ field, value, onChange, error, disabled }: DateTimeFieldProps) {
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

      <div className="relative">
        <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          id={field.id}
          type="time"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          min={field.validation?.minTime}
          max={field.validation?.maxTime}
          step={field.validation?.timeStep || 900} // Default 15 minutes
          className={cn("pl-9", error ? "border-red-500" : "")}
        />
      </div>

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {(field.validation?.minTime || field.validation?.maxTime) && (
        <p className="text-xs text-gray-500">
          {field.validation?.minTime && field.validation?.maxTime
            ? `Time range: ${field.validation.minTime} to ${field.validation.maxTime}`
            : field.validation?.minTime
            ? `Earliest time: ${field.validation.minTime}`
            : `Latest time: ${field.validation.maxTime}`}
        </p>
      )}
    </div>
  )
}

export function DateTimeField({ field, value, onChange, error, disabled }: DateTimeFieldProps) {
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
        type="datetime-local"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={field.validation?.minDateTime}
        max={field.validation?.maxDateTime}
        className={error ? "border-red-500" : ""}
      />

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {(field.validation?.minDateTime || field.validation?.maxDateTime) && (
        <p className="text-xs text-gray-500">
          {field.validation?.minDateTime && field.validation?.maxDateTime
            ? `Range: ${new Date(field.validation.minDateTime).toLocaleString()} to ${new Date(field.validation.maxDateTime).toLocaleString()}`
            : field.validation?.minDateTime
            ? `Earliest: ${new Date(field.validation.minDateTime).toLocaleString()}`
            : `Latest: ${new Date(field.validation.maxDateTime).toLocaleString()}`}
        </p>
      )}
    </div>
  )
}

export function DateRangeField({ field, value, onChange, error, disabled }: DateTimeFieldProps) {
  const dateRange = value || { from: "", to: "" }

  const handleDateChange = (type: 'from' | 'to', newValue: string) => {
    onChange({
      ...dateRange,
      [type]: newValue
    })
  }

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${field.id}_from`} className="text-xs text-gray-600">
            From Date
          </Label>
          <Input
            id={`${field.id}_from`}
            type="date"
            value={dateRange.from || ""}
            onChange={(e) => handleDateChange('from', e.target.value)}
            disabled={disabled}
            max={dateRange.to || field.validation?.maxDate}
            className={error ? "border-red-500" : ""}
          />
        </div>
        <div>
          <Label htmlFor={`${field.id}_to`} className="text-xs text-gray-600">
            To Date
          </Label>
          <Input
            id={`${field.id}_to`}
            type="date"
            value={dateRange.to || ""}
            onChange={(e) => handleDateChange('to', e.target.value)}
            disabled={disabled}
            min={dateRange.from || field.validation?.minDate}
            className={error ? "border-red-500" : ""}
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
}

export function BirthdateField({ field, value, onChange, error, disabled }: DateTimeFieldProps) {
  const calculateAge = (birthdate: string) => {
    if (!birthdate) return null
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const age = value ? calculateAge(value) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Badge variant="outline" className="text-xs flex items-center gap-1">
          <Shield className="h-3 w-3" />
          PHI
        </Badge>
      </div>

      {field.description && (
        <p className="text-sm text-gray-600">{field.description}</p>
      )}

      <Input
        id={field.id}
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        max={new Date().toISOString().split('T')[0]} // Can't be in the future
        min="1900-01-01" // Reasonable minimum
        className={error ? "border-red-500" : ""}
      />

      {age !== null && (
        <p className="text-sm text-gray-600">
          Age: {age} years old
        </p>
      )}

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}