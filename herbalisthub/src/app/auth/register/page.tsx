import { Metadata } from "next"
import { RegistrationForm } from "@/components/auth/RegistrationForm"
import { Role } from "@prisma/client"

export const metadata: Metadata = {
  title: "Register | HerbalistHub",
  description: "Create your HerbalistHub account with comprehensive practice management features",
}

interface RegisterPageProps {
  searchParams: { role?: string }
}

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  // Parse role from URL params
  const initialRole = searchParams.role ? 
    (searchParams.role.toUpperCase() as Role) : 
    Role.CLIENT

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Join HerbalistHub</h1>
          <p className="text-gray-600 mt-2 text-lg">
            HIPAA-Compliant Practice Management Platform
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Professional herbal practice management for the modern practitioner
          </p>
        </div>
        <RegistrationForm initialRole={initialRole} />
      </div>
    </div>
  )
}