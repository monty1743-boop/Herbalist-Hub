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

// Client profile update schema
const updateClientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default("US"),
  }).optional(),
  // PHI fields
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  healthGoals: z.string().optional(),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
    email: z.string().email().optional(),
  }).optional(),
  communicationPreferences: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    phone: z.boolean().optional(),
    marketing: z.boolean().optional(),
  }).optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
})

async function checkClientAccess(
  clientId: string, 
  userId: string, 
  userRole: string
): Promise<{ hasAccess: boolean; client?: any; error?: string }> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        herbalistId: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
      },
    })

    if (!client) {
      return { hasAccess: false, error: "Client not found" }
    }

    // Admin has access to all clients
    if (userRole === Role.ADMIN) {
      return { hasAccess: true, client }
    }

    // Herbalists can only access their own clients
    if (userRole === Role.HERBALIST && client.herbalistId === userId) {
      return { hasAccess: true, client }
    }

    // Clients can only access their own profile
    if (userRole === Role.CLIENT && client.id === userId) {
      return { hasAccess: true, client }
    }

    return { hasAccess: false, error: "Access denied" }
  } catch (error) {
    return { hasAccess: false, error: "Database error" }
  }
}

// GET - Get individual client profile
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clientId = params.id

    // Check access permissions
    const accessCheck = await checkClientAccess(clientId, session.user.id, session.user.role)
    
    if (!accessCheck.hasAccess) {
      await auditPHIAccess(
        "read",
        "Client",
        clientId,
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

    // Get full client profile including encrypted PHI
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        herbalist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        consultationNotes: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            type: true,
            status: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5, // Recent notes only
        },
        appointments: {
          where: {
            startTime: {
              gte: new Date(),
            },
          },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            type: true,
          },
          orderBy: {
            startTime: "asc",
          },
          take: 3, // Upcoming appointments only
        },
        _count: {
          select: {
            consultationNotes: true,
            appointments: true,
            intakeSubmissions: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Decrypt PHI fields for authorized access
    const phiFields = {
      allergies: client.allergies,
      medications: client.medications,
      conditions: client.conditions,
      healthGoals: client.healthGoals,
      emergencyContact: client.emergencyContact,
    }

    const decryptedPHI = decryptClientProfile(phiFields)

    // Prepare response data (exclude encrypted fields, include decrypted)
    const responseData = {
      ...client,
      // Replace encrypted fields with decrypted ones
      allergies: decryptedPHI.allergies,
      medications: decryptedPHI.medications,
      conditions: decryptedPHI.conditions,
      healthGoals: decryptedPHI.healthGoals,
      emergencyContact: decryptedPHI.emergencyContact,
      // Remove search tokens from response
      searchTokens: undefined,
    }

    // Audit the PHI access
    const accessedFields = Object.keys(phiFields).filter(
      key => phiFields[key as keyof typeof phiFields] !== undefined && phiFields[key as keyof typeof phiFields] !== null
    )

    await auditPHIAccess(
      "read",
      "Client",
      clientId,
      session.user.id,
      session.user.role,
      ["profile", ...accessedFields],
      AuditOutcome.SUCCESS,
      {
        clientEmail: client.email,
        accessType: "full_profile",
        includedRelations: ["herbalist", "consultationNotes", "appointments"],
      }
    )

    return NextResponse.json({
      client: responseData,
    })
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update client profile
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clientId = params.id

    // Check access permissions
    const accessCheck = await checkClientAccess(clientId, session.user.id, session.user.role)
    
    if (!accessCheck.hasAccess) {
      await auditPHIAccess(
        "update",
        "Client",
        clientId,
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
    const validationResult = updateClientSchema.safeParse(body)
    
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

    // Extract PHI fields for encryption
    const phiFields = {
      allergies: updateData.allergies,
      medications: updateData.medications,
      conditions: updateData.conditions,
      healthGoals: updateData.healthGoals,
      emergencyContact: updateData.emergencyContact,
    }

    // Validate PHI data if present
    for (const [fieldName, fieldValue] of Object.entries(phiFields)) {
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

    // Handle PHI fields
    if (Object.values(phiFields).some(value => value !== undefined)) {
      // Encrypt PHI fields that are being updated
      const encryptedPHI = encryptClientProfile(phiFields)
      
      // Update encrypted fields
      Object.entries(encryptedPHI).forEach(([key, value]) => {
        if (value !== undefined) {
          dbUpdateData[key] = value
        }
      })

      // Update search tokens if PHI changed
      const searchableData = {
        allergies: updateData.allergies?.join(" ") || "",
        medications: updateData.medications?.join(" ") || "",
        conditions: updateData.conditions?.join(" ") || "",
        healthGoals: updateData.healthGoals || "",
      }

      if (Object.values(searchableData).some(value => value.length > 0)) {
        dbUpdateData.searchTokens = createPHISearchTokens(searchableData)
      }
    }

    // Update the client record
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: dbUpdateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        address: true,
        status: true,
        communicationPreferences: true,
        notes: true,
        updatedAt: true,
        herbalist: {
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
      "Client",
      clientId,
      session.user.id,
      session.user.role,
      updatedFields,
      AuditOutcome.SUCCESS,
      {
        clientEmail: updatedClient.email,
        updatedFields,
        hasEncryptedFields: Object.values(phiFields).some(value => value !== undefined),
      }
    )

    return NextResponse.json({
      success: true,
      client: updatedClient,
      message: "Client profile updated successfully",
    })
  } catch (error) {
    console.error("Error updating client:", error)
    
    // Audit the failed update
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "update",
          "Client",
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

// DELETE - Archive client profile (soft delete for compliance)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can archive clients
    if (session.user.role !== Role.HERBALIST && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const clientId = params.id

    // Check access permissions
    const accessCheck = await checkClientAccess(clientId, session.user.id, session.user.role)
    
    if (!accessCheck.hasAccess) {
      await auditPHIAccess(
        "delete",
        "Client",
        clientId,
        session.user.id,
        session.user.role,
        ["attempted_archive"],
        AuditOutcome.FAILURE,
        { reason: accessCheck.error }
      )
      
      return NextResponse.json(
        { error: accessCheck.error || "Access denied" },
        { status: 403 }
      )
    }

    // Soft delete by updating status to ARCHIVED
    const archivedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        archivedAt: true,
      },
    })

    // Audit the archival
    await auditPHIAccess(
      "delete",
      "Client",
      clientId,
      session.user.id,
      session.user.role,
      ["status"],
      AuditOutcome.SUCCESS,
      {
        clientEmail: archivedClient.email,
        action: "soft_delete_archive",
        reason: "manual_archival",
      }
    )

    return NextResponse.json({
      success: true,
      client: archivedClient,
      message: "Client profile archived successfully",
    })
  } catch (error) {
    console.error("Error archiving client:", error)
    
    // Audit the failed archival
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "delete",
          "Client",
          params.id,
          session.user.id,
          session.user.role,
          ["attempted_archive"],
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