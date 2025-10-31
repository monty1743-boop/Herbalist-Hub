import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"

// GET /api/public/formulas/[id] - Get a specific formula by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: "Formula ID is required" },
        { status: 400 }
      )
    }

    // Find the formula
    const formula = await prisma.formula.findFirst({
      where: {
        id,
        visibility: "PUBLIC",
        status: "PUBLISHED",
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            bio: true,
          },
        },
        ingredients: {
          include: {
            herb: {
              select: {
                id: true,
                name: true,
                scientificName: true,
                description: true,
                image: true,
                properties: true,
                safetyInfo: true,
              },
            },
          },
          orderBy: {
            order: "asc",
          },
        },
        categories: true,
        conditions: true,
        reviews: {
          where: {
            status: "APPROVED",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10, // Latest 10 reviews
        },
        _count: {
          select: {
            reviews: {
              where: {
                status: "APPROVED",
              },
            },
            favorites: true,
          },
        },
      },
    })

    if (!formula) {
      return NextResponse.json(
        { error: "Formula not found" },
        { status: 404 }
      )
    }

    // Increment view count (in background)
    prisma.formula.update({
      where: { id: formula.id },
      data: { viewCount: { increment: 1 } },
    }).catch(error => {
      console.error("Error updating view count:", error)
    })

    // Get related formulas
    const relatedFormulas = await prisma.formula.findMany({
      where: {
        visibility: "PUBLIC",
        status: "PUBLISHED",
        id: { not: formula.id },
        OR: [
          {
            categories: {
              some: {
                id: {
                  in: formula.categories.map(c => c.id),
                },
              },
            },
          },
          {
            conditions: {
              some: {
                id: {
                  in: formula.conditions.map(c => c.id),
                },
              },
            },
          },
          {
            ingredients: {
              some: {
                herbId: {
                  in: formula.ingredients.map(i => i.herbId),
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        averageRating: true,
        image: true,
        createdByUser: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        averageRating: "desc",
      },
      take: 4,
    })

    return NextResponse.json({
      formula: {
        ...formula,
        reviewCount: formula._count.reviews,
        favoriteCount: formula._count.favorites,
      },
      relatedFormulas,
    })
  } catch (error) {
    console.error("Error fetching formula:", error)
    return NextResponse.json(
      { error: "Failed to fetch formula" },
      { status: 500 }
    )
  }
}

// POST /api/public/formulas/[id] - Add a review or favorite
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { action, ...data } = body

    if (!id) {
      return NextResponse.json(
        { error: "Formula ID is required" },
        { status: 400 }
      )
    }

    // Verify formula exists and is public
    const formula = await prisma.formula.findFirst({
      where: {
        id,
        visibility: "PUBLIC",
        status: "PUBLISHED",
      },
    })

    if (!formula) {
      return NextResponse.json(
        { error: "Formula not found" },
        { status: 404 }
      )
    }

    if (action === "review") {
      // Add a review
      const { rating, comment, reviewerName, reviewerEmail } = data

      if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: "Rating must be between 1 and 5" },
          { status: 400 }
        )
      }

      if (!reviewerName || !reviewerEmail) {
        return NextResponse.json(
          { error: "Reviewer name and email are required" },
          { status: 400 }
        )
      }

      const review = await prisma.formulaReview.create({
        data: {
          formulaId: id,
          rating,
          comment: comment || "",
          reviewerName,
          reviewerEmail,
          status: "PENDING", // Requires moderation
        },
      })

      return NextResponse.json({
        success: true,
        message: "Review submitted successfully and is pending moderation",
        reviewId: review.id,
      })
    } else if (action === "favorite") {
      // Toggle favorite (requires user email for tracking)
      const { userEmail, add } = data

      if (!userEmail) {
        return NextResponse.json(
          { error: "User email is required" },
          { status: 400 }
        )
      }

      if (add) {
        // Add to favorites
        await prisma.formulaFavorite.upsert({
          where: {
            formulaId_userEmail: {
              formulaId: id,
              userEmail,
            },
          },
          create: {
            formulaId: id,
            userEmail,
          },
          update: {}, // No update needed if exists
        })

        return NextResponse.json({
          success: true,
          message: "Formula added to favorites",
        })
      } else {
        // Remove from favorites
        await prisma.formulaFavorite.deleteMany({
          where: {
            formulaId: id,
            userEmail,
          },
        })

        return NextResponse.json({
          success: true,
          message: "Formula removed from favorites",
        })
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error processing formula action:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}