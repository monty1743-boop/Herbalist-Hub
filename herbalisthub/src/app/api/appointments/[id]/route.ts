import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { z } from "zod"
import { Role } from "@prisma/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { GoogleCalendarSync } from "@/lib/calendar/google-sync"

interface RouteParams {
  params: {
    id: string
  }
}

// Update appointment schema (all fields optional for updates)
const updateAppointmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  
  startTime: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid start time").optional(),
  endTime: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid end time").optional(),
  duration: z.number().min(15).max(480).optional(),
  
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
  ]).optional(),
  
  location: z.object({
    type: z.enum(["IN_PERSON", "PHONE", "VIDEO", "CLIENT_HOME"]),
    address: z.string().optional(),
    phoneNumber: z.string().optional(),
    videoLink: z.string().url().optional(),
    notes: z.string().optional(),
  }).optional(),
  
  fee: z.number().min(0).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "PARTIAL", "REFUNDED", "WAIVED"]).optional(),
  
  status: z.enum([
    "SCHEDULED",
    "CONFIRMED", 
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
    "RESCHEDULED"
  ]).optional(),
  
  reminderSettings: z.object({
    enabled: z.boolean().default(true),
    emailReminders: z.array(z.number()).default([1440, 60]),
    smsReminders: z.array(z.number()).default([60]),
    customMessage: z.string().optional(),
  }).optional(),
  
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
  
  syncWithGoogleCalendar: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
})

async function checkAppointmentAccess(
  appointmentId: string,
  userId: string,
  userRole: string
): Promise<{ hasAccess: boolean; appointment?: any; error?: string }> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        clientId: true,
        herbalistId: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            herbalistId: true,
          },
        },
      },
    })

    if (!appointment) {
      return { hasAccess: false, error: "Appointment not found" }
    }

    // Admin has access to all appointments
    if (userRole === Role.ADMIN) {
      return { hasAccess: true, appointment }
    }

    // Herbalists can access appointments for their clients
    if (userRole === Role.HERBALIST && appointment.herbalistId === userId) {
      return { hasAccess: true, appointment }
    }

    // Clients can access their own appointments
    if (userRole === Role.CLIENT && appointment.clientId === userId) {
      return { hasAccess: true, appointment }
    }

    return { hasAccess: false, error: "Access denied" }
  } catch (error) {
    return { hasAccess: false, error: "Database error" }
  }
}

// GET - Get individual appointment
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const appointmentId = params.id

    // Check access permissions
    const accessCheck = await checkAppointmentAccess(appointmentId, session.user.id, session.user.role)
    
    if (!accessCheck.hasAccess) {
      await auditPHIAccess(
        "read",
        "Appointment",
        appointmentId,
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

    // Get full appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
          },
        },
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
            title: true,
            type: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
        _count: {
          select: {
            consultationNotes: true,
          },
        },
      },
    })

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Remove internal notes for client users
    const responseData = {
      ...appointment,
      internalNotes: session.user.role === Role.CLIENT ? undefined : appointment.internalNotes,
    }

    // Audit the access
    await auditPHIAccess(
      "read",
      "Appointment",
      appointmentId,
      session.user.id,
      session.user.role,
      ["appointment_details"],
      AuditOutcome.SUCCESS,
      {
        clientId: appointment.clientId,
        clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
        appointmentType: appointment.type,
        appointmentTime: appointment.startTime.toISOString(),
        accessType: "full_appointment",
      }
    )

    return NextResponse.json({
      appointment: responseData,
    })
  } catch (error) {
    console.error("Error fetching appointment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update appointment
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const appointmentId = params.id

    // Check access permissions (only herbalists and admins can update)
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const accessCheck = await checkAppointmentAccess(appointmentId, session.user.id, session.user.role)
    
    if (!accessCheck.hasAccess) {
      await auditPHIAccess(
        "update",
        "Appointment",
        appointmentId,
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
    
    // Validate update data
    const validationResult = updateAppointmentSchema.safeParse(body)
    
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

    // If updating times, validate them
    if (updateData.startTime || updateData.endTime) {
      const currentAppointment = accessCheck.appointment
      const newStartTime = updateData.startTime ? new Date(updateData.startTime) : currentAppointment.startTime
      const newEndTime = updateData.endTime ? new Date(updateData.endTime) : currentAppointment.endTime
      
      if (newEndTime <= newStartTime) {
        return NextResponse.json(
          { error: "End time must be after start time" },
          { status: 400 }
        )
      }

      // Check for conflicts if times are changing
      if (updateData.startTime || updateData.endTime) {
        const conflictingAppointments = await prisma.appointment.findMany({
          where: {
            id: { not: appointmentId },
            herbalistId: currentAppointment.herbalistId,
            status: {
              in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"],
            },
            OR: [
              {
                startTime: { lt: newEndTime },
                endTime: { gt: newStartTime },
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
      }
    }

    // Prepare update data
    const dbUpdateData: any = {
      ...updateData,
      updatedAt: new Date(),
    }

    // Handle date conversions
    if (updateData.startTime) {
      dbUpdateData.startTime = new Date(updateData.startTime)
    }
    if (updateData.endTime) {
      dbUpdateData.endTime = new Date(updateData.endTime)
    }

    // Update the appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: dbUpdateData,
      include: {
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
          },
        },
      },
    })

    // Sync with Google Calendar if enabled and times changed
    if (updatedAppointment.syncWithGoogleCalendar && (updateData.startTime || updateData.endTime || updateData.title)) {
      try {
        const googleCalendarSync = new GoogleCalendarSync()
        await googleCalendarSync.updateAppointment(appointmentId, {
          title: updatedAppointment.title,
          startTime: updatedAppointment.startTime,
          endTime: updatedAppointment.endTime,
          description: updatedAppointment.description,
        })
      } catch (syncError) {
        console.error("Google Calendar sync failed:", syncError)
        // Continue without failing the update
      }
    }

    // Update client's next appointment if this is the next one
    if (updateData.startTime && updatedAppointment.startTime > new Date()) {
      const nextAppointment = await prisma.appointment.findFirst({
        where: {
          clientId: updatedAppointment.clientId,
          startTime: { gte: new Date() },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        orderBy: { startTime: "asc" },
      })

      await prisma.client.update({
        where: { id: updatedAppointment.clientId },
        data: { nextAppointmentAt: nextAppointment?.startTime || null },
      })
    }

    // Audit the update
    const updatedFields = Object.keys(updateData).filter(
      key => updateData[key as keyof typeof updateData] !== undefined
    )

    await auditPHIAccess(
      "update",
      "Appointment",
      appointmentId,
      session.user.id,
      session.user.role,
      updatedFields,
      AuditOutcome.SUCCESS,
      {
        clientId: updatedAppointment.clientId,
        clientName: `${updatedAppointment.client.firstName} ${updatedAppointment.client.lastName}`,
        appointmentType: updatedAppointment.type,
        updatedFields,
        hasGoogleSync: updatedAppointment.syncWithGoogleCalendar,
      }
    )

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
      message: "Appointment updated successfully",
    })
  } catch (error) {
    console.error("Error updating appointment:", error)
    
    // Audit the failed update
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "update",
          "Appointment",
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

// DELETE - Cancel appointment (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const appointmentId = params.id

    // Check access permissions (herbalists, admins, and clients can cancel)
    const accessCheck = await checkAppointmentAccess(appointmentId, session.user.id, session.user.role)
    
    if (!accessCheck.hasAccess) {
      await auditPHIAccess(
        "delete",
        "Appointment",
        appointmentId,
        session.user.id,
        session.user.role,
        ["attempted_cancellation"],
        AuditOutcome.FAILURE,
        { reason: accessCheck.error }
      )
      
      return NextResponse.json(
        { error: accessCheck.error || "Access denied" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reason = searchParams.get("reason") || "Cancelled by user"

    // Update appointment status to cancelled
    const cancelledAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
        updatedAt: new Date(),
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Remove from Google Calendar if synced
    if (cancelledAppointment.syncWithGoogleCalendar) {
      try {
        const googleCalendarSync = new GoogleCalendarSync()
        await googleCalendarSync.deleteAppointment(appointmentId)
      } catch (syncError) {
        console.error("Google Calendar sync failed:", syncError)
        // Continue without failing the cancellation
      }
    }

    // Update client's next appointment
    const nextAppointment = await prisma.appointment.findFirst({
      where: {
        clientId: cancelledAppointment.clientId,
        startTime: { gte: new Date() },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
      orderBy: { startTime: "asc" },
    })

    await prisma.client.update({
      where: { id: cancelledAppointment.clientId },
      data: { nextAppointmentAt: nextAppointment?.startTime || null },
    })

    // Audit the cancellation
    await auditPHIAccess(
      "delete",
      "Appointment",
      appointmentId,
      session.user.id,
      session.user.role,
      ["status"],
      AuditOutcome.SUCCESS,
      {
        clientId: cancelledAppointment.clientId,
        clientName: `${cancelledAppointment.client.firstName} ${cancelledAppointment.client.lastName}`,
        appointmentType: cancelledAppointment.type,
        appointmentTime: cancelledAppointment.startTime.toISOString(),
        action: "cancellation",
        reason,
        cancelledBy: session.user.role,
      }
    )

    return NextResponse.json({
      success: true,
      appointment: cancelledAppointment,
      message: "Appointment cancelled successfully",
    })
  } catch (error) {
    console.error("Error cancelling appointment:", error)
    
    // Audit the failed cancellation
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "delete",
          "Appointment",
          params.id,
          session.user.id,
          session.user.role,
          ["attempted_cancellation"],
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