import { prisma } from "@/lib/db/client"
import crypto from "crypto"

export interface VerificationResult {
  success: boolean
  error?: string
  userId?: string
}

export async function generateVerificationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  
  // Store verification token
  await prisma.verificationToken.create({
    data: {
      identifier: userId,
      token,
      expires: expiresAt,
    },
  })
  
  return token
}

export async function verifyEmailToken(token: string): Promise<VerificationResult> {
  try {
    const verificationRecord = await prisma.verificationToken.findFirst({
      where: {
        token,
        expires: {
          gt: new Date(),
        },
      },
    })
    
    if (!verificationRecord) {
      return {
        success: false,
        error: "Invalid or expired verification token",
      }
    }
    
    // Update user email verification status
    await prisma.user.update({
      where: { id: verificationRecord.identifier },
      data: { emailVerified: new Date() },
    })
    
    // Delete used token
    await prisma.verificationToken.delete({
      where: {
        identifier: verificationRecord.identifier,
        token: verificationRecord.token,
      },
    })
    
    return {
      success: true,
      userId: verificationRecord.identifier,
    }
  } catch (error) {
    console.error("Email verification error:", error)
    return {
      success: false,
      error: "Verification failed. Please try again.",
    }
  }
}

export async function resendVerificationEmail(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })
    
    if (!user) {
      return false
    }
    
    if (user.emailVerified) {
      return true // Already verified
    }
    
    // Check if a token already exists and delete it
    await prisma.verificationToken.deleteMany({
      where: { identifier: user.id },
    })
    
    // Generate new token
    const token = await generateVerificationToken(user.id)
    
    // Send verification email (implementation in email service)
    const { sendVerificationEmail } = await import("@/lib/email/service")
    await sendVerificationEmail(user.email, user.name || "User", token)
    
    return true
  } catch (error) {
    console.error("Resend verification error:", error)
    return false
  }
}

export async function generatePasswordResetToken(email: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })
    
    if (!user) {
      return null
    }
    
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    
    // Delete any existing reset tokens for this user
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: `reset_${user.id}`,
      },
    })
    
    // Create new reset token
    await prisma.verificationToken.create({
      data: {
        identifier: `reset_${user.id}`,
        token,
        expires: expiresAt,
      },
    })
    
    return token
  } catch (error) {
    console.error("Password reset token generation error:", error)
    return null
  }
}

export async function verifyPasswordResetToken(token: string): Promise<VerificationResult> {
  try {
    const verificationRecord = await prisma.verificationToken.findFirst({
      where: {
        token,
        identifier: {
          startsWith: "reset_",
        },
        expires: {
          gt: new Date(),
        },
      },
    })
    
    if (!verificationRecord) {
      return {
        success: false,
        error: "Invalid or expired reset token",
      }
    }
    
    const userId = verificationRecord.identifier.replace("reset_", "")
    
    return {
      success: true,
      userId,
    }
  } catch (error) {
    console.error("Password reset verification error:", error)
    return {
      success: false,
      error: "Token verification failed. Please try again.",
    }
  }
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  try {
    const verificationResult = await verifyPasswordResetToken(token)
    
    if (!verificationResult.success || !verificationResult.userId) {
      return null
    }
    
    // Delete the token after successful verification
    await prisma.verificationToken.deleteMany({
      where: {
        token,
        identifier: `reset_${verificationResult.userId}`,
      },
    })
    
    return verificationResult.userId
  } catch (error) {
    console.error("Password reset token consumption error:", error)
    return null
  }
}