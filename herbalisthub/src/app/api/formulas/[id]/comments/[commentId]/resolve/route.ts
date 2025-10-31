import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { Role } from "@prisma/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

// POST - Mark comment as resolved
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: formulaId, commentId } = params

    // Get the comment and verify it exists
    const comment = await prisma.formulaComment.findUnique({
      where: { id: commentId },
      include: {
        formula: {
          select: {
            id: true,
            createdBy: true
          }
        }
      }
    })

    if (!comment || comment.formulaId !== formulaId) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      )
    }

    // Only formula owners, admins, or comment authors can resolve comments
    const canResolve = comment.formula.createdBy === session.user.id ||
                      session.user.role === Role.ADMIN ||
                      comment.userId === session.user.id

    if (!canResolve) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      )
    }

    // Check if comment type supports resolution
    if (!["suggestion", "question"].includes(comment.type)) {
      return NextResponse.json(
        { error: "Only suggestions and questions can be resolved" },
        { status: 400 }
      )
    }

    // Update the comment
    const updatedComment = await prisma.formulaComment.update({
      where: { id: commentId },
      data: {
        isResolved: !comment.isResolved,
        resolvedBy: !comment.isResolved ? session.user.id : null,
        resolvedAt: !comment.isResolved ? new Date() : null
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
        },
        resolver: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Audit the resolution action
    await auditPHIAccess(
      "update",
      "FormulaComment",
      formulaId,
      session.user.id,
      session.user.role,
      ["comment_data"],
      AuditOutcome.SUCCESS,
      `${updatedComment.isResolved ? "Resolved" : "Unreolved"} ${comment.type} comment`
    )

    return NextResponse.json({
      success: true,
      comment: updatedComment,
      message: `Comment ${updatedComment.isResolved ? "resolved" : "reopened"} successfully`
    })
  } catch (error) {
    console.error("Error resolving comment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}