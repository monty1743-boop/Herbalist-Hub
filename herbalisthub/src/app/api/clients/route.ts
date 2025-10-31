import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { z } from "zod"
import { Role } from "@prisma/client"
import { PHIUtils, encryptClientProfile, createPHISearchTokens, auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

// Client profile validation schema
const clientProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required").optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default("US"),
  }).optional(),
  // PHI fields that will be encrypted
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
  // Consent and communication preferences
  communicationPreferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    phone: z.boolean().default(false),
    marketing: z.boolean().default(false),
  }).optional(),
  notes: z.string().optional(),
})

// GET - List clients with search and filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can access client data
    if (session.user.role !== Role.HERBALIST && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "25")
    const status = searchParams.get("status")
    const sortBy = searchParams.get("sortBy") || "lastName"
    const sortOrder = searchParams.get("sortOrder") || "asc"

    // Build where clause
    const where: any = {}
    
    // For herbalists, only show their own clients
    if (session.user.role === Role.HERBALIST) {
      where.herbalistId = session.user.id
    }

    if (search) {
      where.OR = [
        {
          firstName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      ]
    }

    if (status) {
      where.status = status
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get clients with basic information (no PHI)
    const [clients, totalCount] = await Promise.all([
      prisma.client.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastContactAt: true,
          nextAppointmentAt: true,
          herbalistId: true,
          herbalist: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              consultationNotes: true,
              appointments: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.client.count({ where }),
    ])

    // Audit the client list access
    await auditPHIAccess(
      "read",
      "ClientList",
      "multiple",
      session.user.id,
      session.user.role,
      ["basic_info"],
      AuditOutcome.SUCCESS,
      {
        searchQuery: search,
        resultCount: clients.length,
        totalCount,
        filters: { status },
        pagination: { page, limit },
      }
    )

    return NextResponse.json({
      clients,
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
    console.error("Error fetching clients:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create a new client profile
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can create client profiles
    if (session.user.role !== Role.HERBALIST && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate the client profile data
    const validationResult = clientProfileSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const clientData = validationResult.data

    // Extract PHI fields for encryption
    const phiFields = {
      allergies: clientData.allergies,
      medications: clientData.medications,
      conditions: clientData.conditions,
      healthGoals: clientData.healthGoals,
      emergencyContact: clientData.emergencyContact,
    }

    // Validate PHI data
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

    // Encrypt PHI fields
    const encryptedPHI = encryptClientProfile(phiFields)

    // Create search tokens for encrypted data
    const searchTokens = createPHISearchTokens({
      allergies: clientData.allergies?.join(" ") || "",
      medications: clientData.medications?.join(" ") || "",
      conditions: clientData.conditions?.join(" ") || "",
      healthGoals: clientData.healthGoals || "",
    })

    // Create the client record
    const client = await prisma.client.create({
      data: {
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        email: clientData.email,
        phone: clientData.phone,
        dateOfBirth: clientData.dateOfBirth ? new Date(clientData.dateOfBirth) : null,
        address: clientData.address,
        // Encrypted PHI fields
        allergies: encryptedPHI.allergies,
        medications: encryptedPHI.medications,
        conditions: encryptedPHI.conditions,
        healthGoals: encryptedPHI.healthGoals,
        emergencyContact: encryptedPHI.emergencyContact,
        // Search tokens for encrypted fields
        searchTokens,
        // Communication preferences
        communicationPreferences: clientData.communicationPreferences,
        notes: clientData.notes,
        // Link to herbalist
        herbalistId: session.user.role === Role.HERBALIST ? session.user.id : undefined,
        status: "ACTIVE",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Audit the client creation
    await auditPHIAccess(
      "write",
      "Client",
      client.id,
      session.user.id,
      session.user.role,
      Object.keys(phiFields).filter(key => phiFields[key as keyof typeof phiFields] !== undefined),
      AuditOutcome.SUCCESS,
      {
        clientEmail: client.email,
        createdFields: Object.keys(clientData),
        hasEncryptedFields: Object.values(phiFields).some(value => value !== undefined),
      }
    )

    return NextResponse.json(
      {
        success: true,
        client,
        message: "Client profile created successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating client:", error)
    
    // Audit the failed creation attempt
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "write",
          "Client",
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