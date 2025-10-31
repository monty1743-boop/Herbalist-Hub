import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { Role } from "@prisma/client"

/**
 * Get authenticated client session
 * Returns null if user is not a client or not authenticated
 */
export async function getClientSession() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return null
  }

  // Allow both CLIENT and ADMIN roles to access client portal
  if (session.user.role !== Role.CLIENT && session.user.role !== Role.ADMIN) {
    return null
  }

  return session
}

/**
 * Verify client access for API routes
 */
export async function verifyClientAccess() {
  const session = await getClientSession()
  
  if (!session) {
    throw new Error("Unauthorized - Client access required")
  }

  return session
}

/**
 * Check if user has client portal access
 */
export function hasClientAccess(role: Role): boolean {
  return role === Role.CLIENT || role === Role.ADMIN
}

/**
 * Client authentication middleware for API routes
 */
export async function withClientAuth<T>(
  handler: (session: any) => Promise<T>
): Promise<T> {
  const session = await verifyClientAccess()
  return handler(session)
}