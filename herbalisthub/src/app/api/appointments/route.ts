import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { z } from "zod"
import { Role } from "@prisma/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { GoogleCalendarSync } from "@/lib/calendar/google-sync"

// Appointment validation schema
const appointmentSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  herbalistId: z.string().uuid("Invalid herbalist ID").optional(),
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
  
  // Scheduling information
  startTime: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid start time"),
  endTime: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid end time"),
  duration: z.number().min(15).max(480), // 15 minutes to 8 hours
  
  // Appointment configuration
  type: z.enum([
    "INITIAL_CONSULTATION",
    "FOLLOW_UP",
    "HERBAL_CONSULTATION",
    "LIFESTYLE_CONSULTATION",
    "PHONE_CONSULTATION",
    "VIDEO_CONSULTATION",
    "IN_PERSON",
    "GROUP_SESSION",
    "WORKSHOP"
  ]),
  
  location: z.object({
    type: z.enum(["IN_PERSON", "PHONE", "VIDEO", "CLIENT_HOME"]),
    address: z.string().optional(),
    phoneNumber: z.string().optional(),
    videoLink: z.string().url().optional(),
    notes: z.string().optional(),
  }),
  
  // Pricing and payment
  fee: z.number().min(0).optional(),
  currency: z.string().length(3).default("USD"),
  paymentStatus: z.enum(["PENDING", "PAID", "PARTIAL", "REFUNDED", "WAIVED"]).default("PENDING"),
  
  // Status and workflow
  status: z.enum([
    "SCHEDULED", 
    "CONFIRMED", 
    "IN_PROGRESS", 
    "COMPLETED", 
    "CANCELLED", 
    "NO_SHOW", 
    "RESCHEDULED"
  ]).default("SCHEDULED"),
  
  // Reminder settings
  reminderSettings: z.object({
    enabled: z.boolean().default(true),
    emailReminders: z.array(z.number()).default([1440, 60]), // 24h and 1h in minutes
    smsReminders: z.array(z.number()).default([60]), // 1h in minutes
    customMessage: z.string().optional(),
  }).optional(),
  
  // Additional metadata
  isRecurring: z.boolean().default(false),
  recurringPattern: z.object({
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    interval: z.number().min(1).max(52), // Max 52 weeks
    endDate: z.string().optional(),
    maxOccurrences: z.number().min(1).max(100).optional(),
  }).optional(),
  
  notes: z.string().max(2000, "Notes must be 2000 characters or less").optional(),
  internalNotes: z.string().max(2000, "Internal notes must be 2000 characters or less").optional(),
  
  // Integration settings
  syncWithGoogleCalendar: z.boolean().default(true),
  isPrivate: z.boolean().default(false),
})

// GET - List appointments with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists, admins, and clients can access appointments
    if (![Role.HERBALIST, Role.ADMIN, Role.CLIENT].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const herbalistId = searchParams.get("herbalistId")
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const sortBy = searchParams.get("sortBy") || "startTime"
    const sortOrder = searchParams.get("sortOrder") || "asc"

    // Build where clause based on user role and filters
    const where: any = {}
    
    // Role-based access control
    if (session.user.role === Role.HERBALIST) {
      where.herbalistId = session.user.id
    } else if (session.user.role === Role.CLIENT) {
      where.clientId = session.user.id
    }

    // Apply filters
    if (clientId) where.clientId = clientId
    if (herbalistId && session.user.role === Role.ADMIN) where.herbalistId = herbalistId
    if (status) where.status = status
    if (type) where.type = type

    // Date range filtering
    if (startDate || endDate) {
      where.startTime = {}
      if (startDate) where.startTime.gte = new Date(startDate)
      if (endDate) where.startTime.lte = new Date(endDate)
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get appointments
    const [appointments, totalCount] = await Promise.all([
      prisma.appointment.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          startTime: true,
          endTime: true,
          duration: true,
          type: true,
          location: true,
          status: true,
          fee: true,
          currency: true,
          paymentStatus: true,
          isRecurring: true,
          notes: true,
          // Include internal notes only for herbalists and admins
          internalNotes: session.user.role === Role.CLIENT ? false : true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          herbalist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              consultationNotes: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ])

    // Audit the appointment list access
    await auditPHIAccess(
      "read",
      "AppointmentList",
      "multiple",
      session.user.id,
      session.user.role,
      ["basic_info"],
      AuditOutcome.SUCCESS,
      {
        resultCount: appointments.length,
        totalCount,
        filters: { clientId, herbalistId, status, type, startDate, endDate },
        pagination: { page, limit },
      }
    )

    return NextResponse.json({
      appointments,
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
    console.error("Error fetching appointments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create a new appointment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can create appointments directly
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate appointment data
    const validationResult = appointmentSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const appointmentData = validationResult.data

    // Validate start/end times
    const startTime = new Date(appointmentData.startTime)
    const endTime = new Date(appointmentData.endTime)
    
    if (endTime <= startTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      )
    }

    // Verify client exists and access permissions
    const client = await prisma.client.findUnique({
      where: { id: appointmentData.clientId },
      select: {
        id: true,
        herbalistId: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // For herbalists, ensure they can only create appointments for their clients
    if (session.user.role === Role.HERBALIST && client.herbalistId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Set herbalist ID (from client's herbalist or current user if admin)
    const finalHerbalistId = appointmentData.herbalistId || client.herbalistId || session.user.id

    // Check for appointment conflicts
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        herbalistId: finalHerbalistId,
        status: {
          in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"],
        },
        OR: [
          {
            startTime: {
              lt: endTime,
            },
            endTime: {
              gt: startTime,
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
      },
    })

    if (conflictingAppointments.length > 0) {
      return NextResponse.json(
        {
          error: "Appointment conflict detected",
          conflicts: conflictingAppointments,
        },
        { status: 409 }
      )
    }

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        clientId: appointmentData.clientId,
        herbalistId: finalHerbalistId,
        title: appointmentData.title,
        description: appointmentData.description,
        startTime,
        endTime,
        duration: appointmentData.duration,
        type: appointmentData.type,
        location: appointmentData.location,
        fee: appointmentData.fee,
        currency: appointmentData.currency,
        paymentStatus: appointmentData.paymentStatus,
        status: appointmentData.status,
        reminderSettings: appointmentData.reminderSettings,
        isRecurring: appointmentData.isRecurring,
        recurringPattern: appointmentData.recurringPattern,
        notes: appointmentData.notes,
        internalNotes: appointmentData.internalNotes,
        syncWithGoogleCalendar: appointmentData.syncWithGoogleCalendar,
        isPrivate: appointmentData.isPrivate,
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        type: true,
        status: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        herbalist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Sync with Google Calendar if enabled
    if (appointmentData.syncWithGoogleCalendar) {
      try {
        const googleCalendarSync = new GoogleCalendarSync()
        await googleCalendarSync.createAppointment(appointment.id, {
          title: appointment.title,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          description: appointmentData.description,
          attendees: [client.email].filter(Boolean),
        })
      } catch (syncError) {
        console.error("Google Calendar sync failed:", syncError)
        // Continue without failing the appointment creation
      }
    }

    // Update client's next appointment
    await prisma.client.update({
      where: { id: appointmentData.clientId },
      data: { nextAppointmentAt: startTime },
    })

    // Audit the appointment creation
    await auditPHIAccess(
      "write",
      "Appointment",
      appointment.id,
      session.user.id,
      session.user.role,
      ["appointment_data"],
      AuditOutcome.SUCCESS,
      {
        clientId: appointmentData.clientId,
        clientName: `${client.firstName} ${client.lastName}`,
        appointmentType: appointmentData.type,
        appointmentTime: startTime.toISOString(),
        hasGoogleSync: appointmentData.syncWithGoogleCalendar,
      }
    )

    return NextResponse.json(
      {
        success: true,
        appointment,
        message: "Appointment created successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating appointment:", error)
    
    // Audit the failed creation attempt
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "write",
          "Appointment",
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