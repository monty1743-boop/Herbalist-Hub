import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Authentication Error | HerbalistHub",
  description: "An error occurred during authentication",
}

interface AuthErrorPageProps {
  searchParams: { 
    error?: string 
    code?: string
  }
}

export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { error, code } = searchParams

  // Error messages for different NextAuth error types
  const getErrorDetails = (error: string) => {
    switch (error) {
      case "Configuration":
        return {
          title: "Configuration Error",
          message: "There is an issue with the authentication configuration. Please contact support.",
          action: "Contact Support",
        }
      case "AccessDenied":
        return {
          title: "Access Denied",
          message: "Access was denied during authentication. This may be due to account restrictions or insufficient permissions.",
          action: "Try Again",
        }
      case "Verification":
        return {
          title: "Verification Error",
          message: "The verification token is invalid or has expired. Please request a new verification email.",
          action: "Request New Verification",
        }
      case "OAuthSignin":
      case "OAuthCallback":
      case "OAuthCreateAccount":
        return {
          title: "OAuth Error",
          message: "There was an error with the OAuth provider. Please try signing in again.",
          action: "Try Again",
        }
      case "EmailSignin":
        return {
          title: "Email Error",
          message: "There was an error sending the verification email. Please check your email address and try again.",
          action: "Try Again",
        }
      case "CredentialsSignin":
        return {
          title: "Invalid Credentials",
          message: "The email or password you entered is incorrect. Please check your credentials and try again.",
          action: "Try Again",
        }
      case "SessionRequired":
        return {
          title: "Session Required",
          message: "You need to be signed in to access this page.",
          action: "Sign In",
        }
      case "OAuthAccountNotLinked":
        return {
          title: "Account Not Linked",
          message: "This email is already associated with an account using a different sign-in method. Please sign in with your original method.",
          action: "Try Different Method",
        }
      default:
        return {
          title: "Authentication Error",
          message: "An unexpected error occurred during authentication. Please try again.",
          action: "Try Again",
        }
    }
  }

  const errorDetails = error ? getErrorDetails(error) : {
    title: "Unknown Error",
    message: "An unknown error occurred. Please try again.",
    action: "Try Again",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl font-semibold">
              {errorDetails.title}
            </CardTitle>
            <CardDescription>
              We encountered an issue during authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorDetails.message}
              </AlertDescription>
            </Alert>

            {/* Display error code if available */}
            {code && (
              <div className="text-sm text-muted-foreground text-center">
                Error Code: {code}
              </div>
            )}

            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/auth/signin">
                  {errorDetails.action}
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                Still having trouble?{" "}
                <Link href="/support" className="text-primary hover:underline">
                  Contact Support
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}