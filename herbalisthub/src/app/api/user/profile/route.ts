import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuthenticatedUser } from "@/lib/auth/api-middleware"
import { withApiMiddleware } from "@/lib/api/middleware"
import { withValidation, ValidationSchemas } from "@/lib/api/validation"
import { ApiResponse, ApiErrors } from "@/lib/api/errors"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { prisma } from "@/lib/db/client"

// GET - Get user profile
export const GET = withApiMiddleware(
  withAuthenticatedUser(async (request, context, user) => {
    try {
      const userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          phone: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          isActive: true,
          practiceInfo: user.role === "HERBALIST" ? {
            select: {
              licenseNumber: true,
              certifications: true,
              businessName: true,
              businessAddress: true,
              website: true,
            }
          } : false,
        },
      })

      if (!userProfile) {
        throw ApiErrors.notFound("User profile", user.id)
      }

      // Audit profile access
      await auditPHIAccess(
        "read",
        "UserProfile",
        user.id,
        user.id,
        user.role,
        ["profile"],
        AuditOutcome.SUCCESS,
        { selfAccess: true }
      )

      return ApiResponse.success(userProfile, "Profile retrieved successfully")
    } catch (error) {
      console.error("Get user profile error:", error)
      throw error instanceof ApiErrors.constructor ? error : ApiErrors.internal("Failed to retrieve profile")
    }
  })
)

// PUT - Update user profile
export const PUT = withApiMiddleware(
  withAuthenticatedUser(
    withValidation({
      body: ValidationSchemas.updateUser.extend({
        practiceInfo: ValidationSchemas.createUser.pick({}).extend({
          licenseNumber: z.string().min(1).optional(),
          certifications: z.array(z.string()).optional(),
          businessName: z.string().min(1).optional(),
          businessAddress: z.string().optional(),
          website: z.string().url().optional(),
        }).optional(),
      }),
    })(async (request, context, validated, user) => {
      try {
        const { practiceInfo, ...userData } = validated.body!

        // Audit profile update attempt
        const fieldsToUpdate = Object.keys(userData)
        await auditPHIAccess(
          "update",
          "UserProfile",
          user.id,
          user.id,
          user.role,
          fieldsToUpdate,
          AuditOutcome.SUCCESS,
          { 
            selfUpdate: true,
            updatedFields: fieldsToUpdate,
            hasPracticeInfo: !!practiceInfo,
          }
        )

        // Update user profile
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            ...userData,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            phone: true,
            emailVerified: true,
            updatedAt: true,
          },
        })

        // Update practice info if user is a herbalist and practice info is provided
        let updatedPracticeInfo = null
        if (user.role === "HERBALIST" && practiceInfo) {
          updatedPracticeInfo = await prisma.practiceInfo.upsert({
            where: { userId: user.id },
            update: {
              ...practiceInfo,
              updatedAt: new Date(),
            },
            create: {
              ...practiceInfo,
              userId: user.id,
            },
          })
        }

        return ApiResponse.success(
          {
            ...updatedUser,
            practiceInfo: updatedPracticeInfo,
          },
          "Profile updated successfully"
        )
      } catch (error) {
        console.error("Update user profile error:", error)
        
        // Audit failed update
        await auditPHIAccess(
          "update",
          "UserProfile",
          user.id,
          user.id,
          user.role,
          ["profile"],
          AuditOutcome.FAILURE,
          { 
            selfUpdate: true,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        )

        throw error instanceof ApiErrors.constructor ? error : ApiErrors.internal("Failed to update profile")
      }
    })
  )
)