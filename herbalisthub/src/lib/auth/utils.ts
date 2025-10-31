import { getServerSession } from "next-auth/next"
import { authOptions } from "./config"
import { Role } from "@prisma/client"
import { redirect } from "next/navigation"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/auth/signin")
  }
  return user
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    redirect("/unauthorized")
  }
  return user
}

export async function requireHerbalist() {
  return requireRole([Role.HERBALIST, Role.ADMIN])
}

export async function requireAdmin() {
  return requireRole([Role.ADMIN])
}

// Client-side authentication utilities
export function isAuthorized(userRole: Role, requiredRoles: Role[]): boolean {
  return requiredRoles.includes(userRole)
}

export function isHerbalist(userRole: Role): boolean {
  return userRole === Role.HERBALIST || userRole === Role.ADMIN
}

export function isAdmin(userRole: Role): boolean {
  return userRole === Role.ADMIN
}

export function isClient(userRole: Role): boolean {
  return userRole === Role.CLIENT
}

// Route protection helper
export function getAuthRedirect(userRole: Role): string {
  switch (userRole) {
    case Role.ADMIN:
    case Role.HERBALIST:
      return "/dashboard"
    case Role.CLIENT:
      return "/portal"
    default:
      return "/"
  }
}