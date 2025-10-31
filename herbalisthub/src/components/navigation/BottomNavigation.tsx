"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"
import { 
  Home,
  Calendar,
  MessageSquare,
  Bell,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  roles?: string[]
}

const bottomNavItems: BottomNavItem[] = [
  {
    name: "Home",
    href: "/dashboard",
    icon: Home
  },
  {
    name: "Appointments",
    href: "/dashboard/appointments",
    icon: Calendar,
    badge: "3",
    roles: ["HERBALIST", "ADMIN"]
  },
  {
    name: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
    badge: "2"
  },
  {
    name: "Alerts",
    href: "/dashboard/notifications",
    icon: Bell,
    badge: "5"
  },
  {
    name: "Profile",
    href: "/dashboard/profile",
    icon: User
  }
]

interface BottomNavigationProps {
  className?: string
}

export function BottomNavigation({ className }: BottomNavigationProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = session?.user?.role as string

  const hasRole = (roles?: string[]) => {
    if (!roles) return true
    return roles.includes(userRole)
  }

  const filteredItems = bottomNavItems.filter(item => hasRole(item.roles))

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-2 md:hidden",
      className
    )}>
      <nav>
        <ul className="flex items-center justify-around">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname.startsWith(item.href))
            
            const Icon = item.icon

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-2 text-xs font-medium transition-colors relative",
                    isActive
                      ? "text-green-600"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <div className="relative">
                    <Icon 
                      className={cn(
                        "h-6 w-6 mb-1",
                        isActive ? "text-green-600" : "text-gray-400"
                      )} 
                    />
                    {item.badge && (
                      <Badge 
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center min-w-[16px]"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <span className={cn(
                    "truncate max-w-[60px]",
                    isActive ? "text-green-600" : "text-gray-500"
                  )}>
                    {item.name}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}