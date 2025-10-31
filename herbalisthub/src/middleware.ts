import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { Role } from "@prisma/client"

// Route access control configuration for edge runtime
const ROUTE_ACCESS = {
  PUBLIC: [
    "/",
    "/auth/signin",
    "/auth/register", 
    "/auth/verify-email",
    "/auth/reset-password",
    "/api/auth",
    "/api/health",
    "/_next",
    "/favicon.ico",
  ],
  
  AUTHENTICATED: [
    "/dashboard",
    "/profile",
    "/api/user",
  ],
  
  ADMIN: [
    "/admin",
    "/api/admin",
    "/users",
    "/audit-logs",
    "/system-settings",
  ],
  
  HERBALIST: [
    "/clients",
    "/consultations", 
    "/treatment-plans",
    "/api/clients",
    "/api/consultations",
    "/api/treatment-plans",
  ],
  
  CLIENT: [
    "/portal",
    "/my-treatments",
    "/my-consultations",
    "/api/portal",
  ],
} as const

function hasRouteAccess(userRole: Role | undefined, pathname: string): boolean {
  // Check public routes first
  if (ROUTE_ACCESS.PUBLIC.some(route => 
    pathname === route || pathname.startsWith(route)
  )) {
    return true
  }
  
  // Require authentication for non-public routes
  if (!userRole) {
    return false
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

function getDefaultRedirectUrl(role: Role): string {
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Skip middleware for Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }
  
  // Get user token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  const userRole = token?.role as Role | undefined
  
  // Check if route is accessible
  if (!hasRouteAccess(userRole, pathname)) {
    // If not authenticated, redirect to sign in
    if (!token) {
      const url = new URL("/auth/signin", request.url)
      url.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(url)
    }
    
    // If authenticated but insufficient privileges, redirect to appropriate dashboard
    const redirectUrl = new URL(getDefaultRedirectUrl(userRole!), request.url)
    return NextResponse.redirect(redirectUrl)
  }
  
  // Check email verification for authenticated routes (except public)
  if (token && !token.emailVerified && !ROUTE_ACCESS.PUBLIC.some(route => 
    pathname === route || pathname.startsWith(route)
  )) {
    const url = new URL("/auth/verify-email", request.url)
    return NextResponse.redirect(url)
  }
  
  // Handle root path redirects for authenticated users
  if (pathname === "/" && token) {
    const redirectUrl = new URL(getDefaultRedirectUrl(userRole!), request.url)
    return NextResponse.redirect(redirectUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)",
  ],
}