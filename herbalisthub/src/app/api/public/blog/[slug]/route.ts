import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"

// GET /api/public/blog/[slug] - Get a specific blog post by slug
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    if (!slug) {
      return NextResponse.json(
        { error: "Blog post slug is required" },
        { status: 400 }
      )
    }

    // Find the blog post
    const post = await prisma.blogPost.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
        publishedAt: {
          lte: new Date(),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            bio: true,
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
        comments: {
          where: {
            status: "APPROVED",
            parentId: null, // Only top-level comments
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
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
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
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
    })

    if (!post) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      )
    }

    // Increment view count (in background)
    prisma.blogPost.update({
      where: { id: post.id },
      data: { views: { increment: 1 } },
    }).catch(error => {
      console.error("Error updating view count:", error)
    })

    // Get related posts
    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
        id: { not: post.id },
        OR: [
          {
            categories: {
              some: {
                categoryId: {
                  in: post.categories.map(c => c.categoryId),
                },
              },
            },
          },
          {
            tags: {
              some: {
                tagId: {
                  in: post.tags.map(t => t.tagId),
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        publishedAt: true,
        readingTime: true,
        author: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 3,
    })

    return NextResponse.json({
      post: {
        ...post,
        categories: post.categories.map(c => c.category),
        tags: post.tags.map(t => t.tag),
        commentCount: post._count.comments,
        likeCount: post._count.likes,
      },
      relatedPosts,
    })
  } catch (error) {
    console.error("Error fetching blog post:", error)
    return NextResponse.json(
      { error: "Failed to fetch blog post" },
      { status: 500 }
    )
  }
}

// POST /api/public/blog/[slug] - Add a comment to a blog post
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const body = await request.json()

    const commentSchema = {
      content: body.content,
      authorName: body.authorName,
      authorEmail: body.authorEmail,
      parentId: body.parentId || null,
    }

    // Validate required fields
    if (!commentSchema.content || !commentSchema.authorName || !commentSchema.authorEmail) {
      return NextResponse.json(
        { error: "Content, name, and email are required" },
        { status: 400 }
      )
    }

    // Find the blog post
    const post = await prisma.blogPost.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
        commentsEnabled: true,
      },
    })

    if (!post) {
      return NextResponse.json(
        { error: "Blog post not found or comments are disabled" },
        { status: 404 }
      )
    }

    // Check if parent comment exists (for replies)
    if (commentSchema.parentId) {
      const parentComment = await prisma.blogComment.findFirst({
        where: {
          id: commentSchema.parentId,
          postId: post.id,
        },
      })

      if (!parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 400 }
        )
      }
    }

    // Create the comment (requires moderation by default)
    const comment = await prisma.blogComment.create({
      data: {
        postId: post.id,
        content: commentSchema.content,
        authorName: commentSchema.authorName,
        authorEmail: commentSchema.authorEmail,
        parentId: commentSchema.parentId,
        status: "PENDING", // Requires moderation
      },
    })

    return NextResponse.json({
      success: true,
      message: "Comment submitted successfully and is pending moderation",
      commentId: comment.id,
    })
  } catch (error) {
    console.error("Error creating comment:", error)
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    )
  }
}