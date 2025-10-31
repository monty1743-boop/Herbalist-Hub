"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { passwordResetSchema, passwordChangeSchema } from "@/lib/validation/auth"
import { Mail, Lock, CheckCircle } from "lucide-react"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [mode, setMode] = useState<"request" | "reset" | "success">("request")
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    if (token) {
      validateToken(token)
    }
  }, [token])

  const validateToken = async (resetToken: string) => {
    setIsValidating(true)
    try {
      const response = await fetch(`/api/auth/reset-password?token=${resetToken}`)
      const data = await response.json()

      if (data.valid) {
        setMode("reset")
      } else {
        setError("Invalid or expired reset token. Please request a new password reset.")
      }
    } catch (error) {
      setError("An error occurred while validating the reset token.")
    } finally {
      setIsValidating(false)
    }
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setFieldErrors({})

    // Validate email
    const validationResult = passwordResetSchema.safeParse({ email })
    if (!validationResult.success) {
      const errors: Record<string, string> = {}
      validationResult.error.errors.forEach((error) => {
        if (error.path.length > 0) {
          errors[error.path[0] as string] = error.message
        }
      })
      setFieldErrors(errors)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMode("success")
      } else {
        setError(data.error || "Failed to send reset email")
      }
    } catch (error) {
      setError("An error occurred while requesting password reset")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setFieldErrors({})

    // Validate passwords
    const validationResult = passwordChangeSchema.safeParse({
      currentPassword: "dummy", // Not used for reset
      newPassword,
      confirmPassword,
    })

    if (!validationResult.success) {
      const errors: Record<string, string> = {}
      validationResult.error.errors.forEach((error) => {
        if (error.path.length > 0) {
          errors[error.path[0] as string] = error.message
        }
      })
      setFieldErrors(errors)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMode("success")
        // Redirect to sign in after success
        setTimeout(() => {
          router.push("/auth/signin?reset=true")
        }, 3000)
      } else {
        if (data.details) {
          const errors: Record<string, string> = {}
          data.details.forEach((error: any) => {
            if (error.path.length > 0) {
              errors[error.path[0] as string] = error.message
            }
          })
          setFieldErrors(errors)
        } else {
          setError(data.error || "Failed to reset password")
        }
      }
    } catch (error) {
      setError("An error occurred while resetting password")
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600"></div>
            <CardTitle>Validating reset token...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (mode === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <CardTitle className="text-green-600">
              {token ? "Password Reset Successfully!" : "Reset Email Sent!"}
            </CardTitle>
            <CardDescription>
              {token 
                ? "Your password has been updated. You can now sign in with your new password."
                : "If an account with that email exists, a password reset link has been sent."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/auth/signin")} className="w-full">
              Continue to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (mode === "reset" && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">HerbalistHub</h1>
            <p className="text-gray-600 mt-2">Reset your password</p>
          </div>
          <Card>
            <CardHeader className="text-center">
              <Lock className="mx-auto mb-4 h-12 w-12 text-blue-600" />
              <CardTitle>Create new password</CardTitle>
              <CardDescription>
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  {fieldErrors.newPassword && (
                    <p className="text-sm text-red-600">{fieldErrors.newPassword}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Updating password..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Request reset mode
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">HerbalistHub</h1>
          <p className="text-gray-600 mt-2">Reset your password</p>
        </div>
        <Card>
          <CardHeader className="text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 text-blue-600" />
            <CardTitle>Forgot your password?</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
                {fieldErrors.email && (
                  <p className="text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => router.push("/auth/signin")}
                  className="text-sm"
                >
                  Back to Sign In
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}