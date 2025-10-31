import { Metadata } from "next"
import { SignInForm } from "@/components/auth/SignInForm"

export const metadata: Metadata = {
  title: "Sign In | HerbalistHub",
  description: "Sign in to your HerbalistHub account - HIPAA-compliant practice management platform",
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">
            Sign in to your HerbalistHub account
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Secure access to your practice management tools
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  )
}