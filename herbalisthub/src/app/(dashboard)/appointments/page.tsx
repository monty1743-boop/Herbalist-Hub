"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Calendar, Plus, Search, Filter, Clock, Users, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import Link from "next/link"
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from "date-fns"
import { Role } from "@prisma/client"
import { CalendarView } from "@/components/appointments/CalendarView"
import { AppointmentList } from "@/components/appointments/AppointmentList"
import { AppointmentModal } from "@/components/appointments/AppointmentModal"

interface Appointment {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  duration: number
  type: string
  status: string
  fee?: number
  currency: string
  paymentStatus: string
  location: {
    type: string
    address?: string
    phoneNumber?: string
    videoLink?: string
  }
  client: {
    id: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
  }
  herbalist: {
    id: string
    name: string
    email: string
  }
  notes?: string
  createdAt: string
  updatedAt: string
  _count: {
    consultationNotes: number
  }
}

interface AppointmentStats {
  total: number
  scheduled: number
  completed: number
  cancelled: number
  revenue: number
}

const statusColors = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
  NO_SHOW: "bg-orange-100 text-orange-800",
  RESCHEDULED: "bg-purple-100 text-purple-800",
}

const statusLabels = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  RESCHEDULED: "Rescheduled",
}

export default function AppointmentsPage() {
  const { data: session } = useSession()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"calendar" | "list">("calendar")
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showModal, setShowModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [stats, setStats] = useState<AppointmentStats>({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0,
  })

  useEffect(() => {
    fetchAppointments()
    fetchStats()
  }, [currentWeek, searchQuery, statusFilter, typeFilter])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
      
      const params = new URLSearchParams({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        page: "1",
        limit: "100",
      })

      if (searchQuery) params.append("search", searchQuery)
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (typeFilter !== "all") params.append("type", typeFilter)

      const response = await fetch(`/api/appointments?${params}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch appointments")
      }

      const data = await response.json()
      setAppointments(data.appointments)
    } catch (error) {
      console.error("Error fetching appointments:", error)
      toast.error("Failed to load appointments")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Calculate stats from current appointments
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
      
      const response = await fetch(`/api/appointments?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}&limit=1000`)
      
      if (response.ok) {
        const data = await response.json()
        const allAppointments = data.appointments

        const newStats = {
          total: allAppointments.length,
          scheduled: allAppointments.filter((a: Appointment) => ["SCHEDULED", "CONFIRMED"].includes(a.status)).length,
          completed: allAppointments.filter((a: Appointment) => a.status === "COMPLETED").length,
          cancelled: allAppointments.filter((a: Appointment) => ["CANCELLED", "NO_SHOW"].includes(a.status)).length,
          revenue: allAppointments
            .filter((a: Appointment) => a.status === "COMPLETED" && a.fee)
            .reduce((sum: number, a: Appointment) => sum + (a.fee || 0), 0),
        }

        setStats(newStats)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const handleNewAppointment = () => {
    setSelectedAppointment(null)
    setShowModal(true)
  }

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowModal(true)
  }

  const handleAppointmentSaved = () => {
    setShowModal(false)
    fetchAppointments()
    fetchStats()
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    if (!isSameWeek(date, currentWeek)) {
      setCurrentWeek(date)
    }
  }

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeek(direction === "next" ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1))
  }

  const isSameWeek = (date1: Date, date2: Date) => {
    const start1 = startOfWeek(date1, { weekStartsOn: 1 })
    const start2 = startOfWeek(date2, { weekStartsOn: 1 })
    return start1.getTime() === start2.getTime()
  }

  if (!session) {
    return <div>Please sign in to access appointments.</div>
  }

  if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
    return <div>You don't have permission to access appointment management.</div>
  }

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Week of {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>
            Today
          </Button>
          <Button onClick={handleNewAppointment}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foregreen">Finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">No shows + cancelled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Completed appointments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search appointments by client name or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="INITIAL_CONSULTATION">Initial Consultation</SelectItem>
                  <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                  <SelectItem value="HERBAL_CONSULTATION">Herbal Consultation</SelectItem>
                  <SelectItem value="PHONE_CONSULTATION">Phone Consultation</SelectItem>
                  <SelectItem value="VIDEO_CONSULTATION">Video Consultation</SelectItem>
                </SelectContent>
              </Select>

              <Tabs value={view} onValueChange={(value) => setView(value as "calendar" | "list")}>
                <TabsList>
                  <TabsTrigger value="calendar">Calendar</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {view === "calendar" ? (
            <CalendarView
              appointments={appointments}
              currentWeek={currentWeek}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onNavigateWeek={navigateWeek}
              onAppointmentClick={handleEditAppointment}
              onNewAppointment={handleNewAppointment}
            />
          ) : (
            <AppointmentList
              appointments={appointments}
              onAppointmentClick={handleEditAppointment}
              onStatusUpdate={fetchAppointments}
            />
          )}
        </>
      )}

      {/* Appointment Modal */}
      {showModal && (
        <AppointmentModal
          appointment={selectedAppointment}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleAppointmentSaved}
          selectedDate={selectedDate}
        />
      )}

      {/* Empty State */}
      {!loading && appointments.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "Get started by scheduling your first appointment"}
              </p>
              {!searchQuery && statusFilter === "all" && typeFilter === "all" && (
                <Button onClick={handleNewAppointment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Appointment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}