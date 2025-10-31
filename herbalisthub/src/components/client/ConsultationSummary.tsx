"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Pill,
  Clock,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  Plus,
  Minus,
  Edit
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface ConsultationSummaryProps {
  consultation: {
    id: string
    type: "initial" | "follow_up" | "check_in" | "urgent"
    duration: number
    notes: string
    symptoms: string[]
    recommendations: string[]
    formulas: Array<{
      id: string
      name: string
      action: "added" | "modified" | "discontinued"
      dosage?: string
      instructions?: string
    }>
    nextSteps: string[]
    followUpDate?: Date
  }
  showActions?: boolean
}

export function ConsultationSummary({ consultation, showActions = true }: ConsultationSummaryProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case "added":
        return <Plus className="h-4 w-4 text-green-600" />
      case "modified":
        return <Edit className="h-4 w-4 text-blue-600" />
      case "discontinued":
        return <Minus className="h-4 w-4 text-red-600" />
      default:
        return <Pill className="h-4 w-4 text-gray-600" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "added":
        return "bg-green-50 text-green-700 border-green-200"
      case "modified":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "discontinued":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getConsultationType = (type: string) => {
    switch (type) {
      case "initial":
        return { label: "Initial Consultation", color: "bg-blue-50 text-blue-700" }
      case "follow_up":
        return { label: "Follow-up", color: "bg-green-50 text-green-700" }
      case "check_in":
        return { label: "Check-in", color: "bg-purple-50 text-purple-700" }
      case "urgent":
        return { label: "Urgent Consultation", color: "bg-red-50 text-red-700" }
      default:
        return { label: "Consultation", color: "bg-gray-50 text-gray-700" }
    }
  }

  const consultationType = getConsultationType(consultation.type)

  return (
    <div className="space-y-6">
      {/* Consultation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={consultationType.color}>
            {consultationType.label}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{consultation.duration} minutes</span>
          </div>
        </div>
        {showActions && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/consultations/${consultation.id}`}>
              <FileText className="h-4 w-4 mr-2" />
              Full Details
            </Link>
          </Button>
        )}
      </div>

      {/* Consultation Notes */}
      <div className="bg-white/50 rounded-lg p-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Consultation Notes
        </h4>
        <p className="text-sm text-gray-600 leading-relaxed">{consultation.notes}</p>
      </div>

      {/* Symptoms Discussed */}
      {consultation.symptoms.length > 0 && (
        <div className="bg-white/50 rounded-lg p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            Symptoms Discussed
          </h4>
          <ul className="space-y-2">
            {consultation.symptoms.map((symptom, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-orange-600 mt-1">•</span>
                <span className="text-gray-700">{symptom}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Formula Changes */}
      {consultation.formulas.length > 0 && (
        <div className="bg-white/50 rounded-lg p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Pill className="h-4 w-4 text-green-600" />
            Formula Changes
          </h4>
          <div className="space-y-3">
            {consultation.formulas.map((formula, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{formula.name}</p>
                    {formula.dosage && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Dosage:</span> {formula.dosage}
                      </p>
                    )}
                    {formula.instructions && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Instructions:</span> {formula.instructions}
                      </p>
                    )}
                  </div>
                  <Badge className={`${getActionColor(formula.action)} flex items-center gap-1`}>
                    {getActionIcon(formula.action)}
                    {formula.action}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {consultation.recommendations.length > 0 && (
        <div className="bg-white/50 rounded-lg p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            Recommendations
          </h4>
          <ul className="space-y-2">
            {consultation.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      {consultation.nextSteps.length > 0 && (
        <div className="bg-white/50 rounded-lg p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            Next Steps
          </h4>
          <ul className="space-y-2">
            {consultation.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-purple-600 mt-1">•</span>
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-up Date */}
      {consultation.followUpDate && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary">Next Follow-up Scheduled</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {format(consultation.followUpDate, "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      )}
    </div>
  )
}