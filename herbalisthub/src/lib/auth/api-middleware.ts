import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { Role } from "@prisma/client"

export interface AuthenticatedUser {
  id: string
  email: string
  role: Role
  name?: string | null
  emailVerified?: Date | null
}

export interface ApiError {
  error: string
  code?: string
  details?: any
}

/**
 * Higher-order function to protect API routes with authentication and role checks
 */
export function withApiAuth(
  handler: (
    request: NextRequest,
    context: { params?: any },
    user: AuthenticatedUser
  ) => Promise<NextResponse>,
  options: {
    requiredRole?: Role
    requireEmailVerified?: boolean
    allowedRoles?: Role[]
  } = {}
) {
  return async (
    request: NextRequest,
    context: { params?: any } = {}
  ): Promise<NextResponse> => {
    try {
      // Get session
      const session = await getServerSession(authOptions)
      
      if (!session?.user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      }
      
      const user = session.user as AuthenticatedUser
      
      // Check email verification if required
      if (options.requireEmailVerified !== false && !user.emailVerified) {
        return NextResponse.json(
          { error: "Email verification required" },
          { status: 403 }
        )
      }
      
      // Check specific role requirement
      if (options.requiredRole && user.role !== options.requiredRole && user.role !== Role.ADMIN) {
        return NextResponse.json(
          { error: "Insufficient role privileges" },
          { status: 403 }
        )
      }
      
      // Check allowed roles
      if (options.allowedRoles && !options.allowedRoles.includes(user.role) && user.role !== Role.ADMIN) {
        return NextResponse.json(
          { error: "Insufficient privileges" },
          { status: 403 }
        )
      }
      
      // Call the actual handler
      return await handler(request, context, user)
    } catch (error) {
      console.error("API Auth Middleware Error:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware for admin-only API routes
 */
export function withAdminAuth(
  handler: (
    request: NextRequest,
    context: { params?: any },
    user: AuthenticatedUser
  ) => Promise<NextResponse>
) {
  return withApiAuth(handler, { requiredRole: Role.ADMIN })
}

/**
 * Middleware for herbalist-only API routes
 */
export function withHerbalistAuth(
  handler: (
    request: NextRequest,
    context: { params?: any },
    user: AuthenticatedUser
  ) => Promise<NextResponse>
) {
  return withApiAuth(handler, { allowedRoles: [Role.HERBALIST] })
}

/**
 * Middleware for client-only API routes
 */
export function withClientAuth(
  handler: (
    request: NextRequest,
    context: { params?: any },
    user: AuthenticatedUser
  ) => Promise<NextResponse>
) {
  return withApiAuth(handler, { allowedRoles: [Role.CLIENT] })
}

/**
 * Middleware for routes that allow both herbalists and clients
 */
export function withHerbalistOrClientAuth(
  handler: (
    request: NextRequest,
    context: { params?: any },
    user: AuthenticatedUser
  ) => Promise<NextResponse>
) {
  return withApiAuth(handler, { allowedRoles: [Role.HERBALIST, Role.CLIENT] })
}

/**
 * Generic authenticated middleware (any authenticated user)
 */
export function withAuthenticatedUser(
  handler: (
    request: NextRequest,
    context: { params?: any },
    user: AuthenticatedUser
  ) => Promise<NextResponse>
) {
  return withApiAuth(handler, { allowedRoles: [Role.ADMIN, Role.HERBALIST, Role.CLIENT] })
}

/**
 * Utility function to check if user can access another user's data
 * Used for HIPAA compliance - clients can only access their own data
 */
export function canAccessUserData(requestingUser: AuthenticatedUser, targetUserId: string): boolean {
  // Admin can access all user data
  if (requestingUser.role === Role.ADMIN) {
    return true
  }
  
  // Herbalists can access their client data (would need to check relationship in real implementation)
  if (requestingUser.role === Role.HERBALIST) {
    // TODO: Add logic to check if the herbalist has access to this client
    // For now, allow access - this should be implemented based on client-herbalist relationships
    return true
  }
  
  // Clients can only access their own data
  if (requestingUser.role === Role.CLIENT) {
    return requestingUser.id === targetUserId
  }
  
  return false
}

/**
 * Middleware for routes that require user data access validation
 */
export function withUserDataAccess(
  handler: (
    request: NextRequest,
    context: { params?: any },
    user: AuthenticatedUser,
    targetUserId: string
  ) => Promise<NextResponse>,
  getUserIdFromRequest: (request: NextRequest, context: { params?: any }) => string
) {
  return withApiAuth(async (request, context, user) => {
    const targetUserId = getUserIdFromRequest(request, context)
    
    if (!canAccessUserData(user, targetUserId)) {
      // Log potential HIPAA violation
      console.warn(`HIPAA Access Violation: User ${user.id} (${user.role}) attempted to access data for user ${targetUserId}`)
      
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }
    
    return await handler(request, context, user, targetUserId)
  })
}

/**
 * Rate limiting helper for API routes
 */
export class ApiRateLimit {
  private static attempts = new Map<string, { count: number; resetTime: number }>()
  
  static check(identifier: string, maxAttempts: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now()
    const key = identifier
    const attempt = this.attempts.get(key)
    
    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs })
      return true
    }
    
    if (attempt.count >= maxAttempts) {
      return false
    }
    
    attempt.count++
    return true
  }
  
  static getKey(request: NextRequest, user?: AuthenticatedUser): string {
    // Use user ID if available, otherwise use IP address
    if (user) {
      return `user:${user.id}`
    }
    
    const forwardedFor = request.headers.get("x-forwarded-for")
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown"
    return `ip:${ip}`
  }
}

/**
 * Middleware that adds rate limiting to API routes
 */
export function withRateLimit(
  handler: (
    request: NextRequest,
    context: { params?: any },
    user: AuthenticatedUser
  ) => Promise<NextResponse>,
  maxAttempts: number = 100,
  windowMs: number = 60000
) {
  return withApiAuth(async (request, context, user) => {
    const rateLimitKey = ApiRateLimit.getKey(request, user)
    
    if (!ApiRateLimit.check(rateLimitKey, maxAttempts, windowMs)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      )
    }
    
    return await handler(request, context, user)
  })
}