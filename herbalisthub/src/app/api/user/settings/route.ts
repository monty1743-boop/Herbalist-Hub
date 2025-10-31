import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuthenticatedUser } from "@/lib/auth/api-middleware"
import { withApiMiddleware } from "@/lib/api/middleware"
import { withValidation } from "@/lib/api/validation"
import { ApiResponse, ApiErrors } from "@/lib/api/errors"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { prisma } from "@/lib/db/client"

// User settings validation schema
const userSettingsSchema = z.object({
  communicationPrefs: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    phone: z.boolean().default(false),
    marketing: z.boolean().default(false),
    appointmentReminders: z.boolean().default(true),
    followUpReminders: z.boolean().default(true),
  }).optional(),
  privacyPrefs: z.object({
    shareDataForResearch: z.boolean().default(false),
    allowTestimonialUse: z.boolean().default(false),
    publicProfile: z.boolean().default(false),
  }).optional(),
  notificationPrefs: z.object({
    emailNotifications: z.boolean().default(true),
    pushNotifications: z.boolean().default(true),
    smsNotifications: z.boolean().default(false),
    inAppNotifications: z.boolean().default(true),
  }).optional(),
  displayPrefs: z.object({
    theme: z.enum(["light", "dark", "system"]).default("system"),
    language: z.enum(["en", "es", "fr"]).default("en"),
    timezone: z.string().default("America/New_York"),
    dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]).default("MM/DD/YYYY"),
    timeFormat: z.enum(["12h", "24h"]).default("12h"),
  }).optional(),
})

// GET - Get user settings
export const GET = withApiMiddleware(
  withAuthenticatedUser(async (request, context, user): Promise<NextResponse> => {
    try {
      // Get user settings or create default if not exists
      let userSettings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
      })

      if (!userSettings) {
        // Create default settings for user
        userSettings = await prisma.userSettings.create({
          data: {
            userId: user.id,
            communicationPrefs: {
              email: true,
              sms: false,
              phone: false,
              marketing: false,
              appointmentReminders: true,
              followUpReminders: true,
            },
            privacyPrefs: {
              shareDataForResearch: false,
              allowTestimonialUse: false,
              publicProfile: false,
            },
            notificationPrefs: {
              emailNotifications: true,
              pushNotifications: true,
              smsNotifications: false,
              inAppNotifications: true,
            },
            displayPrefs: {
              theme: "system",
              language: "en",
              timezone: "America/New_York",
              dateFormat: "MM/DD/YYYY",
              timeFormat: "12h",
            },
          },
        })
      }

      // Audit settings access
      await auditPHIAccess(
        "read",
        "UserSettings",
        user.id,
        user.id,
        user.role,
        ["settings"],
        AuditOutcome.SUCCESS,
        { selfAccess: true }
      )

      return ApiResponse.success(userSettings, "User settings retrieved successfully")
    } catch (error) {
      console.error("Get user settings error:", error)
      throw ApiErrors.internal("Failed to retrieve user settings")
    }
  })
)

// PUT - Update user settings
export const PUT = withApiMiddleware(
  withAuthenticatedUser(
    withValidation({
      body: userSettingsSchema,
    })(async (request, context, validated, user): Promise<NextResponse> => {
      try {
        const settingsData = validated.body!

        // Get existing settings or prepare for creation
        const existingSettings = await prisma.userSettings.findUnique({
          where: { userId: user.id },
        })

        let updatedSettings

        if (existingSettings) {
          // Update existing settings (merge with existing data)
          updatedSettings = await prisma.userSettings.update({
            where: { userId: user.id },
            data: {
              communicationPrefs: settingsData.communicationPrefs 
                ? { ...existingSettings.communicationPrefs as any, ...settingsData.communicationPrefs }
                : existingSettings.communicationPrefs,
              privacyPrefs: settingsData.privacyPrefs
                ? { ...existingSettings.privacyPrefs as any, ...settingsData.privacyPrefs }
                : existingSettings.privacyPrefs,
              notificationPrefs: settingsData.notificationPrefs
                ? { ...existingSettings.notificationPrefs as any, ...settingsData.notificationPrefs }
                : existingSettings.notificationPrefs,
              displayPrefs: settingsData.displayPrefs
                ? { ...existingSettings.displayPrefs as any, ...settingsData.displayPrefs }
                : existingSettings.displayPrefs,
              updatedAt: new Date(),
            },
          })
        } else {
          // Create new settings with provided data and defaults
          updatedSettings = await prisma.userSettings.create({
            data: {
              userId: user.id,
              communicationPrefs: settingsData.communicationPrefs || {
                email: true,
                sms: false,
                phone: false,
                marketing: false,
                appointmentReminders: true,
                followUpReminders: true,
              },
              privacyPrefs: settingsData.privacyPrefs || {
                shareDataForResearch: false,
                allowTestimonialUse: false,
                publicProfile: false,
              },
              notificationPrefs: settingsData.notificationPrefs || {
                emailNotifications: true,
                pushNotifications: true,
                smsNotifications: false,
                inAppNotifications: true,
              },
              displayPrefs: settingsData.displayPrefs || {
                theme: "system",
                language: "en",
                timezone: "America/New_York",
                dateFormat: "MM/DD/YYYY",
                timeFormat: "12h",
              },
            },
          })
        }

        // Audit settings update
        const updatedFields = Object.keys(settingsData)
        await auditPHIAccess(
          "update",
          "UserSettings",
          user.id,
          user.id,
          user.role,
          updatedFields,
          AuditOutcome.SUCCESS,
          { 
            selfUpdate: true,
            updatedFields,
            settingsCategories: updatedFields,
          }
        )

        return ApiResponse.success(
          updatedSettings,
          "User settings updated successfully"
        )
      } catch (error) {
        console.error("Update user settings error:", error)
        
        // Audit failed settings update
        await auditPHIAccess(
          "update",
          "UserSettings",
          user.id,
          user.id,
          user.role,
          ["settings"],
          AuditOutcome.FAILURE,
          { 
            selfUpdate: true,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        )

        throw error instanceof ApiErrors.constructor ? error : ApiErrors.internal("Failed to update user settings")
      }
    })
  ),
  {
    enableRateLimit: true,
    rateLimitMax: 30, // Allow frequent settings updates
    enableRequestLogging: true,
  }
)