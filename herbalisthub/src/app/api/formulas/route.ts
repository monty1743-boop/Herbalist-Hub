import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { z } from "zod"
import { Role } from "@prisma/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { FormulaVersionControl } from "@/lib/formulas/version-control"
import { 
  formulaSchema, 
  formulaFilterSchema,
  type FormulaInput,
  type FormulaFilterInput 
} from "@/lib/validation/formula"

// GET - List formulas with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can access formulas
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const filterParams: FormulaFilterInput = {
      search: searchParams.get("search") || undefined,
      category: searchParams.get("category") || undefined,
      difficulty: searchParams.get("difficulty") as any || undefined,
      isPublic: searchParams.get("isPublic") ? searchParams.get("isPublic") === "true" : undefined,
      isDraft: searchParams.get("isDraft") ? searchParams.get("isDraft") === "true" : undefined,
      hasIngredient: searchParams.get("hasIngredient") || undefined,
      hasIngredients: searchParams.get("hasIngredients") ? searchParams.get("hasIngredients")!.split(",") : undefined,
      tags: searchParams.get("tags") ? searchParams.get("tags")!.split(",") : undefined,
      priceRange: {
        min: searchParams.get("priceMin") ? parseFloat(searchParams.get("priceMin")!) : undefined,
        max: searchParams.get("priceMax") ? parseFloat(searchParams.get("priceMax")!) : undefined
      },
      prepTimeRange: {
        min: searchParams.get("prepTimeMin") ? parseInt(searchParams.get("prepTimeMin")!) : undefined,
        max: searchParams.get("prepTimeMax") ? parseInt(searchParams.get("prepTimeMax")!) : undefined
      },
      availabilityStatus: searchParams.get("availabilityStatus") as any || undefined,
      createdBy: searchParams.get("createdBy") || undefined,
      searchFields: searchParams.get("searchFields") ? searchParams.get("searchFields")!.split(",") as any : undefined,
      sortBy: (searchParams.get("sortBy") as any) || "updatedAt",
      sortOrder: (searchParams.get("sortOrder") as any) || "desc",
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20,
    }

    const validationResult = formulaFilterSchema.safeParse(filterParams)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid filter parameters",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const filters = validationResult.data

    // Build where clause
    const where: any = {}

    // Text search across multiple fields
    if (filters.search) {
      const searchFields = filters.searchFields || ["name", "description", "category", "instructions"]
      const searchConditions = []
      
      if (searchFields.includes("name")) {
        searchConditions.push({ name: { contains: filters.search, mode: "insensitive" } })
      }
      if (searchFields.includes("description")) {
        searchConditions.push({ description: { contains: filters.search, mode: "insensitive" } })
      }
      if (searchFields.includes("category")) {
        searchConditions.push({ category: { contains: filters.search, mode: "insensitive" } })
      }
      if (searchFields.includes("instructions")) {
        searchConditions.push({ instructions: { contains: filters.search, mode: "insensitive" } })
      }
      if (searchFields.includes("tags")) {
        searchConditions.push({
          tags: {
            some: {
              tag: { contains: filters.search, mode: "insensitive" }
            }
          }
        })
      }
      if (searchFields.includes("ingredients")) {
        searchConditions.push({
          ingredients: {
            some: {
              herb: {
                name: { contains: filters.search, mode: "insensitive" }
              }
            }
          }
        })
      }
      
      where.OR = searchConditions
    }

    // Category filter
    if (filters.category) {
      where.category = { equals: filters.category, mode: "insensitive" }
    }

    // Difficulty filter
    if (filters.difficulty) {
      where.difficulty = filters.difficulty
    }

    // Visibility filters
    if (filters.isPublic !== undefined) {
      where.isPublic = filters.isPublic
    }

    if (filters.isDraft !== undefined) {
      where.isDraft = filters.isDraft
    }

    // Ingredient filters
    if (filters.hasIngredient) {
      where.ingredients = {
        some: {
          herbId: filters.hasIngredient
        }
      }
    }
    
    if (filters.hasIngredients && filters.hasIngredients.length > 0) {
      where.ingredients = {
        some: {
          herbId: { in: filters.hasIngredients }
        }
      }
    }
    
    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        some: {
          tag: { in: filters.tags }
        }
      }
    }
    
    // Price range filter
    if (filters.priceRange) {
      const priceConditions: any = {}
      if (filters.priceRange.min !== undefined) {
        priceConditions.gte = filters.priceRange.min
      }
      if (filters.priceRange.max !== undefined) {
        priceConditions.lte = filters.priceRange.max
      }
      if (Object.keys(priceConditions).length > 0) {
        where.finalPrice = priceConditions
      }
    }
    
    // Prep time range filter
    if (filters.prepTimeRange) {
      const prepTimeConditions: any = {}
      if (filters.prepTimeRange.min !== undefined) {
        prepTimeConditions.gte = filters.prepTimeRange.min
      }
      if (filters.prepTimeRange.max !== undefined) {
        prepTimeConditions.lte = filters.prepTimeRange.max
      }
      if (Object.keys(prepTimeConditions).length > 0) {
        where.prepTime = prepTimeConditions
      }
    }
    
    // Creator filter
    if (filters.createdBy) {
      where.createdBy = filters.createdBy
    }

    // Role-based access control for herbalists
    if (session.user.role === Role.HERBALIST) {
      // Herbalists can see their own formulas and public formulas
      where.OR = [
        { createdBy: session.user.id },
        { isPublic: true, isDraft: false }
      ]
    }

    // Calculate pagination
    const skip = ((filters.page || 1) - 1) * (filters.limit || 20)

    // Get formulas with related data
    const [formulas, totalCount] = await Promise.all([
      prisma.formula.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          difficulty: true,
          prepTime: true,
          yieldAmount: true,
          yieldUnit: true,
          dosage: true,
          duration: true,
          basePrice: true,
          laborCost: true,
          markupPercent: true,
          finalPrice: true,
          isPublic: true,
          isDraft: true,
          publishedAt: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          ingredients: {
            select: {
              id: true,
              quantity: true,
              unit: true,
              ratio: true,
              processingNotes: true,
              costPerUnit: true,
              totalCost: true,
              herb: {
                select: {
                  id: true,
                  name: true,
                  latinName: true,
                  type: true,
                  costPerUnit: true,
                  quantity: true,
                  unit: true,
                }
              }
            },
            orderBy: { createdAt: "asc" }
          },
          tags: {
            select: {
              tag: true
            }
          },
          _count: {
            select: {
              ingredients: true,
              versions: true,
              discussions: true,
            }
          }
        },
        orderBy: {
          [filters.sortBy || "updatedAt"]: filters.sortOrder || "desc",
        },
        skip,
        take: filters.limit || 20,
      }),
      prisma.formula.count({ where }),
    ])

    // Calculate derived fields for each formula
    const formulasWithCalculations = formulas.map(formula => {
      const totalIngredientCost = formula.ingredients.reduce((sum, ingredient) => {
        return sum + (ingredient.totalCost?.toNumber() || 0)
      }, 0)

      const totalCost = totalIngredientCost + (formula.laborCost?.toNumber() || 0)
      const finalPrice = totalCost * (1 + ((formula.markupPercent?.toNumber() || 0) / 100))

      return {
        ...formula,
        calculatedTotalCost: totalCost,
        calculatedFinalPrice: finalPrice,
        availabilityStatus: formula.ingredients.every(ingredient => 
          (ingredient.herb.quantity?.toNumber() || 0) >= (ingredient.quantity?.toNumber() || 0)
        ) ? "available" : "partial",
      }
    })

    // Audit the formula list access
    await auditPHIAccess(
      "read",
      "FormulaList",
      "multiple",
      session.user.id,
      session.user.role,
      ["formula_data"],
      AuditOutcome.SUCCESS,
      {
        resultCount: formulas.length,
        totalCount,
        filters: filters,
        userRole: session.user.role,
      }
    )

    return NextResponse.json({
      formulas: formulasWithCalculations,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        totalCount,
        totalPages: Math.ceil(totalCount / (filters.limit || 20)),
        hasNext: ((filters.page || 1) * (filters.limit || 20)) < totalCount,
        hasPrev: (filters.page || 1) > 1,
      },
      summary: {
        totalFormulas: totalCount,
        availableFormulas: formulasWithCalculations.filter(f => f.availabilityStatus === "available").length,
        publicFormulas: formulasWithCalculations.filter(f => f.isPublic && !f.isDraft).length,
        draftFormulas: formulasWithCalculations.filter(f => f.isDraft).length,
      }
    })
  } catch (error) {
    console.error("Error fetching formulas:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create a new formula
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can create formulas
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate formula data
    const validationResult = formulaSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const formulaData: FormulaInput = validationResult.data

    // Validate that all herbs exist and have sufficient quantity
    const herbIds = formulaData.ingredients.map(ingredient => ingredient.herbId)
    const herbs = await prisma.herb.findMany({
      where: { id: { in: herbIds } },
      select: {
        id: true,
        name: true,
        quantity: true,
        unit: true,
        costPerUnit: true,
      }
    })

    if (herbs.length !== herbIds.length) {
      const foundHerbIds = herbs.map(h => h.id)
      const missingHerbIds = herbIds.filter(id => !foundHerbIds.includes(id))
      return NextResponse.json(
        { 
          error: "Some herbs not found", 
          missingHerbs: missingHerbIds 
        },
        { status: 400 }
      )
    }

    // Calculate ingredient costs and validate availability
    const ingredientCosts: { [herbId: string]: { costPerUnit: number; totalCost: number } } = {}
    let hasAvailabilityIssues = false
    const availabilityIssues: string[] = []

    for (const ingredient of formulaData.ingredients) {
      const herb = herbs.find(h => h.id === ingredient.herbId)!
      const herbQuantity = herb.quantity?.toNumber() || 0
      const herbCostPerUnit = herb.costPerUnit?.toNumber() || 0
      
      // Check availability (warning only, not blocking)
      if (herbQuantity < ingredient.quantity) {
        hasAvailabilityIssues = true
        availabilityIssues.push(`${herb.name}: Requested ${ingredient.quantity} ${ingredient.unit}, available ${herbQuantity} ${herb.unit}`)
      }

      // Calculate cost
      const totalCost = ingredient.quantity * herbCostPerUnit
      ingredientCosts[ingredient.herbId] = {
        costPerUnit: herbCostPerUnit,
        totalCost: totalCost
      }
    }

    // Calculate formula base price from ingredients
    const totalIngredientCost = Object.values(ingredientCosts).reduce((sum, cost) => sum + cost.totalCost, 0)
    const laborCost = formulaData.laborCost || 0
    const totalCost = totalIngredientCost + laborCost
    const markupPercent = formulaData.markupPercent || 50
    const finalPrice = totalCost * (1 + (markupPercent / 100))

    // Create the formula with transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create formula
      const formula = await tx.formula.create({
        data: {
          name: formulaData.name,
          description: formulaData.description,
          instructions: formulaData.instructions,
          category: formulaData.category,
          difficulty: formulaData.difficulty,
          prepTime: formulaData.prepTime,
          yieldAmount: formulaData.yieldAmount,
          yieldUnit: formulaData.yieldUnit,
          dosage: formulaData.dosage,
          duration: formulaData.duration,
          contraindications: formulaData.contraindications,
          interactions: formulaData.interactions,
          basePrice: totalIngredientCost,
          laborCost: laborCost,
          markupPercent: markupPercent,
          finalPrice: finalPrice,
          isPublic: formulaData.isPublic,
          isDraft: formulaData.isDraft,
          publishedAt: formulaData.isPublic && !formulaData.isDraft ? new Date() : null,
          createdBy: session.user.id,
        },
        select: {
          id: true,
          name: true,
          version: true,
          createdAt: true,
        }
      })

      // Create formula ingredients
      const ingredientRecords = await Promise.all(
        formulaData.ingredients.map((ingredient) =>
          tx.formulaIngredient.create({
            data: {
              formulaId: formula.id,
              herbId: ingredient.herbId,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              ratio: ingredient.ratio,
              processingNotes: ingredient.processingNotes,
              costPerUnit: ingredientCosts[ingredient.herbId].costPerUnit,
              totalCost: ingredientCosts[ingredient.herbId].totalCost,
            },
            select: {
              id: true,
              quantity: true,
              unit: true,
              totalCost: true,
              herb: {
                select: {
                  id: true,
                  name: true,
                  latinName: true,
                }
              }
            }
          })
        )
      )

      return { formula, ingredients: ingredientRecords }
    })

    // Create initial version record
    await FormulaVersionControl.createInitialVersion(
      result.formula.id,
      {
        ...formulaData,
        id: result.formula.id,
        version: 1,
        createdAt: result.formula.createdAt,
        updatedAt: result.formula.createdAt,
        ingredients: result.ingredients.map(ing => ({
          herbId: ing.herb.id,
          herbName: ing.herb.name,
          quantity: ing.quantity?.toNumber() || 0,
          unit: ing.unit,
          processingNotes: formulaData.ingredients.find(fi => fi.herbId === ing.herb.id)?.processingNotes || ""
        }))
      },
      session.user.id
    )

    // Audit the formula creation
    await auditPHIAccess(
      "write",
      "Formula",
      result.formula.id,
      session.user.id,
      session.user.role,
      ["formula_data", "ingredient_data"],
      AuditOutcome.SUCCESS,
      {
        formulaName: formulaData.name,
        ingredientCount: formulaData.ingredients.length,
        totalCost: totalCost,
        finalPrice: finalPrice,
        isPublic: formulaData.isPublic,
        hasAvailabilityIssues: hasAvailabilityIssues,
        availabilityIssues: availabilityIssues,
      }
    )

    const response: any = {
      success: true,
      formula: result.formula,
      ingredients: result.ingredients,
      costCalculation: {
        ingredientCost: totalIngredientCost,
        laborCost: laborCost,
        totalCost: totalCost,
        markupPercent: markupPercent,
        finalPrice: finalPrice,
      },
      message: "Formula created successfully",
    }

    // Add availability warnings if any
    if (hasAvailabilityIssues) {
      response.warnings = {
        availabilityIssues: availabilityIssues,
        message: "Some ingredients may have insufficient inventory"
      }
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Error creating formula:", error)
    
    // Audit the failed creation attempt
    try {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        await auditPHIAccess(
          "write",
          "Formula",
          "unknown",
          session.user.id,
          session.user.role,
          ["attempted_creation"],
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