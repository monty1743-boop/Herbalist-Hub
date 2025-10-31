"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
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
  Leaf
} from "lucide-react"

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
  badge?: string
}

const navigation: NavigationItem[] = [
  { 
    name: "Dashboard", 
    href: "/dashboard", 
    icon: Home 
  },
  { 
    name: "Clients", 
    href: "/dashboard/clients", 
    icon: Users,
    roles: ["HERBALIST", "ADMIN"]
  },
  { 
    name: "Appointments", 
    href: "/dashboard/appointments", 
    icon: Calendar,
    roles: ["HERBALIST", "ADMIN"]
  },
  { 
    name: "Consultations", 
    href: "/dashboard/consultations", 
    icon: Stethoscope,
    roles: ["HERBALIST", "ADMIN"]
  },
  { 
    name: "Treatment Plans", 
    href: "/dashboard/treatment-plans", 
    icon: FileText,
    roles: ["HERBALIST", "ADMIN"]
  },
  { 
    name: "Herb Inventory", 
    href: "/dashboard/inventory", 
    icon: Leaf,
    roles: ["HERBALIST", "ADMIN"]
  },
  { 
    name: "Formulas", 
    href: "/dashboard/formulas", 
    icon: Package,
    roles: ["HERBALIST", "ADMIN"]
  },
  { 
    name: "Messages", 
    href: "/dashboard/messages", 
    icon: MessageSquare,
    badge: "3"
  },
  { 
    name: "Analytics", 
    href: "/dashboard/analytics", 
    icon: BarChart3,
    roles: ["HERBALIST", "ADMIN"]
  },
  { 
    name: "Notifications", 
    href: "/dashboard/notifications", 
    icon: Bell,
    badge: "5"
  },
  { 
    name: "Settings", 
    href: "/dashboard/settings", 
    icon: Settings 
  },
]

const adminNavigation: NavigationItem[] = [
  { 
    name: "Admin Panel", 
    href: "/admin", 
    icon: Shield,
    roles: ["ADMIN"]
  },
  { 
    name: "User Management", 
    href: "/admin/users", 
    icon: Users,
    roles: ["ADMIN"]
  },
  { 
    name: "System Settings", 
    href: "/admin/settings", 
    icon: Settings,
    roles: ["ADMIN"]
  },
  { 
    name: "Audit Logs", 
    href: "/admin/audit-logs", 
    icon: FileText,
    roles: ["ADMIN"]
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = session?.user?.role as string

  const hasRole = (roles?: string[]) => {
    if (!roles) return true
    return roles.includes(userRole)
  }

  const filteredNavigation = navigation.filter(item => hasRole(item.roles))
  const filteredAdminNavigation = adminNavigation.filter(item => hasRole(item.roles))

  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-lg">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">HerbalistHub</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== "/dashboard" && pathname.startsWith(item.href))
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        isActive
                          ? "bg-green-50 text-green-700 border-r-2 border-green-600"
                          : "text-gray-700 hover:text-green-700 hover:bg-green-50",
                        "group flex gap-x-3 rounded-l-md p-2 text-sm leading-6 font-medium transition-colors"
                      )}
                    >
                      <item.icon
                        className={cn(
                          isActive ? "text-green-600" : "text-gray-400 group-hover:text-green-600",
                          "h-5 w-5 shrink-0"
                        )}
                      />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span className={cn(
                          isActive 
                            ? "bg-green-600 text-white" 
                            : "bg-gray-100 text-gray-600 group-hover:bg-green-100 group-hover:text-green-700",
                          "ml-auto w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </li>

          {/* Admin Section */}
          {filteredAdminNavigation.length > 0 && (
            <li>
              <div className="text-xs font-semibold leading-6 text-gray-400 uppercase tracking-wider">
                Administration
              </div>
              <ul role="list" className="-mx-2 mt-2 space-y-1">
                {filteredAdminNavigation.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== "/admin" && pathname.startsWith(item.href))
                  
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          isActive
                            ? "bg-red-50 text-red-700 border-r-2 border-red-600"
                            : "text-gray-700 hover:text-red-700 hover:bg-red-50",
                          "group flex gap-x-3 rounded-l-md p-2 text-sm leading-6 font-medium transition-colors"
                        )}
                      >
                        <item.icon
                          className={cn(
                            isActive ? "text-red-600" : "text-gray-400 group-hover:text-red-600",
                            "h-5 w-5 shrink-0"
                          )}
                        />
                        <span className="flex-1">{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
          )}

          {/* User Profile Section */}
          <li className="mt-auto">
            <div className="border-t border-gray-200 pt-4">
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
            </div>
          </li>
        </ul>
      </nav>
    </div>
  )
}