import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuthenticatedUser } from "@/lib/auth/api-middleware"
import { withApiMiddleware } from "@/lib/api/middleware"
import { withValidation } from "@/lib/api/validation"
import { ApiResponse, ApiErrors } from "@/lib/api/errors"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { hash, compare } from "bcryptjs"
import { prisma } from "@/lib/db/client"

// Password change validation schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  { 
    message: "Passwords do not match",
    path: ["confirmPassword"]
  }
)

// PUT - Change user password
export const PUT = withApiMiddleware(
  withAuthenticatedUser(
    withValidation({
      body: passwordChangeSchema,
    })(async (request, context, validated, user): Promise<NextResponse> => {
      try {
        const { currentPassword, newPassword } = validated.body!

        // Get current user with password hash
        const userWithPassword = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            password: true,
            email: true,
            lastPasswordChange: true,
          },
        })

        if (!userWithPassword || !userWithPassword.password) {
          throw ApiErrors.notFound("User", user.id)
        }

        // Verify current password
        const isCurrentPasswordValid = await compare(currentPassword, userWithPassword.password)
        if (!isCurrentPasswordValid) {
          // Audit failed password change attempt
          await auditPHIAccess(
            "update",
            "UserPassword",
            user.id,
            user.id,
            user.role,
            ["password"],
            AuditOutcome.FAILURE,
            { 
              selfUpdate: true,
              reason: "Invalid current password",
            }
          )

          throw ApiErrors.unauthorized("Current password is incorrect")
        }

        // Check if new password is same as current
        const isSamePassword = await compare(newPassword, userWithPassword.password)
        if (isSamePassword) {
          throw ApiErrors.businessRule("New password must be different from current password")
        }

        // Check password change frequency (prevent too frequent changes)
        if (userWithPassword.lastPasswordChange) {
          const daysSinceLastChange = Math.floor(
            (Date.now() - userWithPassword.lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24)
          )
          if (daysSinceLastChange < 1) {
            throw ApiErrors.businessRule("Password can only be changed once per day")
          }
        }

        // Hash new password
        const hashedNewPassword = await hash(newPassword, 12)

        // Update password
        await prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedNewPassword,
            lastPasswordChange: new Date(),
            updatedAt: new Date(),
          },
        })

        // Audit successful password change
        await auditPHIAccess(
          "update",
          "UserPassword",
          user.id,
          user.id,
          user.role,
          ["password"],
          AuditOutcome.SUCCESS,
          { 
            selfUpdate: true,
            passwordChangeDate: new Date().toISOString(),
          }
        )

        return ApiResponse.success(
          { message: "Password changed successfully" },
          "Password updated successfully"
        )
      } catch (error) {
        console.error("Change password error:", error)
        
        // Audit failed password change
        await auditPHIAccess(
          "update",
          "UserPassword",
          user.id,
          user.id,
          user.role,
          ["password"],
          AuditOutcome.FAILURE,
          { 
            selfUpdate: true,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        )

        throw error instanceof ApiErrors.constructor ? error : ApiErrors.internal("Failed to change password")
      }
    })
  ),
  {
    enableRateLimit: true,
    rateLimitMax: 5, // Very restrictive for password changes
    rateLimitWindow: 60 * 60 * 1000, // 1 hour window
    enableRequestLogging: true,
  }
)