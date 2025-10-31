import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { Role } from "@prisma/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"

// PATCH - Update comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: formulaId, commentId } = params
    const { content } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      )
    }

    // Get the comment and verify ownership
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

    // Check permissions - user can edit their own comments or admins/formula owners can moderate
    const canEdit = comment.userId === session.user.id ||
                   session.user.role === Role.ADMIN ||
                   comment.formula.createdBy === session.user.id

    if (!canEdit) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      )
    }

    // Update the comment
    const updatedComment = await prisma.formulaComment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
        isEdited: true
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

    // Audit the update
    await auditPHIAccess(
      "update",
      "FormulaComment",
      formulaId,
      session.user.id,
      session.user.role,
      ["comment_data"],
      AuditOutcome.SUCCESS,
      "Updated formula comment"
    )

    return NextResponse.json({
      success: true,
      comment: updatedComment,
      message: "Comment updated successfully"
    })
  } catch (error) {
    console.error("Error updating comment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Delete comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: formulaId, commentId } = params

    // Get the comment and verify ownership
    const comment = await prisma.formulaComment.findUnique({
      where: { id: commentId },
      include: {
        formula: {
          select: {
            id: true,
            createdBy: true
          }
        },
        replies: true
      }
    })

    if (!comment || comment.formulaId !== formulaId) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      )
    }

    // Check permissions
    const canDelete = comment.userId === session.user.id ||
                     session.user.role === Role.ADMIN ||
                     comment.formula.createdBy === session.user.id

    if (!canDelete) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      )
    }

    // Delete the comment and all its replies
    await prisma.formulaComment.deleteMany({
      where: {
        OR: [
          { id: commentId },
          { parentId: commentId }
        ]
      }
    })

    // Audit the deletion
    await auditPHIAccess(
      "delete",
      "FormulaComment",
      formulaId,
      session.user.id,
      session.user.role,
      ["comment_data"],
      AuditOutcome.SUCCESS,
      `Deleted comment and ${comment.replies.length} replies`
    )

    return NextResponse.json({
      success: true,
      message: "Comment deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting comment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}