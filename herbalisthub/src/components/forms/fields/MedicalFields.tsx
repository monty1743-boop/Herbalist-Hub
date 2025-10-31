"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { 
  Star, 
  AlertCircle, 
  Shield, 
  Plus,
  Minus,
  Heart,
  Thermometer,
  Activity,
  Scale
} from "lucide-react"
import { FormField } from "../FormRenderer"
import { cn } from "@/lib/utils"

interface MedicalFieldProps {
  field: FormField
  value: any
  onChange: (value: any) => void
  error?: string
  disabled?: boolean
}

export function SymptomRatingField({ field, value, onChange, error, disabled }: MedicalFieldProps) {
  const currentValue = value || 0

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
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

      <div className="space-y-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>No symptoms</span>
          <span className="font-medium text-lg">{currentValue}/10</span>
          <span>Severe symptoms</span>
        </div>
        
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
            <Button
              key={rating}
              variant={rating <= currentValue ? "default" : "outline"}
              size="sm"
              className={cn(
                "w-8 h-8 p-0 text-xs",
                rating <= currentValue && rating <= 3 && "bg-green-500 hover:bg-green-600",
                rating <= currentValue && rating >= 4 && rating <= 6 && "bg-yellow-500 hover:bg-yellow-600",
                rating <= currentValue && rating >= 7 && "bg-red-500 hover:bg-red-600"
              )}
              onClick={() => !disabled && onChange(rating)}
              disabled={disabled}
            >
              {rating}
            </Button>
          ))}
        </div>

        {currentValue > 0 && (
          <div className="text-sm">
            <span className="font-medium">
              Severity: {currentValue <= 3 ? "Mild" : currentValue <= 6 ? "Moderate" : "Severe"}
            </span>
          </div>
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
}

export function MedicationField({ field, value, onChange, error, disabled }: MedicalFieldProps) {
  const medications = Array.isArray(value) ? value : []

  const addMedication = () => {
    const newMedication = {
      id: Date.now().toString(),
      name: "",
      dosage: "",
      frequency: "",
      startDate: "",
      endDate: "",
      prescribedBy: "",
      notes: ""
    }
    onChange([...medications, newMedication])
  }

  const updateMedication = (index: number, field: string, newValue: string) => {
    const updated = medications.map((med: any, i: number) =>
      i === index ? { ...med, [field]: newValue } : med
    )
    onChange(updated)
  }

  const removeMedication = (index: number) => {
    const updated = medications.filter((_: any, i: number) => i !== index)
    onChange(updated.length > 0 ? updated : null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
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

      <div className="space-y-3">
        {medications.map((medication: any, index: number) => (
          <Card key={medication.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Medication {index + 1}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMedication(index)}
                className="text-red-500 hover:text-red-700"
                disabled={disabled}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Medication Name</Label>
                <Input
                  placeholder="e.g., Ibuprofen"
                  value={medication.name}
                  onChange={(e) => updateMedication(index, 'name', e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Dosage</Label>
                <Input
                  placeholder="e.g., 400mg"
                  value={medication.dosage}
                  onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Frequency</Label>
                <Input
                  placeholder="e.g., Twice daily"
                  value={medication.frequency}
                  onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Prescribed By</Label>
                <Input
                  placeholder="Doctor's name"
                  value={medication.prescribedBy}
                  onChange={(e) => updateMedication(index, 'prescribedBy', e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Start Date</Label>
                <Input
                  type="date"
                  value={medication.startDate}
                  onChange={(e) => updateMedication(index, 'startDate', e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">End Date (if applicable)</Label>
                <Input
                  type="date"
                  value={medication.endDate}
                  onChange={(e) => updateMedication(index, 'endDate', e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-600">Notes</Label>
              <Textarea
                placeholder="Additional notes about this medication"
                value={medication.notes}
                onChange={(e) => updateMedication(index, 'notes', e.target.value)}
                disabled={disabled}
                rows={2}
              />
            </div>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addMedication}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Medication
        </Button>
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

export function VitalSignsField({ field, value, onChange, error, disabled }: MedicalFieldProps) {
  const vitals = value || {}

  const updateVital = (vitalType: string, newValue: string) => {
    onChange({
      ...vitals,
      [vitalType]: newValue,
      timestamp: new Date().toISOString()
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
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

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <Label className="text-sm font-medium">Blood Pressure</Label>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                placeholder="120"
                value={vitals.systolic || ""}
                onChange={(e) => updateVital('systolic', e.target.value)}
                disabled={disabled}
                className="w-20"
              />
              <span className="text-gray-500">/</span>
              <Input
                placeholder="80"
                value={vitals.diastolic || ""}
                onChange={(e) => updateVital('diastolic', e.target.value)}
                disabled={disabled}
                className="w-20"
              />
              <span className="text-sm text-gray-500">mmHg</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <Label className="text-sm font-medium">Heart Rate</Label>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                placeholder="72"
                value={vitals.heartRate || ""}
                onChange={(e) => updateVital('heartRate', e.target.value)}
                disabled={disabled}
                className="w-20"
              />
              <span className="text-sm text-gray-500">bpm</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-orange-500" />
              <Label className="text-sm font-medium">Temperature</Label>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                placeholder="98.6"
                value={vitals.temperature || ""}
                onChange={(e) => updateVital('temperature', e.target.value)}
                disabled={disabled}
                className="w-20"
              />
              <select
                value={vitals.temperatureUnit || "F"}
                onChange={(e) => updateVital('temperatureUnit', e.target.value)}
                disabled={disabled}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="F">°F</option>
                <option value="C">°C</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-green-500" />
              <Label className="text-sm font-medium">Weight</Label>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                placeholder="150"
                value={vitals.weight || ""}
                onChange={(e) => updateVital('weight', e.target.value)}
                disabled={disabled}
                className="w-20"
              />
              <select
                value={vitals.weightUnit || "lbs"}
                onChange={(e) => updateVital('weightUnit', e.target.value)}
                disabled={disabled}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Additional Notes</Label>
          <Textarea
            placeholder="Any additional vital signs or observations..."
            value={vitals.notes || ""}
            onChange={(e) => updateVital('notes', e.target.value)}
            disabled={disabled}
            rows={2}
          />
        </div>

        {vitals.timestamp && (
          <p className="text-xs text-gray-500">
            Last updated: {new Date(vitals.timestamp).toLocaleString()}
          </p>
        )}
      </Card>

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export function AllergiesField({ field, value, onChange, error, disabled }: MedicalFieldProps) {
  const allergies = Array.isArray(value) ? value : []

  const addAllergy = () => {
    const newAllergy = {
      id: Date.now().toString(),
      allergen: "",
      severity: "",
      reaction: "",
      notes: ""
    }
    onChange([...allergies, newAllergy])
  }

  const updateAllergy = (index: number, field: string, newValue: string) => {
    const updated = allergies.map((allergy: any, i: number) =>
      i === index ? { ...allergy, [field]: newValue } : allergy
    )
    onChange(updated)
  }

  const removeAllergy = (index: number) => {
    const updated = allergies.filter((_: any, i: number) => i !== index)
    onChange(updated.length > 0 ? updated : null)
  }

  const severityOptions = [
    { value: "mild", label: "Mild", color: "text-green-600" },
    { value: "moderate", label: "Moderate", color: "text-yellow-600" },
    { value: "severe", label: "Severe", color: "text-red-600" },
    { value: "life-threatening", label: "Life-threatening", color: "text-red-800" }
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
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

      <div className="space-y-3">
        {allergies.map((allergy: any, index: number) => (
          <Card key={allergy.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Allergy {index + 1}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAllergy(index)}
                className="text-red-500 hover:text-red-700"
                disabled={disabled}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Allergen</Label>
                <Input
                  placeholder="e.g., Peanuts, Penicillin"
                  value={allergy.allergen}
                  onChange={(e) => updateAllergy(index, 'allergen', e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Severity</Label>
                <select
                  value={allergy.severity}
                  onChange={(e) => updateAllergy(index, 'severity', e.target.value)}
                  disabled={disabled}
                  className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background"
                >
                  <option value="">Select severity...</option>
                  {severityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-600">Reaction Description</Label>
              <Textarea
                placeholder="Describe the allergic reaction (e.g., hives, difficulty breathing)"
                value={allergy.reaction}
                onChange={(e) => updateAllergy(index, 'reaction', e.target.value)}
                disabled={disabled}
                rows={2}
              />
            </div>

            <div>
              <Label className="text-xs text-gray-600">Additional Notes</Label>
              <Textarea
                placeholder="Any additional information about this allergy"
                value={allergy.notes}
                onChange={(e) => updateAllergy(index, 'notes', e.target.value)}
                disabled={disabled}
                rows={2}
              />
            </div>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addAllergy}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Allergy
        </Button>
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