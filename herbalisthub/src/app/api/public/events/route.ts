import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { z } from "zod"
import { addDays, startOfDay, endOfDay } from "date-fns"

const eventQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(["workshop", "consultation", "webinar", "retreat"]).optional(),
  status: z.enum(["upcoming", "past", "all"]).optional().default("upcoming"),
})

const registrationSchema = z.object({
  eventId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  specialRequirements: z.string().optional(),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
  }).optional(),
})

// GET /api/public/events - Get public events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = eventQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      category: searchParams.get("category") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      type: searchParams.get("type") || undefined,
      status: searchParams.get("status") || "upcoming",
    })

    const page = parseInt(query.page)
    const limit = Math.min(parseInt(query.limit), 50)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      isPublic: true,
      status: "PUBLISHED",
    }

    if (query.category) {
      where.category = query.category
    }

    if (query.type) {
      where.type = query.type.toUpperCase()
    }

    // Handle date filtering
    const now = new Date()
    if (query.status === "upcoming") {
      where.startDateTime = { gte: now }
    } else if (query.status === "past") {
      where.endDateTime = { lt: now }
    }

    if (query.startDate) {
      where.startDateTime = {
        ...where.startDateTime,
        gte: startOfDay(new Date(query.startDate)),
      }
    }

    if (query.endDate) {
      where.endDateTime = {
        ...where.endDateTime,
        lte: endOfDay(new Date(query.endDate)),
      }
    }

    const [events, totalCount] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: query.status === "past" 
          ? { startDateTime: "desc" }
          : { startDateTime: "asc" },
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
            },
          },
          _count: {
            select: {
              registrations: {
                where: {
                  status: "CONFIRMED",
                },
              },
            },
          },
        },
      }),
      prisma.event.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        category: event.category,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        location: event.location,
        isVirtual: event.isVirtual,
        maxAttendees: event.maxAttendees,
        price: event.price,
        currency: event.currency,
        image: event.image,
        organizer: event.organizer,
        registrationCount: event._count.registrations,
        availableSpots: event.maxAttendees ? event.maxAttendees - event._count.registrations : null,
        registrationDeadline: event.registrationDeadline,
        isRegistrationOpen: event.registrationDeadline 
          ? new Date() < event.registrationDeadline
          : new Date() < event.startDateTime,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Error fetching events:", error)
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    )
  }
}

// POST /api/public/events - Register for an event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = registrationSchema.parse(body)

    // Check if event exists and is available for registration
    const event = await prisma.event.findFirst({
      where: {
        id: data.eventId,
        isPublic: true,
        status: "PUBLISHED",
      },
      include: {
        _count: {
          select: {
            registrations: {
              where: {
                status: "CONFIRMED",
              },
            },
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json(
        { error: "Event not found or not available for registration" },
        { status: 404 }
      )
    }

    // Check if registration is still open
    const now = new Date()
    const registrationDeadline = event.registrationDeadline || event.startDateTime
    
    if (now >= registrationDeadline) {
      return NextResponse.json(
        { error: "Registration deadline has passed" },
        { status: 400 }
      )
    }

    // Check if event is full
    if (event.maxAttendees && event._count.registrations >= event.maxAttendees) {
      return NextResponse.json(
        { error: "Event is fully booked" },
        { status: 400 }
      )
    }

    // Check if user is already registered
    const existingRegistration = await prisma.eventRegistration.findFirst({
      where: {
        eventId: data.eventId,
        email: data.email,
      },
    })

    if (existingRegistration) {
      return NextResponse.json(
        { error: "You are already registered for this event" },
        { status: 400 }
      )
    }

    // Create registration
    const registration = await prisma.eventRegistration.create({
      data: {
        eventId: data.eventId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        specialRequirements: data.specialRequirements,
        emergencyContact: data.emergencyContact,
        status: "CONFIRMED",
        registeredAt: new Date(),
      },
    })

    // TODO: Send confirmation email
    // await sendEventConfirmationEmail(registration, event)

    return NextResponse.json({
      success: true,
      message: "Successfully registered for the event",
      registrationId: registration.id,
      confirmationCode: registration.confirmationCode,
    })
  } catch (error) {
    console.error("Error registering for event:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid registration data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to register for event" },
      { status: 500 }
    )
  }
}