import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { z } from "zod"

const formulaQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("12"),
  category: z.string().optional(),
  condition: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["newest", "popular", "rating", "alphabetical"]).optional().default("newest"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
})

// GET /api/public/formulas - Get published formulas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = formulaQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "12",
      category: searchParams.get("category") || undefined,
      condition: searchParams.get("condition") || undefined,
      search: searchParams.get("search") || undefined,
      sort: searchParams.get("sort") || "newest",
      difficulty: searchParams.get("difficulty") || undefined,
    })

    const page = parseInt(query.page)
    const limit = Math.min(parseInt(query.limit), 50) // Max 50 per page
    const skip = (page - 1) * limit

    // Build where clause for filtering
    const where: any = {
      visibility: "PUBLIC",
      status: "PUBLISHED",
    }

    if (query.category) {
      where.categories = {
        some: {
          name: {
            contains: query.category,
            mode: "insensitive",
          },
        },
      }
    }

    if (query.condition) {
      where.conditions = {
        some: {
          name: {
            contains: query.condition,
            mode: "insensitive",
          },
        },
      }
    }

    if (query.difficulty) {
      where.difficulty = query.difficulty.toUpperCase()
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { ingredients: {
          some: {
            herb: {
              name: { contains: query.search, mode: "insensitive" }
            }
          }
        }},
      ]
    }

    // Build order by clause
    let orderBy: any = { createdAt: "desc" }
    if (query.sort === "popular") {
      orderBy = { viewCount: "desc" }
    } else if (query.sort === "rating") {
      orderBy = { averageRating: "desc" }
    } else if (query.sort === "alphabetical") {
      orderBy = { name: "asc" }
    }

    // Get formulas with total count
    const [formulas, totalCount] = await Promise.all([
      prisma.formula.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
            },
          },
          ingredients: {
            include: {
              herb: {
                select: {
                  id: true,
                  name: true,
                  scientificName: true,
                  image: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
          categories: true,
          conditions: true,
          _count: {
            select: {
              reviews: true,
              favorites: true,
            },
          },
        },
      }),
      prisma.formula.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      formulas: formulas.map(formula => ({
        id: formula.id,
        name: formula.name,
        description: formula.description,
        difficulty: formula.difficulty,
        preparationTime: formula.preparationTime,
        servings: formula.servings,
        averageRating: formula.averageRating,
        viewCount: formula.viewCount,
        createdAt: formula.createdAt,
        updatedAt: formula.updatedAt,
        author: formula.createdByUser,
        ingredients: formula.ingredients.map(ing => ({
          herb: ing.herb,
          quantity: ing.quantity,
          unit: ing.unit,
          processingNotes: ing.processingNotes,
        })),
        categories: formula.categories.map(c => c.name),
        conditions: formula.conditions.map(c => c.name),
        reviewCount: formula._count.reviews,
        favoriteCount: formula._count.favorites,
        image: formula.image,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Error fetching public formulas:", error)
    return NextResponse.json(
      { error: "Failed to fetch formulas" },
      { status: 500 }
    )
  }
}

// GET /api/public/formulas/categories - Get formula categories
export async function OPTIONS(request: NextRequest) {
  try {
    const categories = await prisma.formulaCategory.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            formulas: {
              where: {
                visibility: "PUBLIC",
                status: "PUBLISHED",
              },
            },
          },
        },
      },
      where: {
        formulas: {
          some: {
            visibility: "PUBLIC",
            status: "PUBLISHED",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    const conditions = await prisma.formulaCondition.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            formulas: {
              where: {
                visibility: "PUBLIC",
                status: "PUBLISHED",
              },
            },
          },
        },
      },
      where: {
        formulas: {
          some: {
            visibility: "PUBLIC",
            status: "PUBLISHED",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json({
      categories: categories.map(cat => ({
        ...cat,
        formulaCount: cat._count.formulas,
      })),
      conditions: conditions.map(cond => ({
        ...cond,
        formulaCount: cond._count.formulas,
      })),
    })
  } catch (error) {
    console.error("Error fetching formula categories:", error)
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    )
  }
}