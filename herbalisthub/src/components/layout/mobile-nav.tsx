"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Home, 
  Package, 
  Users, 
  Calendar, 
  FlaskConical, 
  BarChart3,
  Settings,
  LogOut
} from "lucide-react"

interface MobileNavProps {
  onClose: () => void
}

export function MobileNav({ onClose }: MobileNavProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      roles: ["ADMIN", "HERBALIST", "CLIENT"]
    },
    {
      name: "Inventory",
      href: "/inventory",
      icon: Package,
      roles: ["ADMIN", "HERBALIST"]
    },
    {
      name: "Clients",
      href: "/clients",
      icon: Users,
      roles: ["ADMIN", "HERBALIST"]
    },
    {
      name: "Appointments",
      href: "/appointments",
      icon: Calendar,
      roles: ["ADMIN", "HERBALIST", "CLIENT"]
    },
    {
      name: "Formulas",
      href: "/formulas",
      icon: FlaskConical,
      roles: ["ADMIN", "HERBALIST"]
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      roles: ["ADMIN", "HERBALIST"]
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      roles: ["ADMIN", "HERBALIST", "CLIENT"]
    }
  ]

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => 
    session?.user?.role && item.roles.includes(session.user.role as string)
  )

  return (
    <div className="fixed inset-0 top-14 z-50 bg-background/80 backdrop-blur-sm md:hidden">
      <div className="fixed inset-x-4 top-16 z-50 origin-top-right rounded-md border bg-background p-6 shadow-lg">
        <div className="grid gap-6 py-4">
          {/* Navigation Links */}
          <nav className="grid gap-2">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Divider */}
          <div className="border-t" />

          {/* User Info */}
          {session?.user && (
            <div className="space-y-3">
              <div className="px-3">
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs text-muted-foreground">{session.user.email}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {session.user.role?.toLowerCase()}
                </p>
              </div>

              {/* Mobile User Actions */}
              <div className="grid gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-3"
                  asChild
                >
                  <Link href="/profile" onClick={onClose}>
                    <Settings className="h-4 w-4" />
                    Profile Settings
                  </Link>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-3 text-destructive hover:text-destructive"
                  onClick={() => {
                    onClose()
                    // Implement sign out
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}