"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Activity,
  User,
  Calendar,
  FileText,
  Package,
  MessageSquare,
  Bell,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ActivityItem {
  id: string
  type: "appointment" | "client" | "treatment_plan" | "inventory" | "message" | "system" | "formula"
  title: string
  description: string
  timestamp: string
  actor?: {
    name: string
    avatar?: string
    role?: string
  }
  relatedEntity?: {
    id: string
    name: string
    type: string
  }
  priority: "low" | "normal" | "high"
  status?: "success" | "warning" | "error" | "info"
  actionUrl?: string
}

const mockActivityData: ActivityItem[] = [
  {
    id: "1",
    type: "appointment",
    title: "New appointment scheduled",
    description: "Initial consultation for stress management",
    timestamp: "2024-10-31T12:30:00Z",
    actor: {
      name: "Sarah Johnson",
      role: "Client"
    },
    relatedEntity: {
      id: "apt-123",
      name: "Initial Consultation",
      type: "appointment"
    },
    priority: "normal",
    status: "success",
    actionUrl: "/dashboard/appointments/apt-123"
  },
  {
    id: "2",
    type: "treatment_plan",
    title: "Treatment plan updated",
    description: "Digestive support protocol modified with new herbs",
    timestamp: "2024-10-31T10:15:00Z",
    actor: {
      name: "Dr. Emily Carter",
      role: "Herbalist"
    },
    relatedEntity: {
      id: "tp-456",
      name: "Mike Chen - Digestive Support",
      type: "treatment_plan"
    },
    priority: "normal",
    status: "info",
    actionUrl: "/dashboard/treatment-plans/tp-456"
  },
  {
    id: "3",
    type: "inventory",
    title: "Low inventory alert",
    description: "Echinacea tincture stock is running low - only 2 bottles remaining",
    timestamp: "2024-10-31T09:45:00Z",
    relatedEntity: {
      id: "inv-789",
      name: "Echinacea Tincture",
      type: "inventory"
    },
    priority: "high",
    status: "warning",
    actionUrl: "/dashboard/inventory/inv-789"
  },
  {
    id: "4",
    type: "formula",
    title: "New formula created",
    description: "Custom stress support blend for anxiety management",
    timestamp: "2024-10-30T16:20:00Z",
    actor: {
      name: "Dr. Emily Carter",
      role: "Herbalist"
    },
    relatedEntity: {
      id: "form-101",
      name: "Stress Relief Blend",
      type: "formula"
    },
    priority: "normal",
    status: "success",
    actionUrl: "/dashboard/formulas/form-101"
  },
  {
    id: "5",
    type: "client",
    title: "New client registered",
    description: "David Wilson completed intake form and scheduled initial consultation",
    timestamp: "2024-10-30T14:30:00Z",
    actor: {
      name: "David Wilson",
      role: "Client"
    },
    relatedEntity: {
      id: "client-202",
      name: "David Wilson",
      type: "client"
    },
    priority: "normal",
    status: "success",
    actionUrl: "/dashboard/clients/client-202"
  },
  {
    id: "6",
    type: "message",
    title: "New message received",
    description: "Question about herb interactions from Lisa Park",
    timestamp: "2024-10-30T11:45:00Z",
    actor: {
      name: "Lisa Park",
      role: "Client"
    },
    relatedEntity: {
      id: "msg-303",
      name: "Herb Interaction Question",
      type: "message"
    },
    priority: "normal",
    status: "info",
    actionUrl: "/dashboard/messages/msg-303"
  },
  {
    id: "7",
    type: "system",
    title: "Backup completed successfully",
    description: "Automated weekly backup of patient data completed",
    timestamp: "2024-10-30T02:00:00Z",
    priority: "low",
    status: "success"
  },
  {
    id: "8",
    type: "appointment",
    title: "Appointment completed",
    description: "Follow-up consultation with Emma Rodriguez finished",
    timestamp: "2024-10-29T15:30:00Z",
    actor: {
      name: "Emma Rodriguez",
      role: "Client"
    },
    relatedEntity: {
      id: "apt-404",
      name: "Follow-up Consultation",
      type: "appointment"
    },
    priority: "normal",
    status: "success",
    actionUrl: "/dashboard/appointments/apt-404"
  }
]

export function RecentActivityWidget() {
  const [filter, setFilter] = useState<"all" | "today" | "appointments" | "inventory" | "clients">("all")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const filteredActivity = mockActivityData.filter(item => {
    switch (filter) {
      case "today":
        return item.timestamp.startsWith(today)
      case "appointments":
        return item.type === "appointment"
      case "inventory":
        return item.type === "inventory"
      case "clients":
        return item.type === "client"
      default:
        return true
    }
  })

  const getActivityIcon = (type: string, status?: string) => {
    const iconClass = "h-4 w-4"
    switch (type) {
      case "appointment":
        return <Calendar className={iconClass} />
      case "client":
        return <User className={iconClass} />
      case "treatment_plan":
        return <FileText className={iconClass} />
      case "inventory":
        return <Package className={iconClass} />
      case "message":
        return <MessageSquare className={iconClass} />
      case "formula":
        return <Package className={iconClass} />
      case "system":
        return <Activity className={iconClass} />
      default:
        return <Bell className={iconClass} />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "success": return "bg-green-100 border-green-200"
      case "warning": return "bg-yellow-100 border-yellow-200"
      case "error": return "bg-red-100 border-red-200"
      case "info": return "bg-blue-100 border-blue-200"
      default: return "bg-gray-100 border-gray-200"
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "success": return <CheckCircle className="h-3 w-3 text-green-600" />
      case "warning": return <AlertCircle className="h-3 w-3 text-yellow-600" />
      case "error": return <AlertCircle className="h-3 w-3 text-red-600" />
      case "info": return <Activity className="h-3 w-3 text-blue-600" />
      default: return <Clock className="h-3 w-3 text-gray-600" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return `${diffInMinutes} minutes ago`
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays} days ago`
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const todayCount = mockActivityData.filter(item => item.timestamp.startsWith(today)).length
  const appointmentCount = mockActivityData.filter(item => item.type === "appointment").length
  const inventoryCount = mockActivityData.filter(item => item.type === "inventory").length
  const clientCount = mockActivityData.filter(item => item.type === "client").length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest updates and events in your practice
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
              <Link href="/dashboard/activity">
                <ExternalLink className="h-4 w-4 mr-1" />
                View All
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 pt-2 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({mockActivityData.length})
          </Button>
          <Button
            variant={filter === "today" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("today")}
          >
            Today ({todayCount})
          </Button>
          <Button
            variant={filter === "appointments" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("appointments")}
          >
            Appointments ({appointmentCount})
          </Button>
          <Button
            variant={filter === "inventory" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("inventory")}
          >
            Inventory ({inventoryCount})
          </Button>
          <Button
            variant={filter === "clients" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("clients")}
          >
            Clients ({clientCount})
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {filteredActivity.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No activity found for the selected filter</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredActivity.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 p-3 border rounded-lg transition-colors",
                  getStatusColor(item.status),
                  item.actionUrl && "hover:bg-muted/50 cursor-pointer"
                )}
                onClick={() => item.actionUrl && window.open(item.actionUrl, '_self')}
              >
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border",
                  getStatusColor(item.status)
                )}>
                  {getActivityIcon(item.type, item.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.status && getStatusIcon(item.status)}
                    {item.priority === "high" && (
                      <Badge variant="destructive" className="text-xs">
                        High Priority
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-2">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(item.timestamp)}
                    </span>
                    
                    {item.actor && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.actor.name}
                        {item.actor.role && ` (${item.actor.role})`}
                      </span>
                    )}

                    {item.relatedEntity && (
                      <span className="truncate">
                        Related: {item.relatedEntity.name}
                      </span>
                    )}
                  </div>
                </div>

                {item.actionUrl && (
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {filteredActivity.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {filteredActivity.length} of {mockActivityData.length} activities
              </span>
              {mockActivityData.length > filteredActivity.length && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/activity">
                    View All Activity
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}