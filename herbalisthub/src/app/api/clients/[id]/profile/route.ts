import { NextRequest, NextResponse } from "next/server"
import { withHerbalistAuth } from "@/lib/auth/api-middleware"
import { withClientProfileAudit } from "@/lib/audit/middleware"
import { prisma } from "@/lib/db/client"
import { validatePHI, auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

// GET - Get client profile with PHI (herbalist only)
export const GET = withHerbalistAuth(
  withClientProfileAudit(async (request, context, user) => {
    try {
      const clientId = context.params?.id

      if (!clientId) {
        return NextResponse.json(
          { error: "Client ID is required" },
          { status: 400 }
        )
      }

      // Check if client exists and user has access
      const client = await prisma.user.findUnique({
        where: { 
          id: clientId,
          role: "CLIENT" // Ensure we're only accessing client records
        },
      })

      if (!client) {
        await auditPHIAccess(
          "read",
          "ClientProfile",
          clientId,
          user.id,
          user.role,
          ["*"],
          AuditOutcome.FAILURE,
          { reason: "client_not_found" }
        )

        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 }
        )
      }

      // Get client profile with PHI data
      // The encryption middleware will automatically decrypt PHI fields
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: clientId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              createdAt: true,
            }
          }
        }
      })

      if (!clientProfile) {
        return NextResponse.json(
          { error: "Client profile not found" },
          { status: 404 }
        )
      }

      // Log successful PHI access
      const phiFields = ["allergies", "medications", "conditions", "healthGoals", "emergencyContact"]
      await auditPHIAccess(
        "read",
        "ClientProfile",
        clientId,
        user.id,
        user.role,
        phiFields,
        AuditOutcome.SUCCESS,
        {
          accessedFields: phiFields.filter(field => clientProfile[field as keyof typeof clientProfile] != null),
          herbalistId: user.id,
        }
      )

      return NextResponse.json({
        success: true,
        profile: {
          ...clientProfile,
          user: client,
        },
      })
    } catch (error) {
      console.error("Get client profile error:", error)
      
      // Log PHI access failure
      await auditPHIAccess(
        "read",
        "ClientProfile",
        context.params?.id || "unknown",
        user.id,
        user.role,
        ["*"],
        AuditOutcome.FAILURE,
        {
          error: error instanceof Error ? error.message : "Unknown error",
        }
      )

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }
  })
)

// PUT - Update client profile with PHI (herbalist only)
export const PUT = withHerbalistAuth(
  withClientProfileAudit(async (request, context, user) => {
    try {
      const clientId = context.params?.id

      if (!clientId) {
        return NextResponse.json(
          { error: "Client ID is required" },
          { status: 400 }
        )
      }

      const body = await request.json()
      const {
        dateOfBirth,
        gender,
        allergies,
        medications,
        conditions,
        healthGoals,
        emergencyContact,
        communicationPrefs,
        treatmentPrefs,
      } = body

      // Validate PHI fields before processing
      const phiFields = { allergies, medications, conditions, healthGoals, emergencyContact }
      const validationErrors: string[] = []

      for (const [fieldName, fieldValue] of Object.entries(phiFields)) {
        if (fieldValue != null) {
          const validation = validatePHI(fieldValue, fieldName)
          if (!validation.isValid) {
            validationErrors.push(...validation.errors)
          }
        }
      }

      if (validationErrors.length > 0) {
        await auditPHIAccess(
          "update",
          "ClientProfile",
          clientId,
          user.id,
          user.role,
          Object.keys(phiFields),
          AuditOutcome.FAILURE,
          {
            reason: "validation_failed",
            validationErrors,
          }
        )

        return NextResponse.json(
          {
            success: false,
            error: "PHI validation failed",
            details: validationErrors,
          },
          { status: 400 }
        )
      }

      // Check if client exists
      const client = await prisma.user.findUnique({
        where: { 
          id: clientId,
          role: "CLIENT"
        },
      })

      if (!client) {
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 }
        )
      }

      // Update client profile
      // The encryption middleware will automatically encrypt PHI fields
      const updatedProfile = await prisma.clientProfile.upsert({
        where: { userId: clientId },
        update: {
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender,
          allergies,
          medications,
          conditions,
          healthGoals,
          emergencyContact,
          communicationPrefs,
          treatmentPrefs,
          updatedAt: new Date(),
        },
        create: {
          userId: clientId,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender,
          allergies,
          medications,
          conditions,
          healthGoals,
          emergencyContact,
          communicationPrefs,
          treatmentPrefs,
          hipaaConsent: true,
          consentDate: new Date(),
          consentVersion: "1.0",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            }
          }
        }
      })

      // Log successful PHI update
      const updatedFields = Object.keys(phiFields).filter(field => 
        phiFields[field as keyof typeof phiFields] != null
      )

      await auditPHIAccess(
        "update",
        "ClientProfile",
        clientId,
        user.id,
        user.role,
        updatedFields,
        AuditOutcome.SUCCESS,
        {
          updatedFields,
          herbalistId: user.id,
          previousLastUpdate: client.updatedAt,
        }
      )

      return NextResponse.json({
        success: true,
        message: "Client profile updated successfully",
        profile: updatedProfile,
      })
    } catch (error) {
      console.error("Update client profile error:", error)

      // Log PHI update failure
      await auditPHIAccess(
        "update",
        "ClientProfile",
        context.params?.id || "unknown",
        user.id,
        user.role,
        ["*"],
        AuditOutcome.FAILURE,
        {
          error: error instanceof Error ? error.message : "Unknown error",
        }
      )

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }
  })
)