import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { Role } from "@prisma/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { z } from "zod"

const commentSchema = z.object({
  content: z.string().min(1, "Comment content is required"),
  type: z.enum(["comment", "suggestion", "question", "review"]).default("comment"),
  parentId: z.string().optional(),
  isPrivate: z.boolean().default(false)
})

// GET - Get formula comments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formulaId = params.id
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const sortBy = searchParams.get("sortBy") || "newest"

    // Verify user has access to this formula
    const formula = await prisma.formula.findFirst({
      where: {
        id: formulaId,
        OR: [
          { createdBy: session.user.id },
          { isPublic: true, isDraft: false },
          {
            shares: {
              some: {
                OR: [
                  { sharedWith: session.user.id },
                  { shareType: "practice" },
                  { shareType: "public" }
                ],
                isActive: true
              }
            }
          }
        ]
      }
    })

    if (!formula) {
      return NextResponse.json(
        { error: "Formula not found or access denied" },
        { status: 404 }
      )
    }

    // Build where clause
    const where: any = {
      formulaId,
      parentId: null // Only get top-level comments, replies are loaded separately
    }

    // Filter by type if specified
    if (type && type !== "all") {
      where.type = type
    }

    // Only show private comments to formula owner
    if (formula.createdBy !== session.user.id) {
      where.isPrivate = false
    }

    // Build orderBy clause
    let orderBy: any
    switch (sortBy) {
      case "oldest":
        orderBy = { createdAt: "asc" }
        break
      case "replies":
        orderBy = { replies: { _count: "desc" } }
        break
      default: // newest
        orderBy = { createdAt: "desc" }
    }

    // Get comments with replies
    const comments = await prisma.formulaComment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        _count: {
          select: {
            replies: true
          }
        }
      },
      orderBy
    })

    // Filter out private replies if user is not the owner
    const filteredComments = comments.map(comment => ({
      ...comment,
      replies: comment.replies.filter(reply => 
        reply.isPrivate ? formula.createdBy === session.user.id : true
      )
    }))

    // Audit the access
    await auditPHIAccess(
      "read",
      "FormulaComments",
      formulaId,
      session.user.id,
      session.user.role,
      ["comment_data"],
      AuditOutcome.SUCCESS,
      "Retrieved formula comments"
    )

    return NextResponse.json({
      success: true,
      comments: filteredComments
    })
  } catch (error) {
    console.error("Error fetching formula comments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create new comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formulaId = params.id
    const body = await request.json()
    
    const validationResult = commentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid comment data",
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const commentData = validationResult.data

    // Verify user has comment access to this formula
    const formula = await prisma.formula.findFirst({
      where: {
        id: formulaId,
        OR: [
          { createdBy: session.user.id },
          { isPublic: true, isDraft: false },
          {
            shares: {
              some: {
                OR: [
                  { 
                    sharedWith: session.user.id,
                    accessLevel: { in: ["comment", "edit", "admin"] }
                  },
                  { 
                    shareType: "practice",
                    accessLevel: { in: ["comment", "edit", "admin"] }
                  },
                  { 
                    shareType: "public",
                    accessLevel: { in: ["comment", "edit", "admin"] }
                  }
                ],
                isActive: true
              }
            }
          }
        ]
      }
    })

    if (!formula) {
      return NextResponse.json(
        { error: "Formula not found or comment access denied" },
        { status: 404 }
      )
    }

    // If replying to a comment, verify parent exists
    if (commentData.parentId) {
      const parentComment = await prisma.formulaComment.findUnique({
        where: { id: commentData.parentId }
      })

      if (!parentComment || parentComment.formulaId !== formulaId) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        )
      }
    }

    // Create the comment
    const comment = await prisma.formulaComment.create({
      data: {
        formulaId,
        userId: session.user.id,
        content: commentData.content,
        type: commentData.type,
        parentId: commentData.parentId,
        isPrivate: commentData.isPrivate
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true
          }
        }
      }
    })

    // Audit the comment creation
    await auditPHIAccess(
      "create",
      "FormulaComment",
      formulaId,
      session.user.id,
      session.user.role,
      ["comment_data"],
      AuditOutcome.SUCCESS,
      `Created ${commentData.type} comment${commentData.parentId ? " (reply)" : ""}`
    )

    return NextResponse.json({
      success: true,
      comment,
      message: "Comment added successfully"
    })
  } catch (error) {
    console.error("Error creating formula comment:", error)
    
    // Audit the failed attempt
    const session = await getServerSession(authOptions)
    if (session?.user) {
      await auditPHIAccess(
        "create",
        "FormulaComment",
        params.id,
        session.user.id,
        session.user.role,
        ["comment_data"],
        AuditOutcome.FAILURE,
        `Failed to create comment: ${error}`
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}