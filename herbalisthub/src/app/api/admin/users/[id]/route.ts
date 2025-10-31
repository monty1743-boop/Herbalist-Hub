import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAdminAuth } from "@/lib/auth/api-middleware"
import { withApiMiddleware } from "@/lib/api/middleware"
import { withValidation } from "@/lib/api/validation"
import { ApiResponse, ApiErrors } from "@/lib/api/errors"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { prisma } from "@/lib/db/client"

// Path parameters schema
const userParamsSchema = z.object({
  id: z.string().cuid("Invalid user ID"),
})

// Admin user update schema
const adminUpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "HERBALIST", "CLIENT", "PUBLIC"]).optional(),
  isActive: z.boolean().optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]{10,}$/).optional(),
})

// GET - Get user details (admin only)
export const GET = withApiMiddleware(
  withAdminAuth(
    withValidation({
      params: userParamsSchema,
    })(async (request, context, validated, user): Promise<NextResponse<unknown>> => {
      try {
        const { id } = validated.params!

        // Get user with related data
        const targetUser = await prisma.user.findUnique({
          where: { id },
          include: {
            clientProfile: {
              select: {
                id: true,
                dateOfBirth: true,
                gender: true,
                emergencyContact: true,
                communicationPrefs: true,
                createdAt: true,
                updatedAt: true,
              }
            },
            practiceInfo: {
              select: {
                id: true,
                licenseNumber: true,
                certifications: true,
                businessName: true,
                businessAddress: true,
                website: true,
                createdAt: true,
                updatedAt: true,
              }
            },
            _count: {
              select: {
                appointmentsAsClient: true,
                appointmentsAsHerbalist: true,
                consultationNotes: true,
              }
            }
          },
        })

        if (!targetUser) {
          throw ApiErrors.notFound("User", id)
        }

        // Audit admin access to user data
        await auditPHIAccess(
          "read",
          "UserProfile",
          user.id,
          targetUser.id,
          user.role,
          ["profile", "clientProfile", "practiceInfo"],
          AuditOutcome.SUCCESS,
          { 
            adminAccess: true,
            targetUserRole: targetUser.role,
          }
        )

        return ApiResponse.success(targetUser, "User details retrieved successfully")
      } catch (error) {
        console.error("Get user details error:", error)
        throw error instanceof ApiErrors.constructor ? error : ApiErrors.internal("Failed to retrieve user details")
      }
    })
  )
)

// PUT - Update user (admin only)
export const PUT = withApiMiddleware(
  withAdminAuth(
    withValidation({
      params: userParamsSchema,
      body: adminUpdateUserSchema,
    })(async (request, context, validated, user): Promise<NextResponse<unknown>> => {
      try {
        const { id } = validated.params!
        const updateData = validated.body!

        // Get target user
        const targetUser = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          }
        })

        if (!targetUser) {
          throw ApiErrors.notFound("User", id)
        }

        // Prevent role changes that could break system integrity
        if (updateData.role && updateData.role !== targetUser.role) {
          // Check if demoting the last admin
          if (targetUser.role === "ADMIN" && updateData.role !== "ADMIN") {
            const adminCount = await prisma.user.count({
              where: { 
                role: "ADMIN",
                isActive: true,
                id: { not: id }
              }
            })

            if (adminCount === 0) {
              throw ApiErrors.businessRule("Cannot change role of the last admin user")
            }
          }

          // Log role change in audit
          await auditPHIAccess(
            "update",
            "UserRole",
            user.id,
            targetUser.id,
            user.role,
            ["role"],
            AuditOutcome.SUCCESS,
            { 
              adminUpdate: true,
              roleChange: {
                from: targetUser.role,
                to: updateData.role,
              },
            }
          )
        }

        // Check if email is being changed and if it's already taken
        if (updateData.email && updateData.email !== targetUser.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: updateData.email },
            select: { id: true }
          })

          if (existingUser && existingUser.id !== id) {
            throw ApiErrors.businessRule("Email address is already in use")
          }
        }

        // Update user
        const updatedUser = await prisma.user.update({
          where: { id },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            phone: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            lastLogin: true,
          }
        })

        // Audit user update
        const updatedFields = Object.keys(updateData)
        await auditPHIAccess(
          "update",
          "UserProfile",
          user.id,
          targetUser.id,
          user.role,
          updatedFields,
          AuditOutcome.SUCCESS,
          { 
            adminUpdate: true,
            updatedFields,
            targetUserRole: targetUser.role,
          }
        )

        return ApiResponse.success(
          updatedUser,
          "User updated successfully"
        )
      } catch (error) {
        console.error("Update user error:", error)
        
        // Audit failed update
        await auditPHIAccess(
          "update",
          "UserProfile",
          user.id,
          validated.params?.id || "unknown",
          user.role,
          ["profile"],
          AuditOutcome.FAILURE,
          { 
            adminUpdate: true,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        )

        throw error instanceof ApiErrors.constructor ? error : ApiErrors.internal("Failed to update user")
      }
    })
  ),
  {
    enableRateLimit: true,
    rateLimitMax: 50, // Reasonable limit for admin operations
    enableRequestLogging: true,
  }
)

// DELETE - Delete user (admin only, soft delete)
export const DELETE = withApiMiddleware(
  withAdminAuth(
    withValidation({
      params: userParamsSchema,
    })(async (request, context, validated, user): Promise<NextResponse<unknown>> => {
      try {
        const { id } = validated.params!

        // Prevent self-deletion
        if (id === user.id) {
          throw ApiErrors.businessRule("Cannot delete your own account")
        }

        // Get target user
        const targetUser = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          }
        })

        if (!targetUser) {
          throw ApiErrors.notFound("User", id)
        }

        // Check if deleting the last admin
        if (targetUser.role === "ADMIN") {
          const adminCount = await prisma.user.count({
            where: { 
              role: "ADMIN",
              isActive: true,
              id: { not: id }
            }
          })

          if (adminCount === 0) {
            throw ApiErrors.businessRule("Cannot delete the last admin user")
          }
        }

        // Soft delete user and related data
        const deletedUser = await prisma.$transaction(async (tx: any) => {
          // Deactivate user
          const deactivatedUser = await tx.user.update({
            where: { id },
            data: {
              isActive: false,
              deactivatedAt: new Date(),
              deletedBy: user.id,
              updatedAt: new Date(),
            },
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
              deactivatedAt: true,
            }
          })

          // Cancel all future appointments
          await tx.appointment.updateMany({
            where: {
              OR: [
                { clientId: id },
                { herbalistId: id }
              ],
              startTime: { gt: new Date() },
              status: { not: "CANCELLED" }
            },
            data: {
              status: "CANCELLED",
              cancellationReason: "User account deleted",
              updatedAt: new Date(),
            },
          })

          return deactivatedUser
        })

        // Audit user deletion
        await auditPHIAccess(
          "delete",
          "UserAccount",
          user.id,
          targetUser.id,
          user.role,
          ["account", "appointments"],
          AuditOutcome.SUCCESS,
          { 
            adminDeletion: true,
            targetUserRole: targetUser.role,
            targetUserEmail: targetUser.email,
            appointmentsCancelled: true,
          }
        )

        return ApiResponse.success(
          {
            id: deletedUser.id,
            email: deletedUser.email,
            deactivatedAt: deletedUser.deactivatedAt,
          },
          "User deleted successfully"
        )
      } catch (error) {
        console.error("Delete user error:", error)
        
        // Audit failed deletion
        await auditPHIAccess(
          "delete",
          "UserAccount",
          user.id,
          validated.params?.id || "unknown",
          user.role,
          ["account"],
          AuditOutcome.FAILURE,
          { 
            adminDeletion: true,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        )

        throw error instanceof ApiErrors.constructor ? error : ApiErrors.internal("Failed to delete user")
      }
    })
  ),
  {
    enableRateLimit: true,
    rateLimitMax: 10, // Very restrictive for user deletion
    rateLimitWindow: 60 * 60 * 1000, // 1 hour window
    enableRequestLogging: true,
  }
)