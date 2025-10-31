"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, Mail, RefreshCw } from "lucide-react"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error" | "manual">("loading")
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    if (token) {
      verifyToken(token)
    } else {
      setVerificationStatus("manual")
    }
  }, [token])

  const verifyToken = async (verificationToken: string) => {
    try {
      const response = await fetch(`/api/auth/verify-email?token=${verificationToken}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setVerificationStatus("success")
        // Redirect to dashboard after success
        setTimeout(() => {
          router.push("/auth/signin?verified=true")
        }, 3000)
      } else {
        setVerificationStatus("error")
        setError(data.error || "Verification failed")
      }
    } catch (error) {
      setVerificationStatus("error")
      setError("An error occurred during verification")
    }
  }

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsResending(true)
    setError("")
    setResendSuccess(false)

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResendSuccess(true)
      } else {
        setError(data.error || "Failed to resend verification email")
      }
    } catch (error) {
      setError("An error occurred while resending email")
    } finally {
      setIsResending(false)
    }
  }

  if (verificationStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600"></div>
            <CardTitle>Verifying your email...</CardTitle>
            <CardDescription>
              Please wait while we verify your email address
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (verificationStatus === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <CardTitle className="text-green-600">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified. You can now sign in to your account.
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

  if (verificationStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
            <CardTitle className="text-red-600">Verification Failed</CardTitle>
            <CardDescription>
              {error || "The verification link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Please request a new verification email below or contact support if the problem persists.
                </AlertDescription>
              </Alert>
              
              <form onSubmit={handleResendEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isResending}
                  />
                </div>

                {resendSuccess && (
                  <Alert>
                    <AlertDescription>
                      Verification email sent! Please check your inbox.
                    </AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isResending}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                  {isResending ? "Sending..." : "Resend Verification Email"}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Manual verification (no token provided)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Mail className="mx-auto mb-4 h-12 w-12 text-blue-600" />
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We've sent you a verification link. Please check your email and click the link to verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Didn't receive the email? Check your spam folder or request a new verification email below.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleResendEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isResending}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {resendSuccess && (
                <Alert>
                  <AlertDescription>
                    Verification email sent! Please check your inbox.
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isResending}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                {isResending ? "Sending..." : "Resend Verification Email"}
              </Button>
            </form>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => router.push("/auth/signin")}
                className="text-sm"
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}