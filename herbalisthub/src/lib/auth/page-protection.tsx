"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, ReactNode } from "react"
import { Role } from "@prisma/client"

interface ProtectedPageProps {
  children: ReactNode
  requiredRole?: Role
  allowedRoles?: Role[]
  requireEmailVerified?: boolean
  redirectTo?: string
  loadingComponent?: ReactNode
}

/**
 * Higher-order component for protecting pages with role-based access
 */
export function ProtectedPage({
  children,
  requiredRole,
  allowedRoles,
  requireEmailVerified = true,
  redirectTo,
  loadingComponent = <PageLoader />,
}: ProtectedPageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    // Not authenticated
    if (!session) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    const user = session.user
    const userRole = user.role as Role

    // Email verification check
    if (requireEmailVerified && !user.emailVerified) {
      router.push("/auth/verify-email")
      return
    }

    // Role access check
    const hasAccess = checkRoleAccess(userRole, requiredRole, allowedRoles)
    
    if (!hasAccess) {
      const defaultRedirect = getDefaultRedirectForRole(userRole)
      router.push(redirectTo || defaultRedirect)
      return
    }
  }, [session, status, router, requiredRole, allowedRoles, requireEmailVerified, redirectTo])

  // Show loading state
  if (status === "loading") {
    return <>{loadingComponent}</>
  }

  // Not authenticated
  if (!session) {
    return <>{loadingComponent}</>
  }

  const user = session.user
  const userRole = user.role as Role

  // Email verification required
  if (requireEmailVerified && !user.emailVerified) {
    return <>{loadingComponent}</>
  }

  // Access denied
  const hasAccess = checkRoleAccess(userRole, requiredRole, allowedRoles)
  if (!hasAccess) {
    return <>{loadingComponent}</>
  }

  return <>{children}</>
}

/**
 * Check if user role has access based on required role or allowed roles
 */
function checkRoleAccess(
  userRole: Role,
  requiredRole?: Role,
  allowedRoles?: Role[]
): boolean {
  // Admin always has access
  if (userRole === Role.ADMIN) {
    return true
  }

  // Check specific required role
  if (requiredRole) {
    return userRole === requiredRole
  }

  // Check allowed roles
  if (allowedRoles) {
    return allowedRoles.includes(userRole)
  }

  // Default to allowing access if no restrictions specified
  return true
}

/**
 * Get default redirect URL for a user role
 */
function getDefaultRedirectForRole(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return "/admin"
    case Role.HERBALIST:
      return "/dashboard"
    case Role.CLIENT:
      return "/portal"
    case Role.PUBLIC:
    default:
      return "/"
  }
}

/**
 * Default loading component
 */
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>
  )
}

/**
 * HOC for admin-only pages
 */
export function AdminPage({ children, ...props }: Omit<ProtectedPageProps, "requiredRole">) {
  return (
    <ProtectedPage requiredRole={Role.ADMIN} {...props}>
      {children}
    </ProtectedPage>
  )
}

/**
 * HOC for herbalist-only pages
 */
export function HerbalistPage({ children, ...props }: Omit<ProtectedPageProps, "requiredRole">) {
  return (
    <ProtectedPage requiredRole={Role.HERBALIST} {...props}>
      {children}
    </ProtectedPage>
  )
}

/**
 * HOC for client-only pages
 */
export function ClientPage({ children, ...props }: Omit<ProtectedPageProps, "requiredRole">) {
  return (
    <ProtectedPage requiredRole={Role.CLIENT} {...props}>
      {children}
    </ProtectedPage>
  )
}

/**
 * HOC for pages accessible by herbalists or clients
 */
export function HerbalistOrClientPage({ children, ...props }: Omit<ProtectedPageProps, "allowedRoles">) {
  return (
    <ProtectedPage allowedRoles={[Role.HERBALIST, Role.CLIENT]} {...props}>
      {children}
    </ProtectedPage>
  )
}

/**
 * Hook to get current user with type safety
 */
export function useAuthenticatedUser() {
  const { data: session } = useSession()
  
  if (!session?.user) {
    return null
  }
  
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as Role,
    emailVerified: session.user.emailVerified,
    image: session.user.image,
  }
}

/**
 * Hook to check if current user has specific role or permission
 */
export function useHasRole(role: Role): boolean {
  const user = useAuthenticatedUser()
  
  if (!user) return false
  
  // Admin has all roles
  if (user.role === Role.ADMIN) return true
  
  return user.role === role
}

/**
 * Hook to check if current user has any of the specified roles
 */
export function useHasAnyRole(roles: Role[]): boolean {
  const user = useAuthenticatedUser()
  
  if (!user) return false
  
  // Admin has all roles
  if (user.role === Role.ADMIN) return true
  
  return roles.includes(user.role)
}

/**
 * Component for conditional rendering based on user role
 */
interface RoleGuardProps {
  children: ReactNode
  role?: Role
  roles?: Role[]
  fallback?: ReactNode
}

export function RoleGuard({ children, role, roles, fallback = null }: RoleGuardProps) {
  const user = useAuthenticatedUser()
  
  if (!user) {
    return <>{fallback}</>
  }
  
  // Admin always has access
  if (user.role === Role.ADMIN) {
    return <>{children}</>
  }
  
  // Check specific role
  if (role && user.role === role) {
    return <>{children}</>
  }
  
  // Check multiple roles
  if (roles && roles.includes(user.role)) {
    return <>{children}</>
  }
  
  // No access
  if (role || roles) {
    return <>{fallback}</>
  }
  
  // Default to showing content if no restrictions
  return <>{children}</>
}