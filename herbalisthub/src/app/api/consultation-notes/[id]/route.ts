import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { z } from "zod"
import { Role } from "@prisma/client"
import { 
  PHIUtils, 
  encryptClientProfile, 
  decryptClientProfile, 
  createPHISearchTokens, 
  auditPHIAccess 
} from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

interface RouteParams {
  params: {
    id: string
  }
}

// Update consultation note schema
const updateConsultationNoteSchema = z.object({
  type: z.enum([
    "INITIAL_CONSULTATION",
    "FOLLOW_UP",
    "TREATMENT_PLAN",
    "PROGRESS_NOTE",
    "DISCHARGE_SUMMARY",
    "EMERGENCY_NOTE",
    "PHONE_CONSULTATION",
    "VIDEO_CONSULTATION"
  ]).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().max(500).optional(),
  
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
  duration: z.number().min(1).max(480).optional(),
  status: z.enum(["DRAFT", "COMPLETED", "REVIEWED", "SIGNED"]).optional(),
  tags: z.array(z.string()).optional(),
  isPrivate: z.boolean().optional(),
  
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

async function checkNoteAccess(
  noteId: string, 
  userId: string, 
  userRole: string
): Promise<{ hasAccess: boolean; note?: any; error?: string }> {
  try {
    const note = await prisma.consultationNote.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        authorId: true,
        isPrivate: true,
        client: {
          select: {
            id: true,
            herbalistId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!note) {
      return { hasAccess: false, error: "Consultation note not found" }
    }

    // Admin has access to all notes
    if (userRole === Role.ADMIN) {
      return { hasAccess: true, note }
    }

    // Herbalists can access notes for their clients
    if (userRole === Role.HERBALIST && note.client.herbalistId === userId) {
      return { hasAccess: true, note }
    }

    // Authors can access their own notes
    if (note.authorId === userId) {
      return { hasAccess: true, note }
    }

    // Private notes are only accessible to author and admin
    if (note.isPrivate && note.authorId !== userId && userRole !== Role.ADMIN) {
      return { hasAccess: false, error: "Access denied to private note" }
    }

    return { hasAccess: false, error: "Access denied" }
  } catch (error) {
    return { hasAccess: false, error: "Database error" }
  }
}

// GET - Get individual consultation note
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const noteId = params.id

    // Check access permissions
    const accessCheck = await checkNoteAccess(noteId, session.user.id, session.user.role)
    
    if (!accessCheck.hasAccess) {
      await auditPHIAccess(
        "read",
        "ConsultationNote",
        noteId,
        session.user.id,
        session.user.role,
        ["attempted_access"],
        AuditOutcome.FAILURE,
        { reason: accessCheck.error }
      )
      
      return NextResponse.json(
        { error: accessCheck.error || "Access denied" },
        { status: 403 }
      )
    }

    // Get full consultation note including encrypted fields
    const consultationNote = await prisma.consultationNote.findUnique({
      where: { id: noteId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            status: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            uploadedAt: true,
          },
        },
      },
    })

    if (!consultationNote) {
      return NextResponse.json({ error: "Consultation note not found" }, { status: 404 })
    }

    // Decrypt sensitive fields for authorized access
    const sensitiveFields = {
      content: consultationNote.content,
      chiefComplaint: consultationNote.chiefComplaint,
      assessment: consultationNote.assessment,
      plan: consultationNote.plan,
      vitalSigns: consultationNote.vitalSigns,
      recommendations: consultationNote.recommendations,
      prescriptions: consultationNote.prescriptions,
      followUpInstructions: consultationNote.followUpInstructions,
      herbalRecommendations: consultationNote.herbalRecommendations,
      lifestyleRecommendations: consultationNote.lifestyleRecommendations,
      sideEffects: consultationNote.sideEffects,
      complianceNotes: consultationNote.complianceNotes,
    }

    const decryptedFields = decryptClientProfile(sensitiveFields)

    // Parse JSON fields
    const parsedFields = {
      ...decryptedFields,
      vitalSigns: decryptedFields.vitalSigns ? JSON.parse(decryptedFields.vitalSigns) : null,
      recommendations: decryptedFields.recommendations ? JSON.parse(decryptedFields.recommendations) : null,
      prescriptions: decryptedFields.prescriptions ? JSON.parse(decryptedFields.prescriptions) : null,
      herbalRecommendations: decryptedFields.herbalRecommendations ? JSON.parse(decryptedFields.herbalRecommendations) : null,
      lifestyleRecommendations: decryptedFields.lifestyleRecommendations ? JSON.parse(decryptedFields.lifestyleRecommendations) : null,
      sideEffects: decryptedFields.sideEffects ? JSON.parse(decryptedFields.sideEffects) : null,
    }

    // Prepare response data
    const responseData = {
      ...consultationNote,
      // Replace encrypted fields with decrypted ones
      ...parsedFields,
      // Remove search tokens from response
      searchTokens: undefined,
    }

    // Audit the access
    const accessedFields = Object.keys(sensitiveFields).filter(
      key => sensitiveFields[key as keyof typeof sensitiveFields] !== undefined && sensitiveFields[key as keyof typeof sensitiveFields] !== null
    )

    await auditPHIAccess(
      "read",
      "ConsultationNote",
      noteId,
      session.user.id,
      session.user.role,
      ["consultation_note", ...accessedFields],
      AuditOutcome.SUCCESS,
      {
        clientId: consultationNote.clientId,
        clientName: `${consultationNote.client.firstName} ${consultationNote.client.lastName}`,
        noteType: consultationNote.type,
        noteTitle: consultationNote.title,
        accessType: "full_note",
      }
    )

    return NextResponse.json({
      consultationNote: responseData,
    })
  } catch (error) {
    console.error("Error fetching consultation note:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update consultation note
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const noteId = params.id

    // Check access permissions
    const accessCheck = await checkNoteAccess(noteId, session.user.id, session.user.role)
    
    if (!accessCheck.hasAccess) {
      await auditPHIAccess(
        "update",
        "ConsultationNote",
        noteId,
        session.user.id,
        session.user.role,
        ["attempted_update"],
        AuditOutcome.FAILURE,
        { reason: accessCheck.error }
      )
      
      return NextResponse.json(
        { error: accessCheck.error || "Access denied" },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate the update data
    const validationResult = updateConsultationNoteSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Extract sensitive fields for encryption
    const sensitiveFields = {
      content: updateData.content,
      chiefComplaint: updateData.chiefComplaint,
      assessment: updateData.assessment,
      plan: updateData.plan,
      vitalSigns: updateData.vitalSigns ? JSON.stringify(updateData.vitalSigns) : undefined,
      recommendations: updateData.recommendations ? JSON.stringify(updateData.recommendations) : undefined,
      prescriptions: updateData.prescriptions ? JSON.stringify(updateData.prescriptions) : undefined,
      followUpInstructions: updateData.followUpInstructions,
      herbalRecommendations: updateData.herbalRecommendations ? JSON.stringify(updateData.herbalRecommendations) : undefined,
      lifestyleRecommendations: updateData.lifestyleRecommendations ? JSON.stringify(updateData.lifestyleRecommendations) : undefined,
      sideEffects: updateData.sideEffects ? JSON.stringify(updateData.sideEffects) : undefined,
      complianceNotes: updateData.complianceNotes,
    }

    // Validate sensitive data if present
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

    // Prepare update data
    const dbUpdateData: any = {
      ...updateData,
      updatedAt: new Date(),
    }

    // Handle sensitive fields
    if (Object.values(sensitiveFields).some(value => value !== undefined)) {
      // Encrypt sensitive fields that are being updated
      const encryptedFields = encryptClientProfile(sensitiveFields)
      
      // Update encrypted fields
      Object.entries(encryptedFields).forEach(([key, value]) => {
        if (value !== undefined) {
          dbUpdateData[key] = value
        }
      })

      // Update search tokens if content changed
      if (updateData.content || updateData.summary || updateData.chiefComplaint || updateData.assessment || updateData.plan) {
        const searchableData = {
          content: updateData.content || "",
          summary: updateData.summary || "",
          chiefComplaint: updateData.chiefComplaint || "",
          assessment: updateData.assessment || "",
          plan: updateData.plan || "",
        }

        if (Object.values(searchableData).some(value => value.length > 0)) {
          dbUpdateData.searchTokens = createPHISearchTokens(searchableData)
        }
      }
    }

    // Handle follow-up date
    if (updateData.followUpDate !== undefined) {
      dbUpdateData.followUpDate = updateData.followUpDate ? new Date(updateData.followUpDate) : null
    }

    // Update the consultation note
    const updatedNote = await prisma.consultationNote.update({
      where: { id: noteId },
      data: dbUpdateData,
      select: {
        id: true,
        type: true,
        title: true,
        summary: true,
        status: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Audit the update
    const updatedFields = Object.keys(updateData).filter(
      key => updateData[key as keyof typeof updateData] !== undefined
    )

    await auditPHIAccess(
      "update",
      "ConsultationNote",
      noteId,
      session.user.id,
      session.user.role,
      updatedFields,
      AuditOutcome.SUCCESS,
      {
        clientId: updatedNote.client.id,
        clientName: `${updatedNote.client.firstName} ${updatedNote.client.lastName}`,
        noteType: updatedNote.type,
        noteTitle: updatedNote.title,
        updatedFields,
        hasEncryptedFields: Object.values(sensitiveFields).some(value => value !== undefined),
      }
    )

    return NextResponse.json({
      success: true,
      consultationNote: updatedNote,
      message: "Consultation note updated successfully",
    })
  } catch (error) {
    console.error("Error updating consultation note:", error)
    
    // Audit the failed update
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "update",
          "ConsultationNote",
          params.id,
          session.user.id,
          session.user.role,
          ["attempted_update"],
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

// DELETE - Delete consultation note (soft delete for compliance)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only the author or admin can delete consultation notes
    const noteId = params.id

    const note = await prisma.consultationNote.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        authorId: true,
        title: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!note) {
      return NextResponse.json({ error: "Consultation note not found" }, { status: 404 })
    }

    if (note.authorId !== session.user.id && session.user.role !== Role.ADMIN) {
      await auditPHIAccess(
        "delete",
        "ConsultationNote",
        noteId,
        session.user.id,
        session.user.role,
        ["attempted_delete"],
        AuditOutcome.FAILURE,
        { reason: "unauthorized_delete_attempt" }
      )

      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Soft delete by updating status and adding deletion timestamp
    const deletedNote = await prisma.consultationNote.update({
      where: { id: noteId },
      data: {
        status: "ARCHIVED",
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        status: true,
        deletedAt: true,
      },
    })

    // Audit the deletion
    await auditPHIAccess(
      "delete",
      "ConsultationNote",
      noteId,
      session.user.id,
      session.user.role,
      ["status"],
      AuditOutcome.SUCCESS,
      {
        clientId: note.client.id,
        clientName: `${note.client.firstName} ${note.client.lastName}`,
        noteTitle: note.title,
        action: "soft_delete",
        reason: "manual_deletion",
      }
    )

    return NextResponse.json({
      success: true,
      consultationNote: deletedNote,
      message: "Consultation note deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting consultation note:", error)
    
    // Audit the failed deletion
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "delete",
          "ConsultationNote",
          params.id,
          session.user.id,
          session.user.role,
          ["attempted_delete"],
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