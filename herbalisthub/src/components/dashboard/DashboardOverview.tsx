"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Calendar, 
  FileText, 
  Package, 
  BarChart3, 
  Bell,
  ArrowRight,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle
} from "lucide-react"

export function DashboardOverview() {
  const { data: session } = useSession()
  const userRole = session?.user?.role as string

  // Quick action cards based on user role
  const getQuickActions = () => {
    const actions = [
      {
        title: "Clients",
        description: "Manage your client base",
        href: "/dashboard/clients", 
        icon: Users,
        count: "24",
        roles: ["HERBALIST", "ADMIN"]
      },
      {
        title: "Appointments",
        description: "Schedule and manage appointments",
        href: "/dashboard/appointments",
        icon: Calendar,
        count: "3 today",
        roles: ["HERBALIST", "ADMIN"]
      },
      {
        title: "Treatment Plans",
        description: "Create and track treatment plans",
        href: "/dashboard/treatment-plans",
        icon: FileText,
        count: "8 active",
        roles: ["HERBALIST", "ADMIN"]
      },
      {
        title: "Herb Inventory",
        description: "Manage your herbal inventory",
        href: "/dashboard/inventory",
        icon: Package,
        count: "156 items",
        roles: ["HERBALIST", "ADMIN"]
      },
      {
        title: "Analytics",
        description: "View practice analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        count: "View Reports",
        roles: ["HERBALIST", "ADMIN"]
      }
    ]

    return actions.filter(action => 
      !action.roles || action.roles.includes(userRole)
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Welcome back, {session?.user?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening with your practice today.
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              +2 from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +3 this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Treatment Plans</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              2 need review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Alerts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              Low stock items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks for your practice management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getQuickActions().map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{action.title}</p>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="font-normal">
                      {action.count}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your practice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex h-2 w-2 mt-2 bg-green-500 rounded-full" />
              <div className="space-y-1">
                <p className="text-sm font-medium">New appointment scheduled</p>
                <p className="text-xs text-muted-foreground">Sarah Johnson - Initial consultation</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex h-2 w-2 mt-2 bg-blue-500 rounded-full" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Treatment plan updated</p>
                <p className="text-xs text-muted-foreground">Mike Chen - Digestive support protocol</p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex h-2 w-2 mt-2 bg-orange-500 rounded-full" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Low inventory alert</p>
                <p className="text-xs text-muted-foreground">Echinacea tincture - Only 3 bottles remaining</p>
                <p className="text-xs text-muted-foreground">6 hours ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex h-2 w-2 mt-2 bg-purple-500 rounded-full" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Formula created</p>
                <p className="text-xs text-muted-foreground">New custom blend for stress support</p>
                <p className="text-xs text-muted-foreground">Yesterday</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
            <CardDescription>
              Items that need your attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-blue-500" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Consultation prep</p>
                <p className="text-xs text-muted-foreground">Review Sarah Johnson's intake form</p>
              </div>
              <Badge variant="outline" className="text-xs">
                Due 2pm
              </Badge>
            </div>

            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Inventory reorder</p>
                <p className="text-xs text-muted-foreground">5 herbs below minimum stock</p>
              </div>
              <Badge variant="destructive" className="text-xs">
                Urgent
              </Badge>
            </div>

            <div className="flex items-center space-x-3">
              <FileText className="h-4 w-4 text-green-500" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Treatment plan review</p>
                <p className="text-xs text-muted-foreground">2 plans due for update this week</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                This week
              </Badge>
            </div>

            <div className="flex items-center space-x-3">
              <Bell className="h-4 w-4 text-purple-500" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Follow-up reminders</p>
                <p className="text-xs text-muted-foreground">Send check-in messages to 3 clients</p>
              </div>
              <Badge variant="outline" className="text-xs">
                Tomorrow
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Practice Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Practice Insights</CardTitle>
            <CardDescription>
              Performance metrics for this month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Client Satisfaction</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">98%</div>
                <p className="text-xs text-muted-foreground">+5% from last month</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Appointments Completed</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">47</div>
                <p className="text-xs text-muted-foreground">12% increase</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">New Clients</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">8</div>
                <p className="text-xs text-muted-foreground">3 referrals</p>
              </div>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard/analytics">
                View Detailed Analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}