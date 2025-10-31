import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { z } from "zod"

const blogQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  category: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["newest", "oldest", "popular"]).optional().default("newest"),
})

// GET /api/public/blog - Get published blog posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = blogQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      category: searchParams.get("category") || undefined,
      tag: searchParams.get("tag") || undefined,
      search: searchParams.get("search") || undefined,
      sort: searchParams.get("sort") || "newest",
    })

    const page = parseInt(query.page)
    const limit = Math.min(parseInt(query.limit), 50) // Max 50 per page
    const skip = (page - 1) * limit

    // Build where clause for filtering
    const where: any = {
      status: "PUBLISHED",
      publishedAt: {
        lte: new Date(), // Only show posts that are scheduled to be published
      },
    }

    if (query.category) {
      where.categories = {
        some: {
          category: {
            slug: query.category,
          },
        },
      }
    }

    if (query.tag) {
      where.tags = {
        some: {
          tag: {
            slug: query.tag,
          },
        },
      }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { excerpt: { contains: query.search, mode: "insensitive" } },
        { content: { contains: query.search, mode: "insensitive" } },
      ]
    }

    // Build order by clause
    let orderBy: any = { publishedAt: "desc" }
    if (query.sort === "oldest") {
      orderBy = { publishedAt: "asc" }
    } else if (query.sort === "popular") {
      orderBy = { views: "desc" }
    }

    // Get posts with total count
    const [posts, totalCount] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              comments: {
                where: {
                  status: "APPROVED",
                },
              },
              likes: true,
            },
          },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          publishedAt: true,
          updatedAt: true,
          readingTime: true,
          views: true,
          author: true,
          categories: true,
          tags: true,
          _count: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      posts: posts.map(post => ({
        ...post,
        categories: post.categories.map(c => c.category),
        tags: post.tags.map(t => t.tag),
        commentCount: post._count.comments,
        likeCount: post._count.likes,
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
    console.error("Error fetching blog posts:", error)
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 }
    )
  }
}

// POST /api/public/blog - Subscribe to blog notifications (for newsletter signups)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const subscriptionSchema = z.object({
      email: z.string().email(),
      name: z.string().optional(),
      categories: z.array(z.string()).optional(),
    })

    const data = subscriptionSchema.parse(body)

    // Check if subscription already exists
    const existingSubscription = await prisma.newsletterSubscription.findUnique({
      where: { email: data.email },
    })

    if (existingSubscription) {
      if (existingSubscription.status === "UNSUBSCRIBED") {
        // Reactivate subscription
        await prisma.newsletterSubscription.update({
          where: { email: data.email },
          data: {
            status: "ACTIVE",
            subscribedAt: new Date(),
            preferences: data.categories ? { categories: data.categories } : undefined,
          },
        })
        
        return NextResponse.json({
          success: true,
          message: "Successfully resubscribed to blog updates",
        })
      }
      
      return NextResponse.json({
        success: true,
        message: "Already subscribed to blog updates",
      })
    }

    // Create new subscription
    await prisma.newsletterSubscription.create({
      data: {
        email: data.email,
        name: data.name,
        status: "ACTIVE",
        source: "BLOG",
        subscribedAt: new Date(),
        preferences: data.categories ? { categories: data.categories } : undefined,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to blog updates",
    })
  } catch (error) {
    console.error("Error creating blog subscription:", error)
    return NextResponse.json(
      { error: "Failed to subscribe to blog updates" },
      { status: 500 }
    )
  }
}