"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Dialog, Transition } from "@headlessui/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  X,
  LogOut,
  User,
  HelpCircle
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

interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
  onToggle: () => void
  variant?: "mobile" | "tablet"
}

export function MobileNavigation({ isOpen, onClose, onToggle, variant = "mobile" }: MobileNavigationProps) {
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

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/80" />
        </Transition.Child>

        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className={cn(
              "relative mr-16 flex w-full flex-1 flex-col bg-white",
              variant === "tablet" ? "max-w-sm" : "max-w-xs"
            )}>
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button type="button" className="-m-2.5 p-2.5" onClick={onClose}>
                    <span className="sr-only">Close sidebar</span>
                    <X className="h-6 w-6 text-white" />
                  </button>
                </div>
              </Transition.Child>

              {/* Sidebar content */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4">
                {/* Logo */}
                <div className="flex h-16 shrink-0 items-center">
                  <Link href="/dashboard" className="flex items-center space-x-2" onClick={onClose}>
                    <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
                      <Leaf className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">HerbalistHub</span>
                  </Link>
                </div>

                {/* Navigation */}
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    {/* Main Navigation */}
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {mainNavigation.map((item) => {
                          const isActive = pathname === item.href || 
                            (item.href !== "/dashboard" && pathname.startsWith(item.href))
                          
                          return (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                  isActive
                                    ? "bg-green-50 text-green-700 border-r-2 border-green-600"
                                    : "text-gray-700 hover:text-green-700 hover:bg-green-50",
                                  "group flex gap-x-3 rounded-l-md p-3 text-sm leading-6 font-medium transition-colors"
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
                                  <Badge 
                                    variant={isActive ? "default" : "secondary"}
                                    className="ml-auto text-xs"
                                  >
                                    {item.badge}
                                  </Badge>
                                )}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </li>

                    {/* Admin Section */}
                    {adminNavigation.length > 0 && (
                      <li>
                        <div className="text-xs font-semibold leading-6 text-gray-400 uppercase tracking-wider mb-2">
                          Administration
                        </div>
                        <ul role="list" className="-mx-2 space-y-1">
                          {adminNavigation.map((item) => {
                            const isActive = pathname === item.href || 
                              (item.href !== "/admin" && pathname.startsWith(item.href))
                            
                            return (
                              <li key={item.name}>
                                <Link
                                  href={item.href}
                                  onClick={onClose}
                                  className={cn(
                                    isActive
                                      ? "bg-red-50 text-red-700 border-r-2 border-red-600"
                                      : "text-gray-700 hover:text-red-700 hover:bg-red-50",
                                    "group flex gap-x-3 rounded-l-md p-3 text-sm leading-6 font-medium transition-colors"
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
                    <li className="mt-auto border-t border-gray-200 pt-4">
                      <div className="flex items-center gap-x-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
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

                      {/* Quick Actions */}
                      <div className="space-y-1">
                        <Link
                          href="/dashboard/profile"
                          onClick={onClose}
                          className="flex items-center gap-x-3 p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Link>
                        <Link
                          href="/help"
                          onClick={onClose}
                          className="flex items-center gap-x-3 p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <HelpCircle className="h-4 w-4" />
                          Help & Support
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-x-3 p-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors w-full text-left"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </li>
                  </ul>
                </nav>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}