import { z } from "zod"
import { AppointmentType, AppointmentStatus } from "@prisma/client"

// Appointment scheduling schemas
export const appointmentSchema = z.object({
  clientId: z.string(),
  
  // Appointment details
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timeZone: z.string().min(1, "Time zone is required"),
  title: z.string().min(1, "Appointment title is required"),
  description: z.string().optional(),
  
  // Appointment type and logistics
  type: z.nativeEnum(AppointmentType),
  location: z.string().optional(),
  isVirtual: z.boolean().default(false),
  
  // Integration data
  googleEventId: z.string().optional(),
  zoomMeetingId: z.string().optional(),
  
  // Billing
  fee: z.number().min(0, "Fee cannot be negative").optional(),
  paymentMethod: z.string().optional(),
}).refine(
  (data) => {
    const start = new Date(data.startTime)
    const end = new Date(data.endTime)
    return start < end
  },
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
).refine(
  (data) => {
    const start = new Date(data.startTime)
    const now = new Date()
    return start > now
  },
  {
    message: "Appointment must be scheduled in the future",
    path: ["startTime"],
  }
)

export const appointmentUpdateSchema = appointmentSchema.partial().extend({
  id: z.string(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  cancelReason: z.string().optional(),
  noShowReason: z.string().optional(),
})

// Appointment availability schemas
export const availabilityCheckSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  excludeAppointmentId: z.string().optional(),
})

export const availabilitySlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  duration: z.number().min(15, "Duration must be at least 15 minutes").max(480, "Duration cannot exceed 8 hours"),
  timeZone: z.string().min(1, "Time zone is required"),
})

// Appointment search and filter schemas
export const appointmentFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  clientId: z.string().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  type: z.nativeEnum(AppointmentType).optional(),
  isVirtual: z.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["startTime", "createdAt", "title", "clientName"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
})

// Appointment reminder schemas
export const reminderPreferenceSchema = z.object({
  email24h: z.boolean().default(true),
  email1h: z.boolean().default(true),
  sms24h: z.boolean().default(false),
  sms1h: z.boolean().default(false),
  customReminders: z
    .array(
      z.object({
        minutesBefore: z.number().min(1),
        method: z.enum(["email", "sms"]),
        message: z.string().optional(),
      })
    )
    .optional(),
})

// Appointment booking (client-facing) schemas
export const clientBookingSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  type: z.nativeEnum(AppointmentType),
  notes: z.string().optional(),
  preferredContactMethod: z.enum(["email", "phone", "sms"]).optional(),
}).refine(
  (data) => {
    const start = new Date(data.startTime)
    const end = new Date(data.endTime)
    return start < end
  },
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
).refine(
  (data) => {
    const start = new Date(data.startTime)
    const now = new Date()
    const minAdvanceHours = 24 // Minimum 24 hours advance booking
    const minTime = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000)
    return start >= minTime
  },
  {
    message: "Appointments must be booked at least 24 hours in advance",
    path: ["startTime"],
  }
)

// Appointment rescheduling schemas
export const rescheduleAppointmentSchema = z.object({
  id: z.string(),
  newStartTime: z.string().datetime(),
  newEndTime: z.string().datetime(),
  reason: z.string().min(1, "Reason for rescheduling is required"),
  notifyClient: z.boolean().default(true),
}).refine(
  (data) => {
    const start = new Date(data.newStartTime)
    const end = new Date(data.newEndTime)
    return start < end
  },
  {
    message: "New end time must be after new start time",
    path: ["newEndTime"],
  }
)

// Appointment cancellation schemas
export const cancelAppointmentSchema = z.object({
  id: z.string(),
  reason: z.string().min(1, "Reason for cancellation is required"),
  refundAmount: z.number().min(0).optional(),
  notifyClient: z.boolean().default(true),
  rescheduleOffered: z.boolean().default(false),
})

// Google Calendar integration schemas
export const googleCalendarSyncSchema = z.object({
  appointmentId: z.string(),
  syncToGoogle: z.boolean().default(true),
  calendarId: z.string().optional(),
})

// Appointment series/recurring schemas
export const recurringAppointmentSchema = z.object({
  baseAppointment: appointmentSchema.omit({ startTime: "true", endTime: "true" }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format"),
  duration: z.number().min(15, "Duration must be at least 15 minutes"),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0 = Sunday, 6 = Saturday
  maxOccurrences: z.number().min(1).max(52).optional(),
})

// Type exports
export type AppointmentInput = z.infer<typeof appointmentSchema>
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>
export type AvailabilityCheckInput = z.infer<typeof availabilityCheckSchema>
export type AvailabilitySlotInput = z.infer<typeof availabilitySlotSchema>
export type AppointmentFilterInput = z.infer<typeof appointmentFilterSchema>
export type ReminderPreferenceInput = z.infer<typeof reminderPreferenceSchema>
export type ClientBookingInput = z.infer<typeof clientBookingSchema>
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>
export type GoogleCalendarSyncInput = z.infer<typeof googleCalendarSyncSchema>
export type RecurringAppointmentInput = z.infer<typeof recurringAppointmentSchema>