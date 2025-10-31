import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { z } from "zod"
import { Role } from "@prisma/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

// JSON Schema validation for form fields
const fieldSchema = z.object({
  id: z.string(),
  type: z.enum([
    "text", "textarea", "email", "phone", "number", "date", "datetime",
    "select", "radio", "checkbox", "file", "signature", "rating", "scale",
    "address", "url", "password", "time", "range", "color"
  ]),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().default(false),
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    custom: z.string().optional(), // Custom validation function
  }).optional(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    description: z.string().optional(),
  })).optional(), // For select, radio, checkbox fields
  conditionalLogic: z.object({
    showIf: z.array(z.object({
      fieldId: z.string(),
      operator: z.enum(["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "is_empty", "is_not_empty"]),
      value: z.any(),
    })).optional(),
    hideIf: z.array(z.object({
      fieldId: z.string(),
      operator: z.enum(["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "is_empty", "is_not_empty"]),
      value: z.any(),
    })).optional(),
  }).optional(),
  styling: z.object({
    width: z.enum(["full", "half", "third", "quarter"]).optional().default("full"),
    className: z.string().optional(),
  }).optional(),
  metadata: z.object({
    isHealthData: z.boolean().default(false), // Marks field as PHI
    category: z.string().optional(),
    order: z.number().optional(),
  }).optional(),
})

const sectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(fieldSchema),
  conditionalLogic: z.object({
    showIf: z.array(z.object({
      fieldId: z.string(),
      operator: z.enum(["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "is_empty", "is_not_empty"]),
      value: z.any(),
    })).optional(),
  }).optional(),
})

const formSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  sections: z.array(sectionSchema),
  settings: z.object({
    allowSaveProgress: z.boolean().default(true),
    requiresAuthentication: z.boolean().default(true),
    maxSubmissions: z.number().optional(),
    submissionDeadline: z.string().datetime().optional(),
    notificationEmails: z.array(z.string().email()).optional(),
    confirmationMessage: z.string().optional(),
    redirectUrl: z.string().url().optional(),
    styling: z.object({
      theme: z.enum(["default", "modern", "minimal", "medical"]).default("default"),
      primaryColor: z.string().optional(),
      fontFamily: z.string().optional(),
    }).optional(),
  }).optional(),
  metadata: z.object({
    category: z.string().optional(),
    estimatedTime: z.number().optional(), // minutes
    tags: z.array(z.string()).optional(),
    isTemplate: z.boolean().default(false),
    templateCategory: z.string().optional(),
  }).optional(),
})

const formQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  search: z.string().optional(),
  category: z.string().optional(),
  isActive: z.string().optional(),
  isTemplate: z.string().optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt"]).optional().default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
})

// GET /api/intake-forms - List intake forms
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can manage intake forms
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = formQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      search: searchParams.get("search") || undefined,
      category: searchParams.get("category") || undefined,
      isActive: searchParams.get("isActive") || undefined,
      isTemplate: searchParams.get("isTemplate") || undefined,
      sortBy: searchParams.get("sortBy") || "updatedAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    })

    const page = parseInt(query.page)
    const limit = Math.min(parseInt(query.limit), 100)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ]
    }

    if (query.category) {
      where.category = query.category
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === "true"
    }

    // Handle template filtering
    if (query.isTemplate !== undefined) {
      const isTemplate = query.isTemplate === "true"
      if (isTemplate) {
        // For templates, check the fields JSON for isTemplate flag
        where.fields = {
          path: ["metadata", "isTemplate"],
          equals: true
        }
      } else {
        // For non-templates, either no metadata or isTemplate is false
        where.OR = [
          {
            fields: {
              path: ["metadata", "isTemplate"],
              equals: false
            }
          },
          {
            NOT: {
              fields: {
                path: ["metadata"],
                not: undefined
              }
            }
          }
        ]
      }
    }

    const [forms, totalCount] = await Promise.all([
      prisma.intakeForm.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          estimatedTime: true,
          isActive: true,
          isRequired: true,
          version: true,
          previousVersion: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              submissions: true,
            }
          }
        },
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.intakeForm.count({ where }),
    ])

    // Audit the form list access
    await auditPHIAccess(
      "read",
      "IntakeFormList",
      "multiple",
      session.user.id,
      session.user.role,
      ["form_metadata"],
      AuditOutcome.SUCCESS,
      {
        resultCount: forms.length,
        totalCount,
        filters: query,
      }
    )

    return NextResponse.json({
      forms,
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
    console.error("Error fetching intake forms:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/intake-forms - Create new intake form
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can create forms
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate form data
    const validationResult = formSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const formData = validationResult.data

    // Validate form structure
    const fieldIds = new Set<string>()
    const sectionIds = new Set<string>()
    
    for (const section of formData.sections) {
      if (sectionIds.has(section.id)) {
        return NextResponse.json(
          { error: "Duplicate section ID found", duplicateId: section.id },
          { status: 400 }
        )
      }
      sectionIds.add(section.id)
      
      for (const field of section.fields) {
        if (fieldIds.has(field.id)) {
          return NextResponse.json(
            { error: "Duplicate field ID found", duplicateId: field.id },
            { status: 400 }
          )
        }
        fieldIds.add(field.id)
      }
    }

    // Create the form structure for storage with defaults
    const formFields = {
      sections: formData.sections,
      settings: formData.settings || {
        allowSaveProgress: true,
        requiresAuthentication: true,
      },
      metadata: formData.metadata || {
        isTemplate: false,
      },
    }

    // Create validation rules for the form
    const validationRules = {
      sections: formData.sections.map(section => ({
        id: section.id,
        fields: section.fields.map(field => ({
          id: field.id,
          type: field.type,
          required: field.required,
          validation: field.validation,
        }))
      }))
    }

    const form = await prisma.intakeForm.create({
      data: {
        name: formData.name,
        description: formData.description,
        fields: formFields,
        validationRules,
        category: formData.metadata?.category || "General",
        estimatedTime: formData.metadata?.estimatedTime,
        isActive: true,
        isRequired: false,
        version: 1,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        version: true,
        isActive: true,
        createdAt: true,
      }
    })

    // Audit the form creation
    await auditPHIAccess(
      "write",
      "IntakeForm",
      form.id,
      session.user.id,
      session.user.role,
      ["form_structure", "form_metadata"],
      AuditOutcome.SUCCESS,
      {
        formName: formData.name,
        sectionCount: formData.sections.length,
        fieldCount: Array.from(fieldIds).length,
        hasHealthData: formData.sections.some(s => 
          s.fields.some(f => f.metadata?.isHealthData)
        ),
      }
    )

    return NextResponse.json({
      success: true,
      form,
      message: "Intake form created successfully",
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating intake form:", error)
    
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