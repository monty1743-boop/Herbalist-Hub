import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { z } from "zod"
import { Role } from "@prisma/client"
import { GoogleCalendarSync } from "@/lib/calendar/google-sync"

// Availability query schema
const availabilityQuerySchema = z.object({
  herbalistId: z.string().uuid("Invalid herbalist ID"),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid start date"),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid end date"),
  duration: z.number().min(15).max(480).default(60), // Default 1 hour
  bufferTime: z.number().min(0).max(120).default(15), // Default 15-minute buffer
  includeGoogleCalendar: z.boolean().default(true),
})

interface TimeSlot {
  start: Date
  end: Date
  available: boolean
  reason?: string
}

interface WorkingHours {
  dayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
  startTime: string // "09:00"
  endTime: string // "17:00"
  isWorkingDay: boolean
}

// Default working hours (can be customized per herbalist)
const DEFAULT_WORKING_HOURS: WorkingHours[] = [
  { dayOfWeek: 0, startTime: "10:00", endTime: "16:00", isWorkingDay: false }, // Sunday
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isWorkingDay: true },  // Monday
  { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isWorkingDay: true },  // Tuesday
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isWorkingDay: true },  // Wednesday
  { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isWorkingDay: true },  // Thursday
  { dayOfWeek: 5, startTime: "09:00", endTime: "15:00", isWorkingDay: true },  // Friday
  { dayOfWeek: 6, startTime: "10:00", endTime: "14:00", isWorkingDay: false }, // Saturday
]

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const queryData = {
      herbalistId: searchParams.get("herbalistId"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      duration: parseInt(searchParams.get("duration") || "60"),
      bufferTime: parseInt(searchParams.get("bufferTime") || "15"),
      includeGoogleCalendar: searchParams.get("includeGoogleCalendar") !== "false",
    }

    const validationResult = availabilityQuerySchema.safeParse(queryData)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { herbalistId, startDate, endDate, duration, bufferTime, includeGoogleCalendar } = validationResult.data

    // Verify herbalist exists and access permissions
    const herbalist = await prisma.user.findUnique({
      where: { id: herbalistId },
      select: {
        id: true,
        name: true,
        role: true,
        workingHours: true, // Assuming this field exists or will be added
      },
    })

    if (!herbalist) {
      return NextResponse.json({ error: "Herbalist not found" }, { status: 404 })
    }

    if (herbalist.role !== Role.HERBALIST) {
      return NextResponse.json({ error: "User is not a herbalist" }, { status: 400 })
    }

    // For herbalists, ensure they can only check their own availability unless admin
    if (session.user.role === Role.HERBALIST && herbalistId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (end <= start) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
    }

    // Get existing appointments for the date range
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        herbalistId,
        status: {
          in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"],
        },
        startTime: { gte: start },
        endTime: { lte: end },
      },
      select: {
        startTime: true,
        endTime: true,
        title: true,
        type: true,
      },
      orderBy: { startTime: "asc" },
    })

    // Get Google Calendar events if enabled
    let googleCalendarEvents: any[] = []
    if (includeGoogleCalendar) {
      try {
        const googleCalendarSync = new GoogleCalendarSync()
        googleCalendarEvents = await googleCalendarSync.getEvents(herbalistId, start, end)
      } catch (error) {
        console.error("Failed to fetch Google Calendar events:", error)
        // Continue without Google Calendar data
      }
    }

    // Get working hours (use custom or default)
    const workingHours = herbalist.workingHours || DEFAULT_WORKING_HOURS

    // Generate availability slots
    const availabilitySlots = generateAvailabilitySlots(
      start,
      end,
      duration,
      bufferTime,
      existingAppointments,
      googleCalendarEvents,
      workingHours
    )

    // Group by date for easier consumption
    const availabilityByDate = groupAvailabilityByDate(availabilitySlots)

    return NextResponse.json({
      herbalistId,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      requestedDuration: duration,
      bufferTime,
      availability: availabilityByDate,
      stats: {
        totalSlots: availabilitySlots.length,
        availableSlots: availabilitySlots.filter(slot => slot.available).length,
        blockedSlots: availabilitySlots.filter(slot => !slot.available).length,
      },
    })
  } catch (error) {
    console.error("Error checking availability:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

function generateAvailabilitySlots(
  startDate: Date,
  endDate: Date,
  duration: number,
  bufferTime: number,
  existingAppointments: any[],
  googleCalendarEvents: any[],
  workingHours: WorkingHours[]
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const slotDuration = duration + bufferTime // Include buffer in slot duration
  
  // Generate slots for each day
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    const dayWorkingHours = workingHours.find(wh => wh.dayOfWeek === dayOfWeek)
    
    if (!dayWorkingHours || !dayWorkingHours.isWorkingDay) {
      // Skip non-working days
      currentDate.setDate(currentDate.getDate() + 1)
      continue
    }

    // Parse working hours for this day
    const [startHour, startMinute] = dayWorkingHours.startTime.split(":").map(Number)
    const [endHour, endMinute] = dayWorkingHours.endTime.split(":").map(Number)
    
    const dayStart = new Date(currentDate)
    dayStart.setHours(startHour, startMinute, 0, 0)
    
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(endHour, endMinute, 0, 0)
    
    // Generate slots for this day
    const slotStart = new Date(dayStart)
    
    while (slotStart.getTime() + (slotDuration * 60 * 1000) <= dayEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + (duration * 60 * 1000))
      const bufferEnd = new Date(slotStart.getTime() + (slotDuration * 60 * 1000))
      
      // Check if slot conflicts with existing appointments
      const isConflicted = checkSlotConflict(
        slotStart,
        bufferEnd,
        existingAppointments,
        googleCalendarEvents
      )
      
      slots.push({
        start: new Date(slotStart),
        end: new Date(slotEnd),
        available: !isConflicted.hasConflict,
        reason: isConflicted.reason,
      })
      
      // Move to next slot (typically 15-30 minute intervals)
      slotStart.setMinutes(slotStart.getMinutes() + 30)
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return slots
}

function checkSlotConflict(
  slotStart: Date,
  slotEnd: Date,
  existingAppointments: any[],
  googleCalendarEvents: any[]
): { hasConflict: boolean; reason?: string } {
  // Check against existing appointments
  for (const appointment of existingAppointments) {
    if (
      slotStart < appointment.endTime &&
      slotEnd > appointment.startTime
    ) {
      return {
        hasConflict: true,
        reason: `Conflicts with ${appointment.title} (${appointment.type})`,
      }
    }
  }
  
  // Check against Google Calendar events
  for (const event of googleCalendarEvents) {
    const eventStart = new Date(event.start.dateTime || event.start.date)
    const eventEnd = new Date(event.end.dateTime || event.end.date)
    
    if (slotStart < eventEnd && slotEnd > eventStart) {
      return {
        hasConflict: true,
        reason: `Conflicts with Google Calendar event: ${event.summary}`,
      }
    }
  }
  
  return { hasConflict: false }
}

function groupAvailabilityByDate(slots: TimeSlot[]) {
  const grouped: Record<string, TimeSlot[]> = {}
  
  for (const slot of slots) {
    const dateKey = slot.start.toISOString().split('T')[0]
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    
    grouped[dateKey].push(slot)
  }
  
  return grouped
}

// POST - Suggest alternative times when requested time is unavailable
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    const requestSchema = z.object({
      herbalistId: z.string().uuid(),
      preferredTime: z.string().refine((date) => !isNaN(Date.parse(date))),
      duration: z.number().min(15).max(480).default(60),
      flexibilityDays: z.number().min(1).max(30).default(7),
      preferredTimeOfDay: z.enum(["MORNING", "AFTERNOON", "EVENING", "ANY"]).default("ANY"),
    })
    
    const validationResult = requestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.errors },
        { status: 400 }
      )
    }
    
    const { herbalistId, preferredTime, duration, flexibilityDays, preferredTimeOfDay } = validationResult.data
    
    const preferredDate = new Date(preferredTime)
    const searchStart = new Date(preferredDate)
    searchStart.setDate(searchStart.getDate() - 1) // Start from day before
    
    const searchEnd = new Date(preferredDate)
    searchEnd.setDate(searchEnd.getDate() + flexibilityDays)
    
    // Get availability for the extended period
    const availabilityResponse = await fetch(
      `${request.url}?herbalistId=${herbalistId}&startDate=${searchStart.toISOString()}&endDate=${searchEnd.toISOString()}&duration=${duration}`,
      { headers: { cookie: request.headers.get("cookie") || "" } }
    )
    
    if (!availabilityResponse.ok) {
      throw new Error("Failed to fetch availability")
    }
    
    const availabilityData = await availabilityResponse.json()
    
    // Extract available slots and sort by preference
    const availableSlots: TimeSlot[] = []
    
    Object.entries(availabilityData.availability).forEach(([date, slots]) => {
      (slots as TimeSlot[]).forEach(slot => {
        if (slot.available) {
          availableSlots.push(slot)
        }
      })
    })
    
    // Sort suggestions by proximity to preferred time and time of day preference
    const suggestions = availableSlots
      .map(slot => ({
        ...slot,
        score: calculateSlotScore(slot, preferredDate, preferredTimeOfDay),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Return top 10 suggestions
    
    return NextResponse.json({
      originalRequest: {
        preferredTime: preferredDate.toISOString(),
        duration,
        flexibilityDays,
        preferredTimeOfDay,
      },
      suggestions: suggestions.map(({ score, ...slot }) => slot),
      totalAvailableSlots: availableSlots.length,
    })
  } catch (error) {
    console.error("Error generating alternative suggestions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

function calculateSlotScore(
  slot: TimeSlot,
  preferredTime: Date,
  preferredTimeOfDay: string
): number {
  let score = 0
  
  // Score based on proximity to preferred date (higher = closer)
  const daysDifference = Math.abs(
    (slot.start.getTime() - preferredTime.getTime()) / (1000 * 60 * 60 * 24)
  )
  score += Math.max(0, 10 - daysDifference) * 10
  
  // Score based on time of day preference
  const slotHour = slot.start.getHours()
  
  switch (preferredTimeOfDay) {
    case "MORNING":
      if (slotHour >= 7 && slotHour < 12) score += 20
      break
    case "AFTERNOON":
      if (slotHour >= 12 && slotHour < 17) score += 20
      break
    case "EVENING":
      if (slotHour >= 17 && slotHour < 21) score += 20
      break
    case "ANY":
      score += 10 // Neutral bonus
      break
  }
  
  // Bonus for same day of week as preferred
  if (slot.start.getDay() === preferredTime.getDay()) {
    score += 15
  }
  
  // Bonus for business hours (9 AM - 5 PM)
  if (slotHour >= 9 && slotHour < 17) {
    score += 5
  }
  
  return score
}