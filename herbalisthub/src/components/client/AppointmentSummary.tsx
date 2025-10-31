"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow, format } from "date-fns"

interface AppointmentSummaryProps {
  userId: string
  limit?: number
}

interface Appointment {
  id: string
  title: string
  description?: string
  practitioner: {
    id: string
    name: string
    title: string
    image?: string
  }
  scheduledAt: Date
  duration: number
  type: "in_person" | "virtual" | "phone"
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show"
  location?: string
  meetingLink?: string
  preparationInstructions?: string
  formulas?: string[]
  notes?: string
}

export function AppointmentSummary({ userId, limit = 3 }: AppointmentSummaryProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAppointments()
  }, [userId])

  const fetchAppointments = async () => {
    try {
      // Mock data for now - replace with actual API call
      setTimeout(() => {
        const mockAppointments: Appointment[] = [
          {
            id: "1",
            title: "Follow-up Consultation",
            description: "Review progress and adjust treatment plan",
            practitioner: {
              id: "dr1",
              name: "Dr. Sarah Chen",
              title: "Licensed Herbalist",
              image: "/avatars/dr-chen.jpg"
            },
            scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            duration: 60,
            type: "virtual",
            status: "confirmed",
            meetingLink: "https://meet.example.com/abc123",
            preparationInstructions: "Please have your symptom journal ready and note any changes since our last session.",
            formulas: ["Digestive Harmony Blend", "Energy Support Formula"]
          },
          {
            id: "2",
            title: "Initial Consultation",
            description: "Comprehensive health assessment",
            practitioner: {
              id: "dr2",
              name: "Dr. Michael Torres",
              title: "Clinical Herbalist",
              image: "/avatars/dr-torres.jpg"
            },
            scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            duration: 90,
            type: "in_person",
            status: "scheduled",
            location: "123 Wellness Ave, Suite 200",
            preparationInstructions: "Please bring your medical history and current medications list."
          }
        ]
        
        setAppointments(mockAppointments.slice(0, limit))
        setLoading(false)
      }, 500)
    } catch (error) {
      console.error("Error fetching appointments:", error)
      setLoading(false)
    }
  }

  const getAppointmentIcon = (type: string) => {
    switch (type) {
      case "virtual":
        return <Video className="h-4 w-4" />
      case "phone":
        return <Phone className="h-4 w-4" />
      default:
        return <MapPin className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-50 text-green-700 border-green-200"
      case "scheduled":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "completed":
        return "bg-gray-50 text-gray-700 border-gray-200"
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const isUpcoming = (date: Date) => {
    return date > new Date()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner size="md" text="Loading appointments..." />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Appointments
            </CardTitle>
            <CardDescription>
              Your scheduled consultations and check-ins
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/appointments">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="border rounded-lg p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{appointment.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      with {appointment.practitioner.name}, {appointment.practitioner.title}
                    </p>
                  </div>
                  <Badge className={getStatusColor(appointment.status)}>
                    {appointment.status.replace("_", " ")}
                  </Badge>
                </div>

                {/* Date and Time */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(appointment.scheduledAt, "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(appointment.scheduledAt, "h:mm a")} 
                      ({appointment.duration} min)
                    </span>
                  </div>
                </div>

                {/* Location/Method */}
                <div className="flex items-center gap-2 text-sm">
                  {getAppointmentIcon(appointment.type)}
                  <span className="capitalize">{appointment.type.replace("_", " ")}</span>
                  {appointment.location && (
                    <span className="text-muted-foreground">• {appointment.location}</span>
                  )}
                </div>

                {/* Time Until */}
                {isUpcoming(appointment.scheduledAt) && (
                  <div className="flex items-center gap-1 text-sm text-primary">
                    <Clock className="h-4 w-4" />
                    <span>{formatDistanceToNow(appointment.scheduledAt, { addSuffix: true })}</span>
                  </div>
                )}

                {/* Preparation Instructions */}
                {appointment.preparationInstructions && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Preparation</p>
                        <p className="text-sm text-blue-700">{appointment.preparationInstructions}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Related Formulas */}
                {appointment.formulas && appointment.formulas.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Related Formulas:</p>
                    <div className="flex flex-wrap gap-2">
                      {appointment.formulas.map((formula, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {formula}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {appointment.meetingLink && isUpcoming(appointment.scheduledAt) && (
                    <Button asChild size="sm">
                      <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer">
                        Join Meeting
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/appointments/${appointment.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No upcoming appointments</h3>
            <p className="text-muted-foreground mb-4">
              Schedule your next consultation to continue your health journey
            </p>
            <Button asChild>
              <Link href="/appointments/book">
                <Plus className="h-4 w-4 mr-2" />
                Book Appointment
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}