import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { Role } from "@prisma/client"

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: Role
    name?: string
    emailVerified?: Date
  }
}

// Route access control configuration
export const ROUTE_ACCESS = {
  // Public routes - no authentication required
  PUBLIC: [
    "/",
    "/auth/signin",
    "/auth/register", 
    "/auth/verify-email",
    "/auth/reset-password",
    "/api/auth",
    "/api/health",
  ],
  
  // Routes requiring any authenticated user
  AUTHENTICATED: [
    "/dashboard",
    "/profile",
    "/api/user",
  ],
  
  // Admin-only routes
  ADMIN: [
    "/admin",
    "/api/admin",
    "/users",
    "/audit-logs",
    "/system-settings",
  ],
  
  // Herbalist-only routes (can access client data)
  HERBALIST: [
    "/clients",
    "/consultations", 
    "/treatment-plans",
    "/api/clients",
    "/api/consultations",
    "/api/treatment-plans",
  ],
  
  // Client-only routes (self-service portal)
  CLIENT: [
    "/portal",
    "/my-treatments",
    "/my-consultations",
    "/api/portal",
  ],
} as const

// HIPAA compliance levels for routes
export const HIPAA_COMPLIANCE_LEVELS = {
  // No PHI handling required
  PUBLIC: "public",
  
  // General authenticated access, no PHI
  BASIC: "basic",
  
  // Access to own PHI only
  SELF_PHI: "self_phi",
  
  // Access to client PHI (herbalists)
  CLIENT_PHI: "client_phi", 
  
  // Full system access including all PHI (admin)
  FULL_PHI: "full_phi",
} as const

export type ComplianceLevel = typeof HIPAA_COMPLIANCE_LEVELS[keyof typeof HIPAA_COMPLIANCE_LEVELS]

// Route compliance mapping
export const ROUTE_COMPLIANCE: Record<string, ComplianceLevel> = {
  "/": HIPAA_COMPLIANCE_LEVELS.PUBLIC,
  "/auth/*": HIPAA_COMPLIANCE_LEVELS.PUBLIC,
  "/api/auth/*": HIPAA_COMPLIANCE_LEVELS.PUBLIC,
  "/dashboard": HIPAA_COMPLIANCE_LEVELS.BASIC,
  "/profile": HIPAA_COMPLIANCE_LEVELS.SELF_PHI,
  "/portal": HIPAA_COMPLIANCE_LEVELS.SELF_PHI,
  "/my-*": HIPAA_COMPLIANCE_LEVELS.SELF_PHI,
  "/clients": HIPAA_COMPLIANCE_LEVELS.CLIENT_PHI,
  "/consultations": HIPAA_COMPLIANCE_LEVELS.CLIENT_PHI,
  "/treatment-plans": HIPAA_COMPLIANCE_LEVELS.CLIENT_PHI,
  "/admin": HIPAA_COMPLIANCE_LEVELS.FULL_PHI,
  "/audit-logs": HIPAA_COMPLIANCE_LEVELS.FULL_PHI,
  "/api/clients/*": HIPAA_COMPLIANCE_LEVELS.CLIENT_PHI,
  "/api/consultations/*": HIPAA_COMPLIANCE_LEVELS.CLIENT_PHI,
  "/api/portal/*": HIPAA_COMPLIANCE_LEVELS.SELF_PHI,
  "/api/admin/*": HIPAA_COMPLIANCE_LEVELS.FULL_PHI,
}

/**
 * Check if a user has access to a specific route based on their role
 */
export function hasRouteAccess(userRole: Role, pathname: string): boolean {
  // Check public routes first
  if (ROUTE_ACCESS.PUBLIC.some(route => 
    pathname === route || pathname.startsWith(route)
  )) {
    return true
  }
  
  // Check role-specific routes
  switch (userRole) {
    case Role.ADMIN:
      // Admin has access to all routes
      return true
      
    case Role.HERBALIST:
      // Herbalist can access herbalist and authenticated routes
      return (
        ROUTE_ACCESS.HERBALIST.some(route => 
          pathname === route || pathname.startsWith(route)
        ) ||
        ROUTE_ACCESS.AUTHENTICATED.some(route => 
          pathname === route || pathname.startsWith(route)
        )
      )
      
    case Role.CLIENT:
      // Client can access client and authenticated routes
      return (
        ROUTE_ACCESS.CLIENT.some(route => 
          pathname === route || pathname.startsWith(route)
        ) ||
        ROUTE_ACCESS.AUTHENTICATED.some(route => 
          pathname === route || pathname.startsWith(route)
        )
      )
      
    case Role.PUBLIC:
      // Public users can only access public routes
      return ROUTE_ACCESS.PUBLIC.some(route => 
        pathname === route || pathname.startsWith(route)
      )
      
    default:
      return false
  }
}

/**
 * Get the HIPAA compliance level required for a route
 */
export function getRouteComplianceLevel(pathname: string): ComplianceLevel {
  // Find the most specific matching route pattern
  const matchingRoutes = Object.keys(ROUTE_COMPLIANCE)
    .filter(pattern => {
      if (pattern.endsWith("/*")) {
        const basePattern = pattern.slice(0, -2)
        return pathname.startsWith(basePattern)
      }
      if (pattern.endsWith("*")) {
        const basePattern = pattern.slice(0, -1)
        return pathname.startsWith(basePattern)
      }
      return pathname === pattern
    })
    .sort((a, b) => b.length - a.length) // Sort by specificity (longer patterns first)
  
  if (matchingRoutes.length > 0) {
    return ROUTE_COMPLIANCE[matchingRoutes[0]]
  }
  
  // Default to basic compliance for authenticated routes
  return HIPAA_COMPLIANCE_LEVELS.BASIC
}

/**
 * Check if a user's role allows access to the required compliance level
 */
export function hasComplianceAccess(userRole: Role, complianceLevel: ComplianceLevel): boolean {
  switch (complianceLevel) {
    case HIPAA_COMPLIANCE_LEVELS.PUBLIC:
      return true
      
    case HIPAA_COMPLIANCE_LEVELS.BASIC:
      return [Role.ADMIN, Role.HERBALIST, Role.CLIENT].includes(userRole)
      
    case HIPAA_COMPLIANCE_LEVELS.SELF_PHI:
      return [Role.ADMIN, Role.HERBALIST, Role.CLIENT].includes(userRole)
      
    case HIPAA_COMPLIANCE_LEVELS.CLIENT_PHI:
      return [Role.ADMIN, Role.HERBALIST].includes(userRole)
      
    case HIPAA_COMPLIANCE_LEVELS.FULL_PHI:
      return userRole === Role.ADMIN
      
    default:
      return false
  }
}

/**
 * Middleware function for route protection
 */
export async function withAuth(
  request: NextRequest,
  requiredRole?: Role,
  requireEmailVerified: boolean = true
): Promise<NextResponse | AuthenticatedRequest> {
  const pathname = request.nextUrl.pathname
  
  // Get user token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  // Check if route is public
  if (ROUTE_ACCESS.PUBLIC.some(route => 
    pathname === route || pathname.startsWith(route)
  )) {
    return request as AuthenticatedRequest
  }
  
  // Require authentication for protected routes
  if (!token) {
    const url = new URL("/auth/signin", request.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }
  
  // Check email verification if required
  if (requireEmailVerified && !token.emailVerified) {
    const url = new URL("/auth/verify-email", request.url)
    return NextResponse.redirect(url)
  }
  
  const userRole = token.role as Role
  
  // Check route access based on role
  if (!hasRouteAccess(userRole, pathname)) {
    // Redirect based on user role
    const redirectUrl = new URL(request.url)
    switch (userRole) {
      case Role.ADMIN:
        redirectUrl.pathname = "/admin"
        break
      case Role.HERBALIST:
        redirectUrl.pathname = "/dashboard"
        break
      case Role.CLIENT:
        redirectUrl.pathname = "/portal"
        break
      default:
        redirectUrl.pathname = "/"
    }
    return NextResponse.redirect(redirectUrl)
  }
  
  // Check HIPAA compliance level
  const requiredComplianceLevel = getRouteComplianceLevel(pathname)
  if (!hasComplianceAccess(userRole, requiredComplianceLevel)) {
    // Log unauthorized access attempt for HIPAA audit
    console.warn(`HIPAA Violation Attempt: User ${token.id} (${userRole}) attempted to access ${pathname} requiring ${requiredComplianceLevel} compliance`)
    
    return NextResponse.json(
      { error: "Insufficient privileges for this resource" },
      { status: 403 }
    )
  }
  
  // Check specific role requirement if provided
  if (requiredRole && userRole !== requiredRole && userRole !== Role.ADMIN) {
    return NextResponse.json(
      { error: "Insufficient role privileges" },
      { status: 403 }
    )
  }
  
  // Add user info to request
  const authenticatedRequest = request as AuthenticatedRequest
  authenticatedRequest.user = {
    id: token.id as string,
    email: token.email as string,
    role: userRole,
    name: token.name as string,
    emailVerified: token.emailVerified as Date,
  }
  
  return authenticatedRequest
}

/**
 * Higher-order function to create role-specific middleware
 */
export function requireRole(role: Role) {
  return async (request: NextRequest): Promise<NextResponse | AuthenticatedRequest> => {
    return await withAuth(request, role)
  }
}

/**
 * Middleware for admin-only routes
 */
export const requireAdmin = requireRole(Role.ADMIN)

/**
 * Middleware for herbalist-only routes
 */
export const requireHerbalist = requireRole(Role.HERBALIST)

/**
 * Middleware for client-only routes
 */
export const requireClient = requireRole(Role.CLIENT)

/**
 * Get redirect URL based on user role after successful authentication
 */
export function getDefaultRedirectUrl(role: Role): string {
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