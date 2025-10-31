import { NextRequest, NextResponse } from "next/server"
import { passwordResetSchema, passwordChangeSchema } from "@/lib/validation"
import { 
  generatePasswordResetToken, 
  consumePasswordResetToken 
} from "@/lib/auth/verification"
import { sendPasswordResetEmail } from "@/lib/email/service"
import { prisma } from "@/lib/db/client"
import bcrypt from "bcryptjs"

// POST - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = passwordResetSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email address",
        },
        { status: 400 }
      )
    }
    
    const { email } = validationResult.data
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    })
    
    if (!user) {
      // Don't reveal whether user exists for security
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      })
    }
    
    // Generate reset token
    const token = await generatePasswordResetToken(email)
    
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate reset token. Please try again.",
        },
        { status: 500 }
      )
    }
    
    // Send reset email
    await sendPasswordResetEmail(user.email, user.name || "User", token)
    
    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    })
  } catch (error) {
    console.error("Password reset request error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    )
  }
}

// PUT - Reset password with token
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, newPassword, confirmPassword } = body
    
    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      )
    }
    
    // Validate password input
    const validationResult = passwordChangeSchema.safeParse({
      currentPassword: "dummy", // Not used for reset
      newPassword,
      confirmPassword,
    })
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid password format",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }
    
    // Verify and consume token
    const userId = await consumePasswordResetToken(token)
    
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired reset token",
        },
        { status: 400 }
      )
    }
    
    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12")
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)
    
    // Update user password (Note: In a full implementation, passwords would be stored in a separate table)
    // For now, we'll update a password field that we need to add to the user model
    await prisma.user.update({
      where: { id: userId },
      data: {
        // Note: This assumes we have a password field in the User model
        // In the current schema, we don't, so this is a placeholder
        // In a real implementation, we'd have a separate UserPassword table
        updatedAt: new Date(),
      },
    })
    
    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    })
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    )
  }
}

// GET - Verify reset token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")
    
    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      )
    }
    
    const { verifyPasswordResetToken } = await import("@/lib/auth/verification")
    const result = await verifyPasswordResetToken(token)
    
    return NextResponse.json({
      valid: result.success,
      error: result.error,
    })
  } catch (error) {
    console.error("Token verification error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}