import { NextRequest, NextResponse } from "next/server"
import { withHerbalistAuth } from "@/lib/auth/api-middleware"
import { withApiMiddleware } from "@/lib/api/middleware"
import { withValidation, ValidationSchemas, QueryValidation } from "@/lib/api/validation"
import { ApiResponse, ApiErrors } from "@/lib/api/errors"
import { withConsultationNotesAudit } from "@/lib/audit/middleware"
import { prisma } from "@/lib/db/client"
import { z } from "zod"

// Query parameters schema for GET requests
const consultationQuerySchema = z.object({
  ...QueryValidation.pagination.shape,
  ...QueryValidation.search.shape,
  ...QueryValidation.dateRange.shape,
  clientId: z.string().cuid().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
})

// GET - List consultations with filtering, pagination, and search
export const GET = withApiMiddleware(
  withHerbalistAuth(
    withValidation({
      query: consultationQuerySchema,
    })(async (request, context, validated, user) => {
      try {
        const { page, limit, q, sort, order, startDate, endDate, clientId, status } = validated.query!

        // Build where clause for filtering
        const where: any = {}

        // Search functionality
        if (q) {
          where.OR = [
            { chiefComplaint: { contains: q, mode: "insensitive" } },
            { assessment: { contains: q, mode: "insensitive" } },
            { client: { name: { contains: q, mode: "insensitive" } } },
          ]
        }

        // Date range filtering
        if (startDate || endDate) {
          where.sessionDate = {}
          if (startDate) where.sessionDate.gte = new Date(startDate)
          if (endDate) where.sessionDate.lte = new Date(endDate)
        }

        // Client filtering
        if (clientId) {
          where.clientProfileId = clientId
        }

        // Status filtering (assuming we add status to the schema)
        if (status) {
          where.status = status
        }

        // Non-admin users can only see their own consultations
        if (user.role !== "ADMIN") {
          // In a real implementation, you'd filter by herbalist assignments
          // For now, we'll show all consultations for herbalists
        }

        const skip = (page - 1) * limit

        // Get total count for pagination
        const total = await prisma.consultationNote.count({ where })

        // Get consultations with related data
        const consultations = await prisma.consultationNote.findMany({
          where,
          skip,
          take: limit,
          orderBy: sort ? { [sort]: order } : { sessionDate: "desc" },
          include: {
            clientProfile: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              }
            },
            appointment: {
              select: {
                id: true,
                title: true,
                type: true,
                status: true,
              }
            }
          }
        })

        return ApiResponse.paginated(
          consultations,
          { page, limit, total },
          "Consultations retrieved successfully"
        )
      } catch (error) {
        console.error("Get consultations error:", error)
        throw ApiErrors.internal("Failed to retrieve consultations")
      }
    })
  ),
  {
    enableRateLimit: true,
    rateLimitMax: 100,
    enableRequestLogging: true,
  }
)

// POST - Create new consultation note
export const POST = withApiMiddleware(
  withHerbalistAuth(
    withConsultationNotesAudit(
      withValidation({
        body: ValidationSchemas.consultationNote.extend({
          clientProfileId: z.string().cuid("Invalid client profile ID"),
          appointmentId: z.string().cuid().optional(),
        }),
      })(async (request, context, validated, user) => {
        try {
          const consultationData = validated.body!

          // Verify client profile exists and user has access
          const clientProfile = await prisma.clientProfile.findUnique({
            where: { id: consultationData.clientProfileId },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                }
              }
            }
          })

          if (!clientProfile) {
            throw ApiErrors.notFound("Client profile", consultationData.clientProfileId)
          }

          // Verify it's actually a client
          if (clientProfile.user.role !== "CLIENT") {
            throw ApiErrors.businessRule("Can only create consultations for clients")
          }

          // If appointment is specified, verify it exists and belongs to this client
          if (consultationData.appointmentId) {
            const appointment = await prisma.appointment.findUnique({
              where: { id: consultationData.appointmentId },
            })

            if (!appointment) {
              throw ApiErrors.notFound("Appointment", consultationData.appointmentId)
            }

            if (appointment.clientId !== clientProfile.userId) {
              throw ApiErrors.businessRule("Appointment does not belong to this client")
            }
          }

          // Validate session date is not in the future
          const sessionDate = new Date(consultationData.sessionDate)
          if (sessionDate > new Date()) {
            throw ApiErrors.businessRule("Session date cannot be in the future")
          }

          // Create consultation note
          // PHI fields will be automatically encrypted by Prisma middleware
          const consultation = await prisma.consultationNote.create({
            data: {
              ...consultationData,
              sessionDate,
            },
            include: {
              clientProfile: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    }
                  }
                }
              },
              appointment: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                }
              }
            }
          })

          return ApiResponse.created(
            consultation,
            "Consultation note created successfully"
          )
        } catch (error) {
          console.error("Create consultation error:", error)
          if (error instanceof ApiErrors.constructor) {
            throw error
          }
          throw ApiErrors.internal("Failed to create consultation note")
        }
      })
    )
  ),
  {
    enableRateLimit: true,
    rateLimitMax: 20, // More restrictive for write operations
    enableRequestLogging: true,
    maxRequestSize: 1024 * 1024, // 1MB limit for consultation notes
  }
)