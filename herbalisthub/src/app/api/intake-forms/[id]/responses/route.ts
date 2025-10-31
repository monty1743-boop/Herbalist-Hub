import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { z } from "zod"
import { Role } from "@prisma/client"
import { PHIEncryption } from "@/lib/encryption/crypto"
import { auditPHIAccess, validatePHI } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

// Response submission schema
const responseSchema = z.object({
  responses: z.record(z.any()), // Field ID -> response value mapping
  appointmentId: z.string().optional(),
  isDraft: z.boolean().default(false),
  metadata: z.object({
    startedAt: z.string().datetime().optional(),
    timeSpent: z.number().optional(), // seconds
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    deviceInfo: z.object({
      platform: z.string().optional(),
      browser: z.string().optional(),
      screenResolution: z.string().optional(),
    }).optional(),
  }).optional(),
})

const responseQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  clientId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  isReviewed: z.string().optional(),
  sortBy: z.enum(["completedAt", "createdAt", "clientName"]).optional().default("completedAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
})

// GET /api/intake-forms/[id]/responses - Get form responses
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can view all responses, clients can view their own
    if (![Role.HERBALIST, Role.ADMIN, Role.CLIENT].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = responseQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      clientId: searchParams.get("clientId") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      isReviewed: searchParams.get("isReviewed") || undefined,
      sortBy: searchParams.get("sortBy") || "completedAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    })

    // Verify form exists
    const form = await prisma.intakeForm.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, isActive: true }
    })

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      )
    }

    const page = parseInt(query.page)
    const limit = Math.min(parseInt(query.limit), 100)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = { formId: params.id }

    // For clients, only show their own responses
    if (session.user.role === Role.CLIENT) {
      where.clientId = session.user.id
    } else if (query.clientId) {
      where.clientId = query.clientId
    }

    // Date filtering
    if (query.dateFrom || query.dateTo) {
      where.completedAt = {}
      if (query.dateFrom) {
        where.completedAt.gte = new Date(query.dateFrom)
      }
      if (query.dateTo) {
        where.completedAt.lte = new Date(query.dateTo)
      }
    }

    // Review status filtering
    if (query.isReviewed !== undefined) {
      where.isReviewed = query.isReviewed === "true"
    }

    const [submissions, totalCount] = await Promise.all([
      prisma.intakeSubmission.findMany({
        where,
        select: {
          id: true,
          completedAt: true,
          isReviewed: true,
          reviewedAt: true,
          reviewNotes: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          updatedAt: true,
          // Include encrypted responses for herbalists/admins
          ...(session.user.role !== Role.CLIENT && {
            responses: true,
          }),
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          appointment: {
            select: {
              id: true,
              startTime: true,
              type: true,
            }
          }
        },
        orderBy: query.sortBy === "clientName" 
          ? { client: { name: query.sortOrder } }
          : { [query.sortBy]: query.sortOrder },
        skip,
        take: limit,
      }),
      prisma.intakeSubmission.count({ where }),
    ])

    // For herbalists/admins, decrypt PHI responses
    let processedSubmissions = submissions
    if (session.user.role !== Role.CLIENT) {
      processedSubmissions = submissions.map(submission => ({
        ...submission,
        responses: submission.responses 
          ? (() => {
              try {
                // Decrypt the responses if they're encrypted
                const decryptedResponses = PHIEncryption.isEncrypted(submission.responses)
                  ? JSON.parse(PHIEncryption.decrypt(submission.responses))
                  : submission.responses
                return decryptedResponses
              } catch (error) {
                console.error("Error decrypting responses:", error)
                return { error: "Unable to decrypt responses" }
              }
            })()
          : undefined,
      }))
    }

    // Audit the response access
    await auditPHIAccess(
      "read",
      "IntakeSubmissionList",
      params.id,
      session.user.id,
      session.user.role,
      ["submission_responses", "client_data"],
      AuditOutcome.SUCCESS,
      {
        formName: form.name,
        resultCount: submissions.length,
        totalCount,
        filters: query,
        hasDecryptedData: session.user.role !== Role.CLIENT,
      }
    )

    return NextResponse.json({
      submissions: processedSubmissions,
      form: {
        id: form.id,
        name: form.name,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
      summary: {
        totalSubmissions: totalCount,
        reviewedSubmissions: submissions.filter(s => s.isReviewed).length,
        pendingReview: submissions.filter(s => !s.isReviewed).length,
      }
    })
  } catch (error) {
    console.error("Error fetching form responses:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/intake-forms/[id]/responses - Submit form response
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only clients can submit responses, or herbalists on behalf of clients
    if (![Role.CLIENT, Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate response data
    const validationResult = responseSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const responseData = validationResult.data

    // Verify form exists and is active
    const form = await prisma.intakeForm.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        isActive: true,
        fields: true,
        validationRules: true,
      }
    })

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      )
    }

    if (!form.isActive) {
      return NextResponse.json(
        { error: "Form is not active" },
        { status: 409 }
      )
    }

    // Validate responses against form schema
    const validationErrors: string[] = []
    
    // TODO: Implement comprehensive form validation based on form.validationRules
    // This would validate required fields, data types, etc.

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Response validation failed", details: validationErrors },
        { status: 400 }
      )
    }

    // Validate PHI data before encryption
    const phiValidation = validatePHI(responseData.responses, "form_responses")
    if (!phiValidation.isValid) {
      return NextResponse.json(
        { error: "PHI validation failed", details: phiValidation.errors },
        { status: 400 }
      )
    }

    // Encrypt the responses (contains health information)
    const encryptedResponses = PHIEncryption.encrypt(JSON.stringify(responseData.responses))

    // Get client IP and user agent for audit
    const clientIP = request.headers.get("x-forwarded-for") || 
                    request.headers.get("x-real-ip") || 
                    "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Create the submission
    const submission = await prisma.intakeSubmission.create({
      data: {
        formId: params.id,
        clientId: session.user.id,
        appointmentId: responseData.appointmentId,
        responses: encryptedResponses,
        completedAt: responseData.isDraft ? null : new Date(),
        ipAddress: clientIP,
        userAgent: userAgent,
        isReviewed: false,
      },
      select: {
        id: true,
        completedAt: true,
        createdAt: true,
        form: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    // Audit the response submission
    await auditPHIAccess(
      "write",
      "IntakeSubmission",
      submission.id,
      session.user.id,
      session.user.role,
      ["submission_responses", "client_data"],
      AuditOutcome.SUCCESS,
      {
        formName: form.name,
        formId: form.id,
        isDraft: responseData.isDraft,
        responseFieldCount: Object.keys(responseData.responses).length,
        appointmentId: responseData.appointmentId,
        timeSpent: responseData.metadata?.timeSpent,
      }
    )

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        completedAt: submission.completedAt,
        isDraft: !submission.completedAt,
        form: submission.form,
      },
      message: responseData.isDraft 
        ? "Form draft saved successfully" 
        : "Form submitted successfully",
    }, { status: 201 })
  } catch (error) {
    console.error("Error submitting form response:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid response data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}