import { prisma } from "@/lib/db/client"
import { GoogleCalendarSync } from "@/lib/calendar/google-sync"

export interface AppointmentConflict {
  id: string
  type: "APPOINTMENT" | "GOOGLE_CALENDAR" | "BREAK" | "UNAVAILABLE"
  title: string
  startTime: Date
  endTime: Date
  description?: string
  severity: "HIGH" | "MEDIUM" | "LOW"
  resolutionSuggestions: string[]
}

export interface ConflictCheckResult {
  hasConflicts: boolean
  conflicts: AppointmentConflict[]
  suggestedAlternatives: AlternativeTimeSlot[]
}

export interface AlternativeTimeSlot {
  startTime: Date
  endTime: Date
  score: number
  reason: string
}

export class AppointmentConflictDetector {
  /**
   * Check for conflicts when scheduling a new appointment
   */
  static async checkNewAppointmentConflicts(
    herbalistId: string,
    startTime: Date,
    endTime: Date,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<ConflictCheckResult> {
    try {
      const conflicts: AppointmentConflict[] = []

      // Check against existing appointments
      const existingAppointments = await this.getExistingAppointments(
        herbalistId,
        startTime,
        endTime,
        excludeAppointmentId
      )

      for (const appointment of existingAppointments) {
        if (this.timeSlotsOverlap(startTime, endTime, appointment.startTime, appointment.endTime)) {
          conflicts.push({
            id: appointment.id,
            type: "APPOINTMENT",
            title: appointment.title,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            description: `Existing appointment with ${appointment.client?.firstName} ${appointment.client?.lastName}`,
            severity: "HIGH",
            resolutionSuggestions: [
              "Reschedule one of the appointments",
              "Check if the existing appointment can be moved",
              "Consider extending or reducing appointment duration",
            ],
          })
        }
      }

      // Check against Google Calendar events
      const googleCalendarConflicts = await this.checkGoogleCalendarConflicts(
        herbalistId,
        startTime,
        endTime
      )
      conflicts.push(...googleCalendarConflicts)

      // Check against working hours and break times
      const scheduleConflicts = await this.checkScheduleConflicts(
        herbalistId,
        startTime,
        endTime
      )
      conflicts.push(...scheduleConflicts)

      // Generate alternative time slots if conflicts exist
      const suggestedAlternatives = conflicts.length > 0
        ? await this.generateAlternativeTimeSlots(herbalistId, startTime, duration)
        : []

      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        suggestedAlternatives,
      }
    } catch (error) {
      console.error("Error checking appointment conflicts:", error)
      return {
        hasConflicts: true,
        conflicts: [{
          id: "error",
          type: "UNAVAILABLE",
          title: "Error checking availability",
          startTime,
          endTime,
          description: "Unable to verify availability due to system error",
          severity: "HIGH",
          resolutionSuggestions: ["Try again later", "Contact support"],
        }],
        suggestedAlternatives: [],
      }
    }
  }

  /**
   * Get existing appointments that might conflict
   */
  private static async getExistingAppointments(
    herbalistId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string
  ) {
    const where: any = {
      herbalistId,
      status: {
        in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"],
      },
      OR: [
        {
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      ],
    }

    if (excludeAppointmentId) {
      where.id = { not: excludeAppointmentId }
    }

    return prisma.appointment.findMany({
      where,
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        type: true,
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
    })
  }

  /**
   * Check for conflicts with Google Calendar events
   */
  private static async checkGoogleCalendarConflicts(
    herbalistId: string,
    startTime: Date,
    endTime: Date
  ): Promise<AppointmentConflict[]> {
    try {
      const googleSync = new GoogleCalendarSync()
      const events = await googleSync.getEvents(herbalistId, startTime, endTime)
      
      const conflicts: AppointmentConflict[] = []

      for (const event of events) {
        // Skip events created by our system
        if (event.extendedProperties?.private?.herbalistHubSource === "appointment") {
          continue
        }

        const eventStart = new Date(event.start.dateTime || event.start.date)
        const eventEnd = new Date(event.end.dateTime || event.end.date)

        if (this.timeSlotsOverlap(startTime, endTime, eventStart, eventEnd)) {
          conflicts.push({
            id: event.id,
            type: "GOOGLE_CALENDAR",
            title: event.summary || "Google Calendar Event",
            startTime: eventStart,
            endTime: eventEnd,
            description: `Google Calendar: ${event.description || "No description"}`,
            severity: event.transparency === "transparent" ? "LOW" : "HIGH",
            resolutionSuggestions: [
              "Check if Google Calendar event can be moved",
              "Consider if this is a blocking event",
              "Update Google Calendar event status if possible",
            ],
          })
        }
      }

      return conflicts
    } catch (error) {
      console.error("Error checking Google Calendar conflicts:", error)
      return []
    }
  }

  /**
   * Check for conflicts with working hours and scheduled breaks
   */
  private static async checkScheduleConflicts(
    herbalistId: string,
    startTime: Date,
    endTime: Date
  ): Promise<AppointmentConflict[]> {
    const conflicts: AppointmentConflict[] = []

    // Get herbalist's working hours and break schedule
    const herbalist = await prisma.user.findUnique({
      where: { id: herbalistId },
      select: {
        workingHours: true,
        breakSchedule: true,
        timeZone: true,
      },
    })

    if (!herbalist) {
      return conflicts
    }

    // Check against working hours
    const dayOfWeek = startTime.getDay()
    const workingHours = herbalist.workingHours || this.getDefaultWorkingHours()
    
    const daySchedule = workingHours.find((wh: any) => wh.dayOfWeek === dayOfWeek)
    
    if (!daySchedule || !daySchedule.isWorkingDay) {
      conflicts.push({
        id: "non-working-day",
        type: "UNAVAILABLE",
        title: "Non-working day",
        startTime,
        endTime,
        description: "Appointment scheduled on a non-working day",
        severity: "MEDIUM",
        resolutionSuggestions: [
          "Schedule on a working day",
          "Update working hours if this should be available",
        ],
      })
    } else {
      // Check if appointment is within working hours
      const appointmentStart = startTime.getHours() * 60 + startTime.getMinutes()
      const appointmentEnd = endTime.getHours() * 60 + endTime.getMinutes()
      
      const [workStartHour, workStartMin] = daySchedule.startTime.split(":").map(Number)
      const [workEndHour, workEndMin] = daySchedule.endTime.split(":").map(Number)
      
      const workStart = workStartHour * 60 + workStartMin
      const workEnd = workEndHour * 60 + workEndMin

      if (appointmentStart < workStart || appointmentEnd > workEnd) {
        conflicts.push({
          id: "outside-working-hours",
          type: "UNAVAILABLE",
          title: "Outside working hours",
          startTime,
          endTime,
          description: `Working hours: ${daySchedule.startTime} - ${daySchedule.endTime}`,
          severity: "MEDIUM",
          resolutionSuggestions: [
            "Schedule within working hours",
            "Extend working hours if needed",
            "Consider urgent appointment policy",
          ],
        })
      }
    }

    // Check against scheduled breaks
    if (herbalist.breakSchedule) {
      for (const breakTime of herbalist.breakSchedule) {
        const breakStart = new Date(breakTime.startTime)
        const breakEnd = new Date(breakTime.endTime)

        if (this.timeSlotsOverlap(startTime, endTime, breakStart, breakEnd)) {
          conflicts.push({
            id: `break-${breakTime.id}`,
            type: "BREAK",
            title: breakTime.title || "Scheduled break",
            startTime: breakStart,
            endTime: breakEnd,
            description: "Appointment conflicts with scheduled break time",
            severity: "MEDIUM",
            resolutionSuggestions: [
              "Schedule before or after break time",
              "Consider rescheduling the break if flexible",
              "Reduce appointment duration to fit before break",
            ],
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Generate alternative time slots when conflicts exist
   */
  private static async generateAlternativeTimeSlots(
    herbalistId: string,
    preferredTime: Date,
    duration: number
  ): Promise<AlternativeTimeSlot[]> {
    const alternatives: AlternativeTimeSlot[] = []
    
    // Search window: 3 days before and 7 days after preferred time
    const searchStart = new Date(preferredTime)
    searchStart.setDate(searchStart.getDate() - 3)
    
    const searchEnd = new Date(preferredTime)
    searchEnd.setDate(searchEnd.getDate() + 7)

    // Get availability for the search window
    try {
      const response = await fetch(
        `/api/appointments/availability?herbalistId=${herbalistId}&startDate=${searchStart.toISOString()}&endDate=${searchEnd.toISOString()}&duration=${duration}`
      )
      
      if (response.ok) {
        const availabilityData = await response.json()
        
        // Extract available slots
        Object.entries(availabilityData.availability).forEach(([date, slots]) => {
          (slots as any[]).forEach(slot => {
            if (slot.available) {
              const slotStart = new Date(slot.start)
              const slotEnd = new Date(slot.end)
              
              alternatives.push({
                startTime: slotStart,
                endTime: slotEnd,
                score: this.calculateAlternativeScore(slotStart, preferredTime),
                reason: this.generateAlternativeReason(slotStart, preferredTime),
              })
            }
          })
        })
      }
    } catch (error) {
      console.error("Error generating alternative time slots:", error)
    }

    // Sort by score (highest first) and return top 5
    return alternatives
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }

  /**
   * Calculate score for alternative time slot
   */
  private static calculateAlternativeScore(slotTime: Date, preferredTime: Date): number {
    let score = 100

    // Distance penalty (closer to preferred time = higher score)
    const hoursDifference = Math.abs(slotTime.getTime() - preferredTime.getTime()) / (1000 * 60 * 60)
    score -= Math.min(hoursDifference * 2, 50) // Max 50 point penalty

    // Same day bonus
    if (slotTime.toDateString() === preferredTime.toDateString()) {
      score += 20
    }

    // Same time of day bonus
    const slotHour = slotTime.getHours()
    const preferredHour = preferredTime.getHours()
    const hourDifference = Math.abs(slotHour - preferredHour)
    
    if (hourDifference <= 1) {
      score += 15
    } else if (hourDifference <= 2) {
      score += 10
    }

    // Business hours bonus
    if (slotHour >= 9 && slotHour <= 17) {
      score += 5
    }

    return Math.max(0, score)
  }

  /**
   * Generate human-readable reason for alternative suggestion
   */
  private static generateAlternativeReason(slotTime: Date, preferredTime: Date): string {
    const daysDifference = Math.round((slotTime.getTime() - preferredTime.getTime()) / (1000 * 60 * 60 * 24))
    const hoursDifference = Math.round((slotTime.getTime() - preferredTime.getTime()) / (1000 * 60 * 60))

    if (slotTime.toDateString() === preferredTime.toDateString()) {
      if (hoursDifference === 0) {
        return "Same day and time"
      } else if (hoursDifference > 0) {
        return `Same day, ${hoursDifference} hour${hoursDifference > 1 ? "s" : ""} later`
      } else {
        return `Same day, ${Math.abs(hoursDifference)} hour${Math.abs(hoursDifference) > 1 ? "s" : ""} earlier`
      }
    } else if (daysDifference === 1) {
      return "Next day, same time"
    } else if (daysDifference === -1) {
      return "Previous day, same time"
    } else if (daysDifference > 0) {
      return `${daysDifference} day${daysDifference > 1 ? "s" : ""} later`
    } else {
      return `${Math.abs(daysDifference)} day${Math.abs(daysDifference) > 1 ? "s" : ""} earlier`
    }
  }

  /**
   * Check if two time slots overlap
   */
  private static timeSlotsOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && end1 > start2
  }

  /**
   * Get default working hours
   */
  private static getDefaultWorkingHours() {
    return [
      { dayOfWeek: 0, startTime: "10:00", endTime: "16:00", isWorkingDay: false }, // Sunday
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isWorkingDay: true },  // Monday
      { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isWorkingDay: true },  // Tuesday
      { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isWorkingDay: true },  // Wednesday
      { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isWorkingDay: true },  // Thursday
      { dayOfWeek: 5, startTime: "09:00", endTime: "15:00", isWorkingDay: true },  // Friday
      { dayOfWeek: 6, startTime: "10:00", endTime: "14:00", isWorkingDay: false }, // Saturday
    ]
  }

  /**
   * Get comprehensive conflict analysis for an appointment
   */
  static async getAppointmentConflictAnalysis(appointmentId: string): Promise<{
    appointment: any
    conflicts: AppointmentConflict[]
    recommendations: string[]
  }> {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          herbalist: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })

      if (!appointment) {
        throw new Error("Appointment not found")
      }

      const conflictResult = await this.checkNewAppointmentConflicts(
        appointment.herbalistId,
        appointment.startTime,
        appointment.endTime,
        appointment.duration,
        appointmentId
      )

      const recommendations = this.generateConflictRecommendations(
        appointment,
        conflictResult.conflicts
      )

      return {
        appointment,
        conflicts: conflictResult.conflicts,
        recommendations,
      }
    } catch (error) {
      console.error("Error analyzing appointment conflicts:", error)
      throw error
    }
  }

  /**
   * Generate recommendations based on conflicts
   */
  private static generateConflictRecommendations(
    appointment: any,
    conflicts: AppointmentConflict[]
  ): string[] {
    const recommendations: string[] = []

    if (conflicts.length === 0) {
      return ["No conflicts detected - appointment can proceed as scheduled"]
    }

    const highSeverityConflicts = conflicts.filter(c => c.severity === "HIGH")
    const mediumSeverityConflicts = conflicts.filter(c => c.severity === "MEDIUM")

    if (highSeverityConflicts.length > 0) {
      recommendations.push("⚠️ High-priority conflicts require immediate attention")
      
      if (highSeverityConflicts.some(c => c.type === "APPOINTMENT")) {
        recommendations.push("Double-booking detected - one appointment must be rescheduled")
      }
      
      if (highSeverityConflicts.some(c => c.type === "GOOGLE_CALENDAR")) {
        recommendations.push("Google Calendar conflict - verify external appointment details")
      }
    }

    if (mediumSeverityConflicts.length > 0) {
      recommendations.push("Consider addressing schedule conflicts for optimal workflow")
      
      if (mediumSeverityConflicts.some(c => c.type === "BREAK")) {
        recommendations.push("Appointment overlaps with scheduled break time")
      }
      
      if (mediumSeverityConflicts.some(c => c.type === "UNAVAILABLE")) {
        recommendations.push("Appointment scheduled outside normal working hours")
      }
    }

    recommendations.push(`Total conflicts: ${conflicts.length}`)
    
    if (conflicts.length <= 2) {
      recommendations.push("Conflicts are manageable with minor schedule adjustments")
    } else {
      recommendations.push("Multiple conflicts suggest this time slot should be rescheduled")
    }

    return recommendations
  }
}