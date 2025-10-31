import { NextRequest, NextResponse } from "next/server"
import { verifyEmailToken } from "@/lib/auth/verification"
import { sendWelcomeEmail } from "@/lib/email/service"
import { prisma } from "@/lib/db/client"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")
    
    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      )
    }
    
    // Verify the token
    const result = await verifyEmailToken(token)
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }
    
    // Get user info to send welcome email
    if (result.userId) {
      const user = await prisma.user.findUnique({
        where: { id: result.userId },
      })
      
      if (user && user.emailVerified) {
        // Send welcome email
        await sendWelcomeEmail(user.email, user.name || "User", user.role)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
    })
  } catch (error) {
    console.error("Email verification API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }
    
    const { resendVerificationEmail } = await import("@/lib/auth/verification")
    const success = await resendVerificationEmail(email)
    
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to resend verification email. Please check the email address.",
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully",
    })
  } catch (error) {
    console.error("Resend verification API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    )
  }
}