import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { z } from "zod"
import { Role } from "@prisma/client"
import { PHIEncryption } from "@/lib/encryption/crypto"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

// Search query schema
const searchQuerySchema = z.object({
  query: z.string().min(1, "Search query is required"),
  searchFields: z.array(z.enum([
    "name", 
    "email", 
    "phone", 
    "allergies", 
    "medications", 
    "conditions", 
    "healthGoals"
  ])).optional().default(["name", "email"]),
  status: z.array(z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"])).optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(25),
  sortBy: z.enum(["firstName", "lastName", "email", "createdAt", "lastContactAt"]).optional().default("lastName"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
})

// Advanced search filters schema
const advancedSearchSchema = z.object({
  ageRange: z.object({
    min: z.number().int().min(0).optional(),
    max: z.number().int().max(150).optional(),
  }).optional(),
  conditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  lastContactSince: z.string().optional(), // ISO date string
  nextAppointmentBefore: z.string().optional(), // ISO date string
  herbalistId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can search client data
    if (session.user.role !== Role.HERBALIST && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate search parameters
    const searchValidation = searchQuerySchema.safeParse(body)
    
    if (!searchValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid search parameters",
          details: searchValidation.error.errors,
        },
        { status: 400 }
      )
    }

    const { 
      query, 
      searchFields, 
      status, 
      page, 
      limit, 
      sortBy, 
      sortOrder 
    } = searchValidation.data

    // Parse advanced filters if provided
    let advancedFilters: z.infer<typeof advancedSearchSchema> = {}
    if (body.filters) {
      const filtersValidation = advancedSearchSchema.safeParse(body.filters)
      if (filtersValidation.success) {
        advancedFilters = filtersValidation.data
      }
    }

    // Build where clause
    const where: any = {
      AND: [],
    }

    // For herbalists, only search their own clients
    if (session.user.role === Role.HERBALIST) {
      where.AND.push({ herbalistId: session.user.id })
    }

    // Filter by herbalist if specified (admin only)
    if (advancedFilters.herbalistId && session.user.role === Role.ADMIN) {
      where.AND.push({ herbalistId: advancedFilters.herbalistId })
    }

    // Status filter
    if (status && status.length > 0) {
      where.AND.push({ status: { in: status } })
    } else {
      // Default to active clients only
      where.AND.push({ status: { in: ["ACTIVE"] } })
    }

    // Age range filter
    if (advancedFilters.ageRange) {
      const now = new Date()
      if (advancedFilters.ageRange.min !== undefined) {
        const maxDate = new Date(now.getFullYear() - advancedFilters.ageRange.min, now.getMonth(), now.getDate())
        where.AND.push({ dateOfBirth: { lte: maxDate } })
      }
      if (advancedFilters.ageRange.max !== undefined) {
        const minDate = new Date(now.getFullYear() - advancedFilters.ageRange.max - 1, now.getMonth(), now.getDate())
        where.AND.push({ dateOfBirth: { gte: minDate } })
      }
    }

    // Last contact filter
    if (advancedFilters.lastContactSince) {
      where.AND.push({
        lastContactAt: {
          gte: new Date(advancedFilters.lastContactSince),
        },
      })
    }

    // Next appointment filter
    if (advancedFilters.nextAppointmentBefore) {
      where.AND.push({
        nextAppointmentAt: {
          lte: new Date(advancedFilters.nextAppointmentBefore),
        },
      })
    }

    // Build search conditions
    const searchConditions: any[] = []

    // Basic field searches (non-encrypted)
    if (searchFields.includes("name")) {
      searchConditions.push(
        {
          firstName: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: query,
            mode: "insensitive",
          },
        }
      )
    }

    if (searchFields.includes("email")) {
      searchConditions.push({
        email: {
          contains: query,
          mode: "insensitive",
        },
      })
    }

    if (searchFields.includes("phone")) {
      searchConditions.push({
        phone: {
          contains: query,
          mode: "insensitive",
        },
      })
    }

    // Encrypted field searches using search tokens
    const encryptedFieldSearches = searchFields.filter(field => 
      ["allergies", "medications", "conditions", "healthGoals"].includes(field)
    )

    if (encryptedFieldSearches.length > 0) {
      // Generate search tokens for the query
      const queryTokens = encryptedFieldSearches.map(field => {
        const token = PHIEncryption.generateSearchToken(query.toLowerCase())
        return {
          searchTokens: {
            path: [`${field}Token`],
            equals: token,
          },
        }
      })

      // Also search for word tokens
      const words = query.toLowerCase().split(/\s+/)
      words.forEach((word, wordIndex) => {
        if (word.length > 2) {
          encryptedFieldSearches.forEach(field => {
            const wordToken = PHIEncryption.generateSearchToken(word)
            queryTokens.push({
              searchTokens: {
                path: [`${field}Word${wordIndex}`],
                equals: wordToken,
              },
            })
          })
        }
      })

      searchConditions.push(...queryTokens)
    }

    // Add search conditions to where clause
    if (searchConditions.length > 0) {
      where.AND.push({ OR: searchConditions })
    }

    // Specific condition/medication/allergy filters using tokens
    if (advancedFilters.conditions && advancedFilters.conditions.length > 0) {
      const conditionTokens = advancedFilters.conditions.map(condition => ({
        searchTokens: {
          path: ["conditionsToken"],
          equals: PHIEncryption.generateSearchToken(condition.toLowerCase()),
        },
      }))
      where.AND.push({ OR: conditionTokens })
    }

    if (advancedFilters.medications && advancedFilters.medications.length > 0) {
      const medicationTokens = advancedFilters.medications.map(medication => ({
        searchTokens: {
          path: ["medicationsToken"],
          equals: PHIEncryption.generateSearchToken(medication.toLowerCase()),
        },
      }))
      where.AND.push({ OR: medicationTokens })
    }

    if (advancedFilters.allergies && advancedFilters.allergies.length > 0) {
      const allergyTokens = advancedFilters.allergies.map(allergy => ({
        searchTokens: {
          path: ["allergiesToken"],
          equals: PHIEncryption.generateSearchToken(allergy.toLowerCase()),
        },
      }))
      where.AND.push({ OR: allergyTokens })
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Execute search
    const [clients, totalCount] = await Promise.all([
      prisma.client.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastContactAt: true,
          nextAppointmentAt: true,
          herbalistId: true,
          herbalist: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              consultationNotes: true,
              appointments: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.client.count({ where }),
    ])

    // Audit the search operation
    await auditPHIAccess(
      "read",
      "ClientSearch",
      "multiple",
      session.user.id,
      session.user.role,
      searchFields,
      AuditOutcome.SUCCESS,
      {
        searchQuery: query,
        searchFields,
        encryptedFieldsSearched: encryptedFieldSearches,
        resultCount: clients.length,
        totalCount,
        advancedFilters,
        pagination: { page, limit },
      }
    )

    return NextResponse.json({
      results: clients,
      searchMetadata: {
        query,
        searchFields,
        encryptedFieldsSearched: encryptedFieldSearches,
        totalResults: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
      appliedFilters: advancedFilters,
    })
  } catch (error) {
    console.error("Error performing client search:", error)
    
    // Audit the failed search
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "read",
          "ClientSearch",
          "multiple",
          session.user.id,
          session.user.role,
          ["attempted_search"],
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

// GET - Get search suggestions and autocomplete
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== Role.HERBALIST && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const field = searchParams.get("field") || "name"
    const limit = parseInt(searchParams.get("limit") || "10")

    if (!query || query.length < 2) {
      return NextResponse.json({
        suggestions: [],
        message: "Query too short for suggestions",
      })
    }

    let suggestions: any[] = []

    // For basic fields, provide direct suggestions
    if (field === "name") {
      const nameResults = await prisma.client.findMany({
        where: {
          AND: [
            session.user.role === Role.HERBALIST 
              ? { herbalistId: session.user.id }
              : {},
            {
              OR: [
                {
                  firstName: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  lastName: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            },
            { status: "ACTIVE" },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
        take: limit,
        orderBy: {
          lastName: "asc",
        },
      })

      suggestions = nameResults.map(client => ({
        value: `${client.firstName} ${client.lastName}`,
        label: `${client.firstName} ${client.lastName}`,
        id: client.id,
      }))
    }

    // For encrypted fields, we can't provide specific suggestions
    // but we can provide general guidance
    if (["allergies", "medications", "conditions", "healthGoals"].includes(field)) {
      suggestions = [
        {
          value: query,
          label: `Search for "${query}" in ${field}`,
          type: "encrypted_search",
        },
      ]
    }

    // Audit the suggestion request (minimal logging)
    await auditPHIAccess(
      "read",
      "ClientSearchSuggestions",
      "multiple",
      session.user.id,
      session.user.role,
      [field],
      AuditOutcome.SUCCESS,
      {
        query,
        field,
        suggestionCount: suggestions.length,
      }
    )

    return NextResponse.json({
      suggestions,
      field,
      query,
    })
  } catch (error) {
    console.error("Error getting search suggestions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}