"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"
import { AvailabilityDisplay } from "@/components/client/AvailabilityDisplay"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function BookAppointmentPage() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading booking interface..." />
      </div>
    )
  }

  if (!session) {
    redirect("/auth/signin")
  }

  // Ensure user has client access
  if (session.user.role !== Role.CLIENT && session.user.role !== Role.ADMIN) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Book Appointment</h1>
          <p className="text-gray-600 mt-1">
            Schedule your next consultation with our practitioners
          </p>
        </div>
      </div>

      <AvailabilityDisplay userId={session.user.id} />
    </div>
  )
}