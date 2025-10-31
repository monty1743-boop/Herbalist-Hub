import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { z } from "zod"
import { Role } from "@prisma/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

// Update form schema (partial fields allowed)
const updateFormSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  fields: z.any().optional(), // JSON schema structure
  validationRules: z.any().optional(),
  category: z.string().optional(),
  estimatedTime: z.number().optional(),
  isActive: z.boolean().optional(),
  isRequired: z.boolean().optional(),
})

// GET /api/intake-forms/[id] - Get specific form
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can access forms, clients can access if assigned
    if (![Role.HERBALIST, Role.ADMIN, Role.CLIENT].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const form = await prisma.intakeForm.findUnique({
      where: { id: params.id },
      include: {
        submissions: session.user.role === Role.CLIENT 
          ? {
              where: { clientId: session.user.id },
              select: {
                id: true,
                completedAt: true,
                isReviewed: true,
              }
            }
          : {
              select: {
                id: true,
                clientId: true,
                completedAt: true,
                isReviewed: true,
                client: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              },
              take: 20, // Limit for performance
              orderBy: { completedAt: "desc" },
            },
        _count: {
          select: {
            submissions: true,
          }
        }
      },
    })

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      )
    }

    // For clients, check if form is active and they have access
    if (session.user.role === Role.CLIENT) {
      if (!form.isActive) {
        return NextResponse.json(
          { error: "Form is not available" },
          { status: 403 }
        )
      }
      
      // TODO: Add logic to check if client is assigned this form
      // This would typically check an assignment table
    }

    // Audit the form access
    await auditPHIAccess(
      "read",
      "IntakeForm",
      form.id,
      session.user.id,
      session.user.role,
      ["form_structure", "form_metadata"],
      AuditOutcome.SUCCESS,
      {
        formName: form.name,
        formVersion: form.version,
        submissionCount: form._count.submissions,
      }
    )

    // For clients, return simplified view
    if (session.user.role === Role.CLIENT) {
      return NextResponse.json({
        id: form.id,
        name: form.name,
        description: form.description,
        fields: form.fields,
        category: form.category,
        estimatedTime: form.estimatedTime,
        version: form.version,
        mySubmissions: form.submissions,
      })
    }

    // For herbalists/admins, return full form data
    return NextResponse.json({
      ...form,
      recentSubmissions: form.submissions,
    })
  } catch (error) {
    console.error("Error fetching intake form:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/intake-forms/[id] - Update form
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can update forms
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate update data
    const validationResult = updateFormSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Check if form exists
    const existingForm = await prisma.intakeForm.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        version: true,
        _count: {
          select: {
            submissions: true,
          }
        }
      }
    })

    if (!existingForm) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      )
    }

    // If form has submissions and structure is changing, create new version
    const isStructuralChange = updateData.fields || updateData.validationRules
    let newVersion = existingForm.version
    
    if (isStructuralChange && existingForm._count.submissions > 0) {
      newVersion = existingForm.version + 1
      updateData.version = newVersion
      updateData.previousVersion = existingForm.id
    }

    const updatedForm = await prisma.intakeForm.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        version: true,
        isActive: true,
        updatedAt: true,
      }
    })

    // Audit the form update
    await auditPHIAccess(
      "update",
      "IntakeForm",
      updatedForm.id,
      session.user.id,
      session.user.role,
      Object.keys(updateData),
      AuditOutcome.SUCCESS,
      {
        formName: existingForm.name,
        oldVersion: existingForm.version,
        newVersion: newVersion,
        isStructuralChange,
        submissionCount: existingForm._count.submissions,
      }
    )

    return NextResponse.json({
      success: true,
      form: updatedForm,
      message: isStructuralChange && existingForm._count.submissions > 0 
        ? "Form updated with new version due to existing submissions"
        : "Form updated successfully",
      versionChange: isStructuralChange && existingForm._count.submissions > 0,
    })
  } catch (error) {
    console.error("Error updating intake form:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid form data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/intake-forms/[id] - Delete form
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can delete forms
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if form exists and has submissions
    const form = await prisma.intakeForm.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            submissions: true,
          }
        }
      }
    })

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      )
    }

    // Prevent deletion if form has submissions (for data integrity)
    if (form._count.submissions > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete form with existing submissions",
          submissionCount: form._count.submissions,
          suggestion: "Consider deactivating the form instead"
        },
        { status: 409 }
      )
    }

    await prisma.intakeForm.delete({
      where: { id: params.id }
    })

    // Audit the form deletion
    await auditPHIAccess(
      "delete",
      "IntakeForm",
      params.id,
      session.user.id,
      session.user.role,
      ["form_structure", "form_metadata"],
      AuditOutcome.SUCCESS,
      {
        formName: form.name,
        formVersion: form.version,
        submissionCount: form._count.submissions,
      }
    )

    return NextResponse.json({
      success: true,
      message: "Form deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting intake form:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}