"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"
import { MessageThread } from "@/components/client/MessageThread"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function MessagesPage() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading messages..." />
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
    <div className="h-full">
      <MessageThread userId={session.user.id} />
    </div>
  )
}