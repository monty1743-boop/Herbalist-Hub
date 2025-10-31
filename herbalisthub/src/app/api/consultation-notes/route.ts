import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { z } from "zod"
import { Role } from "@prisma/client"
import { PHIUtils, encryptClientProfile, createPHISearchTokens, auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

// Consultation note validation schema
const consultationNoteSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  type: z.enum([
    "INITIAL_CONSULTATION",
    "FOLLOW_UP",
    "TREATMENT_PLAN",
    "PROGRESS_NOTE",
    "DISCHARGE_SUMMARY",
    "EMERGENCY_NOTE",
    "PHONE_CONSULTATION",
    "VIDEO_CONSULTATION"
  ]),
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  content: z.string().min(1, "Content is required"),
  summary: z.string().max(500, "Summary must be 500 characters or less").optional(),
  
  // Assessment fields
  chiefComplaint: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  
  // Vital signs and measurements
  vitalSigns: z.object({
    bloodPressure: z.string().optional(),
    heartRate: z.number().min(0).max(300).optional(),
    temperature: z.number().min(70).max(120).optional(),
    weight: z.number().min(0).max(1000).optional(),
    height: z.number().min(0).max(120).optional(),
    bmi: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
  }).optional(),
  
  // Recommendations and prescriptions
  recommendations: z.array(z.string()).optional(),
  prescriptions: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().optional(),
  })).optional(),
  
  // Follow-up information
  followUpDate: z.string().optional(),
  followUpInstructions: z.string().optional(),
  
  // Administrative fields
  duration: z.number().min(1).max(480).optional(), // Minutes
  status: z.enum(["DRAFT", "COMPLETED", "REVIEWED", "SIGNED"]).default("DRAFT"),
  tags: z.array(z.string()).optional(),
  isPrivate: z.boolean().default(false),
  
  // Treatment-specific fields
  treatmentModalities: z.array(z.string()).optional(),
  herbalRecommendations: z.array(z.object({
    herb: z.string(),
    preparation: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    purpose: z.string(),
  })).optional(),
  lifestyleRecommendations: z.array(z.string()).optional(),
  
  // Outcome tracking
  clientResponse: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "UNKNOWN"]).optional(),
  sideEffects: z.array(z.string()).optional(),
  complianceNotes: z.string().optional(),
})

// GET - List consultation notes with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can access consultation notes
    if (session.user.role !== Role.HERBALIST && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "25")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    // Build where clause
    const where: any = {}
    
    // For herbalists, only show notes for their clients
    if (session.user.role === Role.HERBALIST) {
      where.client = {
        herbalistId: session.user.id
      }
    }

    // Filter by client
    if (clientId) {
      where.clientId = clientId
    }

    // Filter by type
    if (type) {
      where.type = type
    }

    // Filter by status
    if (status) {
      where.status = status
    }

    // Don't show private notes unless user is the author or admin
    if (session.user.role !== Role.ADMIN) {
      where.OR = [
        { isPrivate: false },
        { authorId: session.user.id }
      ]
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get consultation notes
    const [notes, totalCount] = await Promise.all([
      prisma.consultationNote.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          summary: true,
          status: true,
          isPrivate: true,
          duration: true,
          createdAt: true,
          updatedAt: true,
          followUpDate: true,
          tags: true,
          clientResponse: true,
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              attachments: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.consultationNote.count({ where }),
    ])

    // Audit the notes list access
    await auditPHIAccess(
      "read",
      "ConsultationNoteList",
      "multiple",
      session.user.id,
      session.user.role,
      ["basic_info"],
      AuditOutcome.SUCCESS,
      {
        resultCount: notes.length,
        totalCount,
        filters: { clientId, type, status },
        pagination: { page, limit },
      }
    )

    return NextResponse.json({
      notes,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Error fetching consultation notes:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create a new consultation note
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can create consultation notes
    if (session.user.role !== Role.HERBALIST && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate the consultation note data
    const validationResult = consultationNoteSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const noteData = validationResult.data

    // Verify client access
    const client = await prisma.client.findUnique({
      where: { id: noteData.clientId },
      select: {
        id: true,
        herbalistId: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // For herbalists, ensure they can only create notes for their clients
    if (session.user.role === Role.HERBALIST && client.herbalistId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Extract and encrypt sensitive fields
    const sensitiveFields = {
      content: noteData.content,
      chiefComplaint: noteData.chiefComplaint,
      assessment: noteData.assessment,
      plan: noteData.plan,
      vitalSigns: noteData.vitalSigns ? JSON.stringify(noteData.vitalSigns) : undefined,
      recommendations: noteData.recommendations ? JSON.stringify(noteData.recommendations) : undefined,
      prescriptions: noteData.prescriptions ? JSON.stringify(noteData.prescriptions) : undefined,
      followUpInstructions: noteData.followUpInstructions,
      herbalRecommendations: noteData.herbalRecommendations ? JSON.stringify(noteData.herbalRecommendations) : undefined,
      lifestyleRecommendations: noteData.lifestyleRecommendations ? JSON.stringify(noteData.lifestyleRecommendations) : undefined,
      sideEffects: noteData.sideEffects ? JSON.stringify(noteData.sideEffects) : undefined,
      complianceNotes: noteData.complianceNotes,
    }

    // Validate sensitive data
    for (const [fieldName, fieldValue] of Object.entries(sensitiveFields)) {
      if (fieldValue !== undefined) {
        const validation = PHIUtils.validatePHI(fieldValue, fieldName)
        if (!validation.isValid) {
          return NextResponse.json(
            {
              error: "PHI validation failed",
              details: validation.errors,
            },
            { status: 400 }
          )
        }
      }
    }

    // Encrypt sensitive fields
    const encryptedFields = encryptClientProfile(sensitiveFields)

    // Create search tokens for consultation content
    const searchTokens = createPHISearchTokens({
      content: noteData.content,
      summary: noteData.summary || "",
      chiefComplaint: noteData.chiefComplaint || "",
      assessment: noteData.assessment || "",
      plan: noteData.plan || "",
    })

    // Create the consultation note
    const consultationNote = await prisma.consultationNote.create({
      data: {
        clientId: noteData.clientId,
        authorId: session.user.id,
        type: noteData.type,
        title: noteData.title,
        summary: noteData.summary,
        
        // Encrypted sensitive fields
        content: encryptedFields.content,
        chiefComplaint: encryptedFields.chiefComplaint,
        assessment: encryptedFields.assessment,
        plan: encryptedFields.plan,
        vitalSigns: encryptedFields.vitalSigns,
        recommendations: encryptedFields.recommendations,
        prescriptions: encryptedFields.prescriptions,
        followUpInstructions: encryptedFields.followUpInstructions,
        herbalRecommendations: encryptedFields.herbalRecommendations,
        lifestyleRecommendations: encryptedFields.lifestyleRecommendations,
        sideEffects: encryptedFields.sideEffects,
        complianceNotes: encryptedFields.complianceNotes,
        
        // Search tokens
        searchTokens,
        
        // Non-sensitive fields
        followUpDate: noteData.followUpDate ? new Date(noteData.followUpDate) : null,
        duration: noteData.duration,
        status: noteData.status,
        tags: noteData.tags,
        isPrivate: noteData.isPrivate,
        treatmentModalities: noteData.treatmentModalities,
        clientResponse: noteData.clientResponse,
      },
      select: {
        id: true,
        type: true,
        title: true,
        summary: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Update client's last contact date
    await prisma.client.update({
      where: { id: noteData.clientId },
      data: { lastContactAt: new Date() },
    })

    // Audit the consultation note creation
    await auditPHIAccess(
      "write",
      "ConsultationNote",
      consultationNote.id,
      session.user.id,
      session.user.role,
      Object.keys(sensitiveFields).filter(key => sensitiveFields[key as keyof typeof sensitiveFields] !== undefined),
      AuditOutcome.SUCCESS,
      {
        clientId: noteData.clientId,
        clientName: `${client.firstName} ${client.lastName}`,
        noteType: noteData.type,
        noteTitle: noteData.title,
        hasEncryptedFields: Object.values(sensitiveFields).some(value => value !== undefined),
      }
    )

    return NextResponse.json(
      {
        success: true,
        consultationNote,
        message: "Consultation note created successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating consultation note:", error)
    
    // Audit the failed creation attempt
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "write",
          "ConsultationNote",
          "unknown",
          session.user.id,
          session.user.role,
          ["attempted_creation"],
          AuditOutcome.FAILURE,
          {
            error: error instanceof Error ? error.message : "Unknown error",
          }
        )
      }
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError)
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}