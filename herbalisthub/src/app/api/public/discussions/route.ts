import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { z } from "zod"

const discussionQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  type: z.enum(["blog", "formula", "general"]).optional(),
  resourceId: z.string().optional(),
  sort: z.enum(["newest", "oldest", "popular"]).optional().default("newest"),
})

const commentSchema = z.object({
  resourceType: z.enum(["blog", "formula", "general"]),
  resourceId: z.string().optional(),
  content: z.string().min(1).max(2000),
  authorName: z.string().min(1).max(100),
  authorEmail: z.string().email(),
  parentId: z.string().optional(),
})

// GET /api/public/discussions - Get public discussions/comments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = discussionQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      type: searchParams.get("type") || undefined,
      resourceId: searchParams.get("resourceId") || undefined,
      sort: searchParams.get("sort") || "newest",
    })

    const page = parseInt(query.page)
    const limit = Math.min(parseInt(query.limit), 100)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      status: "APPROVED",
      parentId: null, // Only top-level comments
    }

    if (query.type && query.resourceId) {
      if (query.type === "blog") {
        where.blogPostId = query.resourceId
      } else if (query.type === "formula") {
        where.formulaId = query.resourceId
      }
    }

    // Build order by clause
    let orderBy: any = { createdAt: "desc" }
    if (query.sort === "oldest") {
      orderBy = { createdAt: "asc" }
    } else if (query.sort === "popular") {
      orderBy = { likes: "desc" }
    }

    const [comments, totalCount] = await Promise.all([
      prisma.discussion.findMany({
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
          replies: {
            where: {
              status: "APPROVED",
            },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
            take: 5, // First 5 replies
          },
          _count: {
            select: {
              replies: {
                where: {
                  status: "APPROVED",
                },
              },
              likes: true,
            },
          },
        },
      }),
      prisma.discussion.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      discussions: comments.map(comment => ({
        ...comment,
        replyCount: comment._count.replies,
        likeCount: comment._count.likes,
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
    console.error("Error fetching discussions:", error)
    return NextResponse.json(
      { error: "Failed to fetch discussions" },
      { status: 500 }
    )
  }
}

// POST /api/public/discussions - Create a new discussion/comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = commentSchema.parse(body)

    // Validate resource exists if specified
    if (data.resourceId) {
      if (data.resourceType === "blog") {
        const blogPost = await prisma.blogPost.findFirst({
          where: {
            id: data.resourceId,
            status: "PUBLISHED",
            commentsEnabled: true,
          },
        })
        
        if (!blogPost) {
          return NextResponse.json(
            { error: "Blog post not found or comments are disabled" },
            { status: 404 }
          )
        }
      } else if (data.resourceType === "formula") {
        const formula = await prisma.formula.findFirst({
          where: {
            id: data.resourceId,
            visibility: "PUBLIC",
            status: "PUBLISHED",
          },
        })
        
        if (!formula) {
          return NextResponse.json(
            { error: "Formula not found or not public" },
            { status: 404 }
          )
        }
      }
    }

    // Check if parent comment exists (for replies)
    if (data.parentId) {
      const parentComment = await prisma.discussion.findFirst({
        where: {
          id: data.parentId,
          status: "APPROVED",
        },
      })

      if (!parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 400 }
        )
      }
    }

    // Create the discussion/comment
    const discussionData: any = {
      content: data.content,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      parentId: data.parentId,
      status: "PENDING", // Requires moderation
    }

    if (data.resourceType === "blog" && data.resourceId) {
      discussionData.blogPostId = data.resourceId
    } else if (data.resourceType === "formula" && data.resourceId) {
      discussionData.formulaId = data.resourceId
    }

    const discussion = await prisma.discussion.create({
      data: discussionData,
    })

    return NextResponse.json({
      success: true,
      message: "Comment submitted successfully and is pending moderation",
      discussionId: discussion.id,
    })
  } catch (error) {
    console.error("Error creating discussion:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid comment data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    )
  }
}