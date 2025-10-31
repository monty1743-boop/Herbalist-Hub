import { google } from "googleapis"
import { prisma } from "@/lib/db/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

interface GoogleCalendarEvent {
  id?: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  attendees?: string[]
  location?: string
}

interface CalendarIntegration {
  id: string
  userId: string
  provider: string
  accessToken: string
  refreshToken: string
  calendarId: string
  isActive: boolean
  lastSync?: Date
  syncErrors?: number
}

export class GoogleCalendarSync {
  private oauth2Client: any

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
  }

  /**
   * Initialize OAuth client with user credentials
   */
  private async initializeClient(userId: string): Promise<boolean> {
    try {
      const integration = await prisma.calendarIntegration.findFirst({
        where: {
          userId,
          provider: "GOOGLE",
          isActive: true,
        },
      })

      if (!integration) {
        console.warn(`No active Google Calendar integration found for user ${userId}`)
        return false
      }

      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
      })

      // Check if token needs refresh
      try {
        const tokenInfo = await this.oauth2Client.getAccessToken()
        if (!tokenInfo.token) {
          // Token expired, try to refresh
          const newTokens = await this.oauth2Client.refreshAccessToken()
          this.oauth2Client.setCredentials(newTokens.credentials)
          
          // Update stored tokens
          await prisma.calendarIntegration.update({
            where: { id: integration.id },
            data: {
              accessToken: newTokens.credentials.access_token!,
              refreshToken: newTokens.credentials.refresh_token || integration.refreshToken,
              lastSync: new Date(),
            },
          })
        }
      } catch (refreshError) {
        console.error("Failed to refresh Google Calendar token:", refreshError)
        
        // Mark integration as inactive
        await prisma.calendarIntegration.update({
          where: { id: integration.id },
          data: {
            isActive: false,
            syncErrors: (integration.syncErrors || 0) + 1,
          },
        })
        
        return false
      }

      return true
    } catch (error) {
      console.error("Failed to initialize Google Calendar client:", error)
      return false
    }
  }

  /**
   * Create appointment in Google Calendar
   */
  async createAppointment(appointmentId: string, eventData: GoogleCalendarEvent): Promise<string | null> {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          herbalist: true,
          client: { select: { firstName: true, lastName: true, email: true } },
        },
      })

      if (!appointment) {
        throw new Error("Appointment not found")
      }

      const initialized = await this.initializeClient(appointment.herbalistId)
      if (!initialized) {
        return null
      }

      const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: "UTC",
        },
        attendees: eventData.attendees?.map(email => ({ email })),
        location: eventData.location,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 24 hours
            { method: "popup", minutes: 60 },      // 1 hour
          ],
        },
        // Add custom properties to link back to our appointment
        extendedProperties: {
          private: {
            herbalistHubAppointmentId: appointmentId,
            herbalistHubSource: "appointment",
          },
        },
      }

      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      })

      if (response.data.id) {
        // Store the Google Calendar event ID
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            googleCalendarEventId: response.data.id,
            lastGoogleSync: new Date(),
          },
        })

        // Audit the sync operation
        await auditPHIAccess(
          "write",
          "GoogleCalendarSync",
          appointmentId,
          appointment.herbalistId,
          "HERBALIST",
          ["calendar_sync"],
          AuditOutcome.SUCCESS,
          {
            action: "create_event",
            googleEventId: response.data.id,
            appointmentTitle: eventData.title,
          }
        )

        return response.data.id
      }

      return null
    } catch (error) {
      console.error("Failed to create Google Calendar event:", error)
      
      // Audit the failed sync
      try {
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { herbalistId: true },
        })

        if (appointment) {
          await auditPHIAccess(
            "write",
            "GoogleCalendarSync",
            appointmentId,
            appointment.herbalistId,
            "HERBALIST",
            ["calendar_sync_failed"],
            AuditOutcome.FAILURE,
            {
              action: "create_event",
              error: error instanceof Error ? error.message : "Unknown error",
            }
          )
        }
      } catch (auditError) {
        console.error("Failed to audit Google Calendar sync error:", auditError)
      }

      throw error
    }
  }

  /**
   * Update appointment in Google Calendar
   */
  async updateAppointment(appointmentId: string, eventData: Partial<GoogleCalendarEvent>): Promise<boolean> {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          herbalistId: true,
          googleCalendarEventId: true,
          title: true,
        },
      })

      if (!appointment || !appointment.googleCalendarEventId) {
        console.warn(`No Google Calendar event ID found for appointment ${appointmentId}`)
        return false
      }

      const initialized = await this.initializeClient(appointment.herbalistId)
      if (!initialized) {
        return false
      }

      const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

      // Build update object with only provided fields
      const updateData: any = {}
      
      if (eventData.title) updateData.summary = eventData.title
      if (eventData.description !== undefined) updateData.description = eventData.description
      if (eventData.location !== undefined) updateData.location = eventData.location
      
      if (eventData.startTime) {
        updateData.start = {
          dateTime: eventData.startTime.toISOString(),
          timeZone: "UTC",
        }
      }
      
      if (eventData.endTime) {
        updateData.end = {
          dateTime: eventData.endTime.toISOString(),
          timeZone: "UTC",
        }
      }

      if (eventData.attendees) {
        updateData.attendees = eventData.attendees.map(email => ({ email }))
      }

      const response = await calendar.events.patch({
        calendarId: "primary",
        eventId: appointment.googleCalendarEventId,
        requestBody: updateData,
      })

      if (response.status === 200) {
        // Update last sync time
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { lastGoogleSync: new Date() },
        })

        // Audit the sync operation
        await auditPHIAccess(
          "update",
          "GoogleCalendarSync",
          appointmentId,
          appointment.herbalistId,
          "HERBALIST",
          ["calendar_sync"],
          AuditOutcome.SUCCESS,
          {
            action: "update_event",
            googleEventId: appointment.googleCalendarEventId,
            updatedFields: Object.keys(updateData),
          }
        )

        return true
      }

      return false
    } catch (error) {
      console.error("Failed to update Google Calendar event:", error)
      
      // Audit the failed sync
      try {
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { herbalistId: true },
        })

        if (appointment) {
          await auditPHIAccess(
            "update",
            "GoogleCalendarSync",
            appointmentId,
            appointment.herbalistId,
            "HERBALIST",
            ["calendar_sync_failed"],
            AuditOutcome.FAILURE,
            {
              action: "update_event",
              error: error instanceof Error ? error.message : "Unknown error",
            }
          )
        }
      } catch (auditError) {
        console.error("Failed to audit Google Calendar sync error:", auditError)
      }

      return false
    }
  }

  /**
   * Delete appointment from Google Calendar
   */
  async deleteAppointment(appointmentId: string): Promise<boolean> {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          herbalistId: true,
          googleCalendarEventId: true,
          title: true,
        },
      })

      if (!appointment || !appointment.googleCalendarEventId) {
        console.warn(`No Google Calendar event ID found for appointment ${appointmentId}`)
        return false
      }

      const initialized = await this.initializeClient(appointment.herbalistId)
      if (!initialized) {
        return false
      }

      const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

      await calendar.events.delete({
        calendarId: "primary",
        eventId: appointment.googleCalendarEventId,
      })

      // Clear the Google Calendar event ID
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          googleCalendarEventId: null,
          lastGoogleSync: new Date(),
        },
      })

      // Audit the sync operation
      await auditPHIAccess(
        "delete",
        "GoogleCalendarSync",
        appointmentId,
        appointment.herbalistId,
        "HERBALIST",
        ["calendar_sync"],
        AuditOutcome.SUCCESS,
        {
          action: "delete_event",
          googleEventId: appointment.googleCalendarEventId,
          appointmentTitle: appointment.title,
        }
      )

      return true
    } catch (error) {
      console.error("Failed to delete Google Calendar event:", error)
      
      // Audit the failed sync
      try {
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { herbalistId: true },
        })

        if (appointment) {
          await auditPHIAccess(
            "delete",
            "GoogleCalendarSync",
            appointmentId,
            appointment.herbalistId,
            "HERBALIST",
            ["calendar_sync_failed"],
            AuditOutcome.FAILURE,
            {
              action: "delete_event",
              error: error instanceof Error ? error.message : "Unknown error",
            }
          )
        }
      } catch (auditError) {
        console.error("Failed to audit Google Calendar sync error:", auditError)
      }

      return false
    }
  }

  /**
   * Get events from Google Calendar for a date range
   */
  async getEvents(userId: string, startTime: Date, endTime: Date): Promise<any[]> {
    try {
      const initialized = await this.initializeClient(userId)
      if (!initialized) {
        return []
      }

      const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      })

      return response.data.items || []
    } catch (error) {
      console.error("Failed to fetch Google Calendar events:", error)
      return []
    }
  }

  /**
   * Sync all pending appointments to Google Calendar
   */
  async syncPendingAppointments(userId: string): Promise<{ synced: number; failed: number }> {
    try {
      const initialized = await this.initializeClient(userId)
      if (!initialized) {
        return { synced: 0, failed: 0 }
      }

      // Find appointments that need syncing
      const pendingAppointments = await prisma.appointment.findMany({
        where: {
          herbalistId: userId,
          syncWithGoogleCalendar: true,
          googleCalendarEventId: null,
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          startTime: { gte: new Date() }, // Only future appointments
        },
        include: {
          client: { select: { firstName: true, lastName: true, email: true } },
        },
        take: 50, // Limit to prevent rate limiting
      })

      let synced = 0
      let failed = 0

      for (const appointment of pendingAppointments) {
        try {
          const eventId = await this.createAppointment(appointment.id, {
            title: appointment.title,
            description: appointment.description || undefined,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            attendees: appointment.client.email ? [appointment.client.email] : [],
            location: appointment.location?.address,
          })

          if (eventId) {
            synced++
          } else {
            failed++
          }
        } catch (error) {
          console.error(`Failed to sync appointment ${appointment.id}:`, error)
          failed++
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      return { synced, failed }
    } catch (error) {
      console.error("Failed to sync pending appointments:", error)
      return { synced: 0, failed: 1 }
    }
  }

  /**
   * Handle Google Calendar webhook notifications
   */
  async handleWebhookNotification(channelId: string, resourceId: string): Promise<void> {
    try {
      // Find the integration associated with this webhook
      const integration = await prisma.calendarIntegration.findFirst({
        where: {
          webhookChannelId: channelId,
          isActive: true,
        },
      })

      if (!integration) {
        console.warn(`No integration found for webhook channel ${channelId}`)
        return
      }

      // Sync events that might have changed
      await this.syncFromGoogleCalendar(integration.userId)
      
      // Update last sync time
      await prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: { lastSync: new Date() },
      })
    } catch (error) {
      console.error("Failed to handle Google Calendar webhook:", error)
    }
  }

  /**
   * Sync changes from Google Calendar to our system
   */
  async syncFromGoogleCalendar(userId: string): Promise<void> {
    try {
      const initialized = await this.initializeClient(userId)
      if (!initialized) {
        return
      }

      // Get recent events from Google Calendar
      const startTime = new Date()
      startTime.setDate(startTime.getDate() - 1) // Look back 1 day
      
      const endTime = new Date()
      endTime.setDate(endTime.getDate() + 30) // Look forward 30 days

      const events = await this.getEvents(userId, startTime, endTime)

      // Check for conflicts with our appointments
      for (const event of events) {
        // Skip events created by our system
        if (event.extendedProperties?.private?.herbalistHubSource === "appointment") {
          continue
        }

        const eventStart = new Date(event.start.dateTime || event.start.date)
        const eventEnd = new Date(event.end.dateTime || event.end.date)

        // Check for conflicting appointments
        const conflictingAppointments = await prisma.appointment.findMany({
          where: {
            herbalistId: userId,
            status: { in: ["SCHEDULED", "CONFIRMED"] },
            startTime: { lt: eventEnd },
            endTime: { gt: eventStart },
          },
        })

        if (conflictingAppointments.length > 0) {
          console.warn(`Google Calendar event "${event.summary}" conflicts with ${conflictingAppointments.length} appointment(s)`)
          
          // Could implement conflict resolution here
          // For now, just log the conflict
        }
      }
    } catch (error) {
      console.error("Failed to sync from Google Calendar:", error)
    }
  }
}