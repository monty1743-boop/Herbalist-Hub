"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  name: string
  href: string
  current: boolean
}

const routeNames: Record<string, string> = {
  dashboard: "Dashboard",
  clients: "Clients",
  appointments: "Appointments",
  consultations: "Consultations",
  "treatment-plans": "Treatment Plans",
  inventory: "Herb Inventory",
  formulas: "Formulas",
  messages: "Messages",
  analytics: "Analytics",
  notifications: "Notifications",
  settings: "Settings",
  profile: "Profile",
  widgets: "Widgets",
  admin: "Admin Panel",
  users: "User Management",
  "audit-logs": "Audit Logs",
  new: "New",
  edit: "Edit",
  view: "View"
}

export function NavigationBreadcrumbs() {
  const pathname = usePathname()

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    // Always start with Dashboard for dashboard routes
    if (pathSegments[0] === 'dashboard' || pathSegments[0] === 'admin') {
      breadcrumbs.push({
        name: "Dashboard",
        href: "/dashboard",
        current: false
      })

      // Process remaining segments
      for (let i = 1; i < pathSegments.length; i++) {
        const segment = pathSegments[i]
        const isLast = i === pathSegments.length - 1
        
        // Build the href by joining segments up to current position
        const href = '/' + pathSegments.slice(0, i + 1).join('/')
        
        // Get display name for segment
        const name = routeNames[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        
        breadcrumbs.push({
          name,
          href,
          current: isLast
        })
      }
    } else {
      // For non-dashboard routes, create simple breadcrumbs
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i]
        const isLast = i === pathSegments.length - 1
        const href = '/' + pathSegments.slice(0, i + 1).join('/')
        const name = routeNames[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        
        breadcrumbs.push({
          name,
          href,
          current: isLast
        })
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  // Don't show breadcrumbs for root dashboard
  if (pathname === '/dashboard') {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Home className="h-4 w-4" />
        <span className="font-medium text-gray-900">Dashboard</span>
      </div>
    )
  }

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mr-2" />
            )}
            
            {index === 0 && (
              <Home className="h-4 w-4 text-gray-400 mr-2" />
            )}

            {crumb.current ? (
              <span className="font-medium text-gray-900 truncate max-w-[200px]">
                {crumb.name}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  "text-gray-500 hover:text-gray-700 transition-colors truncate max-w-[200px]",
                  index === 0 && "hover:text-green-600"
                )}
              >
                {crumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}