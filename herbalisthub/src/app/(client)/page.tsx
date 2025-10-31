"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"
import { ClientDashboard } from "@/components/client/ClientDashboard"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function ClientPortalPage() {
  const { data: session, status } = useSession()

  // Redirect to sign in if not authenticated
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!session) {
    redirect("/auth/signin")
  }

  // Ensure user has client access
  if (session.user.role !== Role.CLIENT && session.user.role !== Role.ADMIN) {
    redirect("/dashboard") // Redirect to appropriate dashboard
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session.user.name}
          </h1>
          <p className="text-gray-600 mt-1">
            Here's an overview of your health journey
          </p>
        </div>
      </div>

      <ClientDashboard userId={session.user.id} />
    </div>
  )
}