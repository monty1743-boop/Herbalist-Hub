import { NextRequest, NextResponse } from "next/server"
import { signUpSchema } from "@/lib/validation"
import { registerUser, checkRegistrationRateLimit } from "@/lib/auth/registration"
import { headers } from "next/headers"
import { logAuthEvent } from "@/lib/audit/middleware"
import { AuditEventType, AuditOutcome } from "@/lib/audit/logger"

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const headersList = headers()
    const forwardedFor = headersList.get("x-forwarded-for")
    const ip = forwardedFor ? forwardedFor.split(",")[0] : request.ip || "unknown"
    
    // Check rate limiting
    if (!checkRegistrationRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many registration attempts. Please try again later.",
        },
        { status: 429 }
      )
    }
    
    // Parse request body
    const body = await request.json()
    
    // Validate input
    const validationResult = signUpSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input data",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }
    
    // Register user
    const result = await registerUser(validationResult.data)
    
    if (!result.success) {
      // Log failed registration attempt
      await logAuthEvent(
        AuditEventType.USER_CREATE,
        request,
        { email: validationResult.data.email },
        AuditOutcome.FAILURE,
        { error: result.error }
      )
      
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }
    
    // Log successful registration
    await logAuthEvent(
      AuditEventType.USER_CREATE,
      request,
      {
        id: result.user?.id,
        email: result.user?.email,
        role: result.user?.role,
      },
      AuditOutcome.SUCCESS,
      { role: result.user?.role }
    )
    
    // Return success response (without sensitive data)
    return NextResponse.json({
      success: true,
      message: "Registration successful. Please check your email for verification.",
      user: {
        id: result.user?.id,
        email: result.user?.email,
        name: result.user?.name,
        role: result.user?.role,
      },
    })
  } catch (error) {
    console.error("Registration API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check email availability
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    
    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      )
    }
    
    const { checkEmailAvailability } = await import("@/lib/auth/registration")
    const isAvailable = await checkEmailAvailability(email)
    
    return NextResponse.json({
      available: isAvailable,
    })
  } catch (error) {
    console.error("Email availability check error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}