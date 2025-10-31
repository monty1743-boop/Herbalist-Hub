import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuthenticatedUser } from "@/lib/auth/api-middleware"
import { withApiMiddleware } from "@/lib/api/middleware"
import { withValidation } from "@/lib/api/validation"
import { ApiResponse, ApiErrors } from "@/lib/api/errors"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { prisma } from "@/lib/db/client"
import { compare } from "bcryptjs"

// Account deactivation validation schema
const deactivateAccountSchema = z.object({
  password: z.string().min(1, "Password is required for account deactivation"),
  reason: z.enum([
    "not_using",
    "found_alternative",
    "privacy_concerns",
    "too_expensive",
    "technical_issues",
    "other"
  ]).optional(),
  feedback: z.string().max(1000, "Feedback cannot exceed 1000 characters").optional(),
  confirmDeactivation: z.boolean().refine(val => val === true, {
    message: "You must confirm account deactivation"
  }),
})

// Account reactivation validation schema
const reactivateAccountSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
})

// PUT - Deactivate user account (soft delete)
export const PUT = withApiMiddleware(
  withAuthenticatedUser(
    withValidation({
      body: deactivateAccountSchema,
    })(async (request, context, validated, user): Promise<NextResponse> => {
      try {
        const { password, reason, feedback } = validated.body!

        // Verify user exists and get password
        const userWithPassword = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            password: true,
            email: true,
            role: true,
            isActive: true,
          },
        })

        if (!userWithPassword || !userWithPassword.password) {
          throw ApiErrors.notFound("User", user.id)
        }

        // Check if account is already deactivated
        if (!userWithPassword.isActive) {
          throw ApiErrors.businessRule("Account is already deactivated")
        }

        // Verify password
        const isPasswordValid = await compare(password, userWithPassword.password)
        if (!isPasswordValid) {
          // Audit failed deactivation attempt
          await auditPHIAccess(
            "delete",
            "UserAccount",
            user.id,
            user.id,
            user.role,
            ["account"],
            AuditOutcome.FAILURE,
            { 
              selfDeactivation: true,
              reason: "Invalid password",
            }
          )

          throw ApiErrors.unauthorized("Password is incorrect")
        }

        // Prevent admin account deactivation if it's the last admin
        if (userWithPassword.role === "ADMIN") {
          const adminCount = await prisma.user.count({
            where: { 
              role: "ADMIN",
              isActive: true,
              id: { not: user.id }
            }
          })

          if (adminCount === 0) {
            throw ApiErrors.businessRule("Cannot deactivate the last admin account")
          }
        }

        // Begin transaction for account deactivation
        const result = await prisma.$transaction(async (tx) => {
          // Deactivate user account
          const deactivatedUser = await tx.user.update({
            where: { id: user.id },
            data: {
              isActive: false,
              deactivatedAt: new Date(),
              updatedAt: new Date(),
            },
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
              deactivatedAt: true,
            },
          })

          // Cancel all future appointments
          await tx.appointment.updateMany({
            where: {
              OR: [
                { clientId: user.id },
                { herbalistId: user.id }
              ],
              startTime: { gt: new Date() },
              status: { not: "CANCELLED" }
            },
            data: {
              status: "CANCELLED",
              cancellationReason: "Account deactivated",
              updatedAt: new Date(),
            },
          })

          // Store deactivation feedback if provided
          if (reason || feedback) {
            await tx.userFeedback.create({
              data: {
                userId: user.id,
                type: "DEACTIVATION",
                reason,
                feedback,
                submittedAt: new Date(),
              },
            })
          }

          return deactivatedUser
        })

        // Audit successful account deactivation
        await auditPHIAccess(
          "delete",
          "UserAccount",
          user.id,
          user.id,
          user.role,
          ["account", "appointments"],
          AuditOutcome.SUCCESS,
          { 
            selfDeactivation: true,
            deactivationReason: reason,
            hasFeedback: !!feedback,
            appointmentsCancelled: true,
          }
        )

        return ApiResponse.success(
          {
            message: "Account deactivated successfully",
            deactivatedAt: result.deactivatedAt,
            email: result.email,
          },
          "Account has been deactivated"
        )
      } catch (error) {
        console.error("Deactivate account error:", error)
        
        // Audit failed deactivation
        await auditPHIAccess(
          "delete",
          "UserAccount",
          user.id,
          user.id,
          user.role,
          ["account"],
          AuditOutcome.FAILURE,
          { 
            selfDeactivation: true,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        )

        throw error instanceof ApiErrors.constructor ? error : ApiErrors.internal("Failed to deactivate account")
      }
    })
  ),
  {
    enableRateLimit: true,
    rateLimitMax: 3, // Very restrictive for account deactivation
    rateLimitWindow: 60 * 60 * 1000, // 1 hour window
    enableRequestLogging: true,
  }
)

// POST - Reactivate account (for deactivated accounts)
export const POST = withApiMiddleware(
  withValidation({
    body: reactivateAccountSchema,
  })(async (request, context, validated): Promise<NextResponse> => {
    try {
      const { email, password } = validated.body!

      // Find deactivated user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
          isActive: true,
          deactivatedAt: true,
        },
      })

      if (!user) {
        throw ApiErrors.notFound("User", email)
      }

      // Check if account is actually deactivated
      if (user.isActive) {
        throw ApiErrors.businessRule("Account is already active")
      }

      // Verify password
      if (!user.password) {
        throw ApiErrors.businessRule("Account cannot be reactivated")
      }

      const isPasswordValid = await compare(password, user.password)
      if (!isPasswordValid) {
        // Audit failed reactivation attempt
        await auditPHIAccess(
          "update",
          "UserAccount",
          null, // No authenticated user yet
          user.id,
          user.role,
          ["account"],
          AuditOutcome.FAILURE,
          { 
            reactivationAttempt: true,
            reason: "Invalid password",
            email,
          }
        )

        throw ApiErrors.unauthorized("Invalid credentials")
      }

      // Check if account was deactivated too long ago (optional business rule)
      if (user.deactivatedAt) {
        const daysSinceDeactivation = Math.floor(
          (Date.now() - user.deactivatedAt.getTime()) / (1000 * 60 * 60 * 24)
        )
        
        if (daysSinceDeactivation > 365) { // 1 year limit
          throw ApiErrors.businessRule(
            "Account cannot be reactivated after being deactivated for more than 1 year. Please contact support."
          )
        }
      }

      // Reactivate account
      const reactivatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
          deactivatedAt: null,
          reactivatedAt: new Date(),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          reactivatedAt: true,
        },
      })

      // Audit successful account reactivation
      await auditPHIAccess(
        "update",
        "UserAccount",
        user.id, // User is now reactivated
        user.id,
        user.role,
        ["account"],
        AuditOutcome.SUCCESS,
        { 
          reactivation: true,
          daysSinceDeactivation: user.deactivatedAt 
            ? Math.floor((Date.now() - user.deactivatedAt.getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        }
      )

      return ApiResponse.success(
        {
          user: reactivatedUser,
          message: "Account reactivated successfully",
        },
        "Welcome back! Your account has been reactivated"
      )
    } catch (error) {
      console.error("Reactivate account error:", error)
      throw error instanceof ApiErrors.constructor ? error : ApiErrors.internal("Failed to reactivate account")
    }
  }),
  {
    enableRateLimit: true,
    rateLimitMax: 5, // Restrictive for reactivation attempts
    rateLimitWindow: 60 * 60 * 1000, // 1 hour window
    enableRequestLogging: true,
  }
)