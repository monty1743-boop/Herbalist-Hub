"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Phone,
  User,
  Plus,
  ExternalLink,
  RefreshCw,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Appointment {
  id: string
  clientName: string
  clientAvatar?: string
  appointmentType: "initial" | "follow-up" | "phone" | "video" | "group"
  date: string
  time: string
  duration: number
  location?: string
  isVirtual: boolean
  status: "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled"
  notes?: string
  clientPhone?: string
  clientEmail?: string
  priority: "normal" | "high" | "urgent"
  isNewClient: boolean
}

const mockAppointments: Appointment[] = [
  {
    id: "1",
    clientName: "Sarah Johnson",
    appointmentType: "initial",
    date: "2024-10-31",
    time: "14:00",
    duration: 90,
    location: "Office - Room 1",
    isVirtual: false,
    status: "confirmed",
    notes: "First consultation, stress and anxiety concerns",
    clientPhone: "(555) 123-4567",
    clientEmail: "sarah.johnson@email.com",
    priority: "normal",
    isNewClient: true
  },
  {
    id: "2",
    clientName: "Mike Chen",
    appointmentType: "follow-up",
    date: "2024-10-31",
    time: "16:30",
    duration: 60,
    isVirtual: true,
    status: "scheduled",
    notes: "Follow-up on digestive protocol, check progress",
    clientPhone: "(555) 987-6543",
    clientEmail: "mike.chen@email.com",
    priority: "normal",
    isNewClient: false
  },
  {
    id: "3",
    clientName: "Emma Rodriguez",
    appointmentType: "phone",
    date: "2024-11-01",
    time: "09:00",
    duration: 30,
    isVirtual: true,
    status: "confirmed",
    notes: "Quick check-in on sleep formula",
    clientPhone: "(555) 456-7890",
    priority: "normal",
    isNewClient: false
  },
  {
    id: "4",
    clientName: "David Wilson",
    appointmentType: "initial",
    date: "2024-11-01",
    time: "11:00",
    duration: 90,
    location: "Office - Room 2",
    isVirtual: false,
    status: "scheduled",
    notes: "Chronic fatigue, referred by Dr. Smith",
    clientPhone: "(555) 321-0987",
    priority: "high",
    isNewClient: true
  },
  {
    id: "5",
    clientName: "Lisa Park",
    appointmentType: "follow-up",
    date: "2024-11-01",
    time: "15:00",
    duration: 60,
    isVirtual: true,
    status: "confirmed",
    notes: "Hormonal balance protocol review",
    clientPhone: "(555) 567-8901",
    priority: "normal",
    isNewClient: false
  }
]

export function UpcomingAppointmentsWidget() {
  const [filter, setFilter] = useState<"today" | "tomorrow" | "week">("today")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const filteredAppointments = mockAppointments.filter(appointment => {
    switch (filter) {
      case "today":
        return appointment.date === today
      case "tomorrow":
        return appointment.date === tomorrow
      case "week":
        return appointment.date <= weekFromNow
      default:
        return true
    }
  })

  const getTypeIcon = (type: string, isVirtual: boolean) => {
    if (isVirtual) {
      return type === "phone" ? <Phone className="h-4 w-4" /> : <Video className="h-4 w-4" />
    }
    return <MapPin className="h-4 w-4" />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800"
      case "scheduled": return "bg-blue-100 text-blue-800"
      case "in-progress": return "bg-yellow-100 text-yellow-800"
      case "completed": return "bg-gray-100 text-gray-800"
      case "cancelled": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityIndicator = (priority: string) => {
    if (priority === "high") return "border-l-4 border-l-orange-500"
    if (priority === "urgent") return "border-l-4 border-l-red-500"
    return ""
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDate = (date: string) => {
    const appointmentDate = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    if (date === today.toISOString().split('T')[0]) return "Today"
    if (date === tomorrow.toISOString().split('T')[0]) return "Tomorrow"
    
    return appointmentDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const todayCount = mockAppointments.filter(apt => apt.date === today).length
  const tomorrowCount = mockAppointments.filter(apt => apt.date === tomorrow).length
  const weekCount = mockAppointments.filter(apt => apt.date <= weekFromNow).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Upcoming Appointments
            </CardTitle>
            <CardDescription>
              Your scheduled consultations and meetings
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/appointments">
                <ExternalLink className="h-4 w-4 mr-1" />
                View All
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 pt-2">
          <Button
            variant={filter === "today" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("today")}
          >
            Today ({todayCount})
          </Button>
          <Button
            variant={filter === "tomorrow" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("tomorrow")}
          >
            Tomorrow ({tomorrowCount})
          </Button>
          <Button
            variant={filter === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("week")}
          >
            This Week ({weekCount})
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No appointments {filter === "today" ? "today" : filter === "tomorrow" ? "tomorrow" : "this week"}</p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link href="/dashboard/appointments/new">
                <Plus className="h-4 w-4 mr-1" />
                Schedule Appointment
              </Link>
            </Button>
          </div>
        ) : (
          filteredAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className={cn(
                "flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors",
                getPriorityIndicator(appointment.priority)
              )}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={appointment.clientAvatar} />
                <AvatarFallback>
                  {appointment.clientName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm truncate">
                    {appointment.clientName}
                  </p>
                  {appointment.isNewClient && (
                    <Badge variant="secondary" className="text-xs">
                      New Client
                    </Badge>
                  )}
                  {appointment.priority === "high" && (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  )}
                  {appointment.priority === "urgent" && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(appointment.date)} at {formatTime(appointment.time)}
                  </span>
                  <span className="flex items-center gap-1">
                    {getTypeIcon(appointment.appointmentType, appointment.isVirtual)}
                    {appointment.appointmentType === "phone" ? "Phone" : 
                     appointment.isVirtual ? "Video" : "In-person"}
                  </span>
                  <span>{appointment.duration} min</span>
                </div>

                {appointment.notes && (
                  <p className="text-xs text-muted-foreground truncate mb-1">
                    {appointment.notes}
                  </p>
                )}

                {appointment.location && !appointment.isVirtual && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {appointment.location}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <Badge 
                  className={cn("text-xs", getStatusColor(appointment.status))}
                  variant="secondary"
                >
                  {appointment.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link href={`/dashboard/appointments/${appointment.id}`}>
                    View
                  </Link>
                </Button>
              </div>
            </div>
          ))
        )}

        {filteredAppointments.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} {
                  filter === "today" ? "today" : filter === "tomorrow" ? "tomorrow" : "this week"
                }
              </span>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/appointments/new">
                  <Plus className="h-4 w-4 mr-1" />
                  New Appointment
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}