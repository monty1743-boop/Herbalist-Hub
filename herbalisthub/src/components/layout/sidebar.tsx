"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Home, 
  Package, 
  Users, 
  Calendar, 
  FlaskConical, 
  BarChart3,
  Settings,
  FileText,
  MessageSquare,
  Shield,
  CreditCard,
  Bell
} from "lucide-react"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  if (!session) {
    return null
  }

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      roles: ["ADMIN", "HERBALIST", "CLIENT"],
      description: "Overview and quick actions"
    },
    {
      name: "Inventory",
      href: "/inventory",
      icon: Package,
      roles: ["ADMIN", "HERBALIST"],
      description: "Manage herbs and supplies"
    },
    {
      name: "Clients",
      href: "/clients",
      icon: Users,
      roles: ["ADMIN", "HERBALIST"],
      description: "Client profiles and records"
    },
    {
      name: "Appointments",
      href: "/appointments",
      icon: Calendar,
      roles: ["ADMIN", "HERBALIST", "CLIENT"],
      description: "Schedule and manage appointments"
    },
    {
      name: "Formulas",
      href: "/formulas",
      icon: FlaskConical,
      roles: ["ADMIN", "HERBALIST"],
      description: "Custom herbal formulations"
    },
    {
      name: "Consultations",
      href: "/consultations",
      icon: FileText,
      roles: ["ADMIN", "HERBALIST"],
      description: "Notes and session records"
    },
    {
      name: "Messages",
      href: "/messages",
      icon: MessageSquare,
      roles: ["ADMIN", "HERBALIST", "CLIENT"],
      description: "Client communication"
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      roles: ["ADMIN", "HERBALIST"],
      description: "Business insights and reports"
    }
  ]

  const settingsNavigation = [
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      roles: ["ADMIN", "HERBALIST", "CLIENT"],
      description: "Account and preferences"
    },
    {
      name: "Notifications",
      href: "/notifications",
      icon: Bell,
      roles: ["ADMIN", "HERBALIST", "CLIENT"],
      description: "Alerts and reminders"
    },
    {
      name: "Billing",
      href: "/billing",
      icon: CreditCard,
      roles: ["ADMIN", "HERBALIST"],
      description: "Payments and subscriptions"
    },
    {
      name: "Admin",
      href: "/admin",
      icon: Shield,
      roles: ["ADMIN"],
      description: "System administration"
    }
  ]

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => 
    session.user?.role && item.roles.includes(session.user.role as string)
  )
  
  const filteredSettingsNavigation = settingsNavigation.filter(item => 
    session.user?.role && item.roles.includes(session.user.role as string)
  )

  return (
    <div className={cn("pb-12 w-64", className)}>
      <div className="space-y-4 py-4">
        {/* Logo/Brand */}
        <div className="px-3 py-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-md bg-primary" />
            <h2 className="text-lg font-semibold tracking-tight">
              HerbalistHub
            </h2>
          </Link>
        </div>

        {/* Main Navigation */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Navigation
          </h2>
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Button
                  key={item.name}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2",
                    isActive && "bg-muted font-medium"
                  )}
                  asChild
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Settings Navigation */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Settings
          </h2>
          <div className="space-y-1">
            {filteredSettingsNavigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Button
                  key={item.name}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2",
                    isActive && "bg-muted font-medium"
                  )}
                  asChild
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>

        {/* User Info */}
        <div className="px-3 py-2">
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{session.user?.name}</h4>
              <p className="text-xs text-muted-foreground">
                {session.user?.email}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {session.user?.role?.toLowerCase()} Account
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}