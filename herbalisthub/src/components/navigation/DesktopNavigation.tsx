"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  Home,
  Users,
  Calendar,
  FileText,
  Package,
  Settings,
  BarChart3,
  Stethoscope,
  Shield,
  Bell,
  MessageSquare,
  Leaf,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
  badge?: string
  category?: "main" | "admin"
}

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home, category: "main" },
  { name: "Clients", href: "/dashboard/clients", icon: Users, roles: ["HERBALIST", "ADMIN"], category: "main" },
  { name: "Appointments", href: "/dashboard/appointments", icon: Calendar, roles: ["HERBALIST", "ADMIN"], badge: "3", category: "main" },
  { name: "Consultations", href: "/dashboard/consultations", icon: Stethoscope, roles: ["HERBALIST", "ADMIN"], category: "main" },
  { name: "Treatment Plans", href: "/dashboard/treatment-plans", icon: FileText, roles: ["HERBALIST", "ADMIN"], category: "main" },
  { name: "Herb Inventory", href: "/dashboard/inventory", icon: Leaf, roles: ["HERBALIST", "ADMIN"], badge: "5", category: "main" },
  { name: "Formulas", href: "/dashboard/formulas", icon: Package, roles: ["HERBALIST", "ADMIN"], category: "main" },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: "3", category: "main" },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, roles: ["HERBALIST", "ADMIN"], category: "main" },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: "5", category: "main" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, category: "main" },
  // Admin items
  { name: "Admin Panel", href: "/admin", icon: Shield, roles: ["ADMIN"], category: "admin" },
  { name: "User Management", href: "/admin/users", icon: Users, roles: ["ADMIN"], category: "admin" },
  { name: "System Settings", href: "/admin/settings", icon: Settings, roles: ["ADMIN"], category: "admin" },
  { name: "Audit Logs", href: "/admin/audit-logs", icon: FileText, roles: ["ADMIN"], category: "admin" },
]

interface DesktopNavigationProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function DesktopNavigation({ isCollapsed, onToggleCollapse }: DesktopNavigationProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = session?.user?.role as string

  const hasRole = (roles?: string[]) => {
    if (!roles) return true
    return roles.includes(userRole)
  }

  const filteredNavigation = navigation.filter(item => hasRole(item.roles))
  const mainNavigation = filteredNavigation.filter(item => item.category === "main")
  const adminNavigation = filteredNavigation.filter(item => item.category === "admin")

  const NavigationItem = ({ item }: { item: NavigationItem }) => {
    const isActive = pathname === item.href || 
      (item.href !== "/dashboard" && item.href !== "/admin" && pathname.startsWith(item.href))
    
    const Icon = item.icon
    const isAdminItem = item.category === "admin"

    const content = (
      <Link
        href={item.href}
        className={cn(
          "group flex items-center gap-x-3 rounded-lg p-2 text-sm leading-6 font-medium transition-all duration-200",
          isActive
            ? isAdminItem
              ? "bg-red-50 text-red-700 shadow-sm"
              : "bg-green-50 text-green-700 shadow-sm"
            : "text-gray-700 hover:text-green-700 hover:bg-green-50",
          isCollapsed && "justify-center px-2"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            isActive 
              ? isAdminItem 
                ? "text-red-600" 
                : "text-green-600"
              : "text-gray-400 group-hover:text-green-600"
          )}
        />
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{item.name}</span>
            {item.badge && (
              <Badge 
                variant={isActive ? "default" : "secondary"}
                className="ml-auto text-xs"
              >
                {item.badge}
              </Badge>
            )}
          </>
        )}
        {isCollapsed && item.badge && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs font-medium text-white flex items-center justify-center">
            {item.badge}
          </span>
        )}
      </Link>
    )

    if (isCollapsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                {content}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-2">
              <span>{item.name}</span>
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return content
  }

  return (
    <div className={cn(
      "fixed inset-y-0 z-50 flex flex-col bg-white shadow-xl transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-72"
    )}>
      {/* Logo Section */}
      <div className={cn(
        "flex h-16 shrink-0 items-center border-b border-gray-200 px-4",
        isCollapsed && "justify-center px-2"
      )}>
        <Link href="/dashboard" className={cn(
          "flex items-center transition-all duration-200",
          isCollapsed ? "space-x-0" : "space-x-2"
        )}>
          <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold text-gray-900 whitespace-nowrap">
              HerbalistHub
            </span>
          )}
        </Link>
      </div>

      {/* Navigation Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Main Navigation */}
            <div>
              {!isCollapsed && (
                <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Main
                </div>
              )}
              <ul className="space-y-1">
                {mainNavigation.map((item) => (
                  <li key={item.name}>
                    <NavigationItem item={item} />
                  </li>
                ))}
              </ul>
            </div>

            {/* Admin Navigation */}
            {adminNavigation.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                {!isCollapsed && (
                  <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Administration
                  </div>
                )}
                <ul className="space-y-1">
                  {adminNavigation.map((item) => (
                    <li key={item.name}>
                      <NavigationItem item={item} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-gray-200 p-4">
          {isCollapsed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-green-600">
                        {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div>
                    <p className="font-medium">{session?.user?.name || "User"}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {userRole?.toLowerCase() || "user"}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="flex items-center gap-x-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-sm font-medium text-green-600">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {userRole?.toLowerCase() || "user"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <div className="border-t border-gray-200 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className={cn(
              "w-full flex items-center justify-center",
              !isCollapsed && "justify-start gap-2"
            )}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!isCollapsed && <span className="text-sm">Collapse</span>}
          </Button>
        </div>
      </div>
    </div>
  )
}