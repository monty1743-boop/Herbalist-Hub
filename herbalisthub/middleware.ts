import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
// import { Role } from "@prisma/client"

// Temporary enum definition until Prisma client is properly generated
enum Role {
  ADMIN = "ADMIN",
  HERBALIST = "HERBALIST", 
  CLIENT = "CLIENT",
  PUBLIC = "PUBLIC"
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Public routes that don't require authentication
    const publicRoutes = [
      "/",
      "/auth/signin",
      "/auth/signup", 
      "/auth/error",
      "/api/auth",
      "/public",
    ]

    // Check if route is public
    const isPublicRoute = publicRoutes.some(route => 
      pathname.startsWith(route)
    )

    if (isPublicRoute) {
      return NextResponse.next()
    }

    // Redirect to signin if no token
    if (!token) {
      const signInUrl = new URL("/auth/signin", req.url)
      signInUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(signInUrl)
    }

    const userRole = token["role"] as Role

    // Role-based route protection
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
      if (userRole !== Role.HERBALIST && userRole !== Role.ADMIN) {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }

    if (pathname.startsWith("/admin")) {
      if (userRole !== Role.ADMIN) {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }

    if (pathname.startsWith("/portal")) {
      if (userRole !== Role.CLIENT) {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}