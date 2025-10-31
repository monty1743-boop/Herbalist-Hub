"use client"

import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { AppointmentSummary } from "./AppointmentSummary"
import { TreatmentProgress } from "./TreatmentProgress"
import { HealthGoals } from "./HealthGoals"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Calendar,
  FileText,
  Activity,
  Bell,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"

interface ClientDashboardProps {
  userId: string
}

interface Notification {
  id: string
  type: "appointment" | "message" | "treatment" | "reminder"
  title: string
  message: string
  timestamp: Date
  read: boolean
  priority: "low" | "medium" | "high"
}

export function ClientDashboard({ userId }: ClientDashboardProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [userId])

  const fetchNotifications = async () => {
    try {
      // Mock data for now - replace with actual API call
      setTimeout(() => {
        const mockNotifications: Notification[] = [
          {
            id: "n1",
            type: "appointment",
            title: "Appointment Reminder",
            message: "Your consultation with Dr. Sarah Chen is in 2 days",
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            read: false,
            priority: "high"
          },
          {
            id: "n2",
            type: "message",
            title: "New Message",
            message: "Dr. Chen has sent you your lab results",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            read: false,
            priority: "medium"
          },
          {
            id: "n3",
            type: "treatment",
            title: "Treatment Update",
            message: "Time to log your daily symptom tracking",
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            read: true,
            priority: "low"
          }
        ]
        
        setNotifications(mockNotifications)
        setLoadingNotifications(false)
      }, 300)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setLoadingNotifications(false)
    }
  }

  const unreadNotifications = notifications.filter(n => !n.read)

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary/10 to-blue-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Good morning! 👋
        </h2>
        <p className="text-gray-600">
          Here's your health journey overview for today
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button asChild className="h-20 flex-col gap-2">
          <Link href="/messages">
            <MessageSquare className="h-6 w-6" />
            <span className="text-sm">Send Message</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-20 flex-col gap-2">
          <Link href="/appointments/book">
            <Calendar className="h-6 w-6" />
            <span className="text-sm">Book Appointment</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-20 flex-col gap-2">
          <Link href="/history">
            <FileText className="h-6 w-6" />
            <span className="text-sm">View History</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-20 flex-col gap-2">
          <Link href="/goals">
            <Activity className="h-6 w-6" />
            <span className="text-sm">Health Goals</span>
          </Link>
        </Button>
      </div>

      {/* Notifications */}
      {unreadNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Notifications
              {unreadNotifications.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadNotifications.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingNotifications ? (
              <LoadingSpinner size="sm" />
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      !notification.read ? "bg-primary/5 border-primary/20" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {notification.type === "appointment" && (
                        <Calendar className="h-4 w-4 text-blue-600" />
                      )}
                      {notification.type === "message" && (
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      )}
                      {notification.type === "treatment" && (
                        <Activity className="h-4 w-4 text-purple-600" />
                      )}
                      {notification.type === "reminder" && (
                        <Clock className="h-4 w-4 text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <AppointmentSummary userId={userId} limit={2} />
          <HealthGoals userId={userId} limit={3} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <TreatmentProgress userId={userId} />
        </div>
      </div>
    </div>
  )
}