import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { Role } from "@prisma/client"
import { auditPHIAccess } from "@/lib/encryption/phi-utils"
import { AuditOutcome } from "@/lib/audit/logger"
import { generateId } from "@/lib/utils"
import { z } from "zod"

const shareSchema = z.object({
  shareType: z.enum(["user", "public", "practice", "link"]),
  email: z.string().email().optional(),
  userId: z.string().optional(),
  accessLevel: z.enum(["read", "comment", "edit", "admin"]).default("read"),
  expiresIn: z.string().optional(),
  requiresAuth: z.boolean().default(true),
  message: z.string().optional(),
  shareNotes: z.string().optional()
})

// GET - Get formula shares
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
                  { shareType: "practice" }, // Practice members can see practice shares
                  { shareType: "public" }
                ]
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

    // Get shares for the formula
    const shares = await prisma.formulaShare.findMany({
      where: {
        formulaId,
        isActive: true
      },
      include: {
        sharedWithUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        sharedByUser: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // Filter shares based on user permissions
    const filteredShares = shares.filter(share => {
      // Formula owners can see all shares
      if (formula.createdBy === session.user.id) return true
      
      // Users can see shares they're involved in
      if (share.sharedWith === session.user.id || share.sharedBy === session.user.id) return true
      
      // Public shares are visible to all
      if (share.shareType === "public") return true
      
      // Practice shares are visible to practice members
      if (share.shareType === "practice") return true
      
      return false
    })

    // Audit the access
    await auditPHIAccess(
      "read",
      "FormulaShares",
      formulaId,
      session.user.id,
      session.user.role,
      ["sharing_data"],
      AuditOutcome.SUCCESS,
      "Retrieved formula sharing information"
    )

    return NextResponse.json({
      success: true,
      shares: filteredShares.map(share => ({
        id: share.id,
        shareType: share.shareType,
        accessLevel: share.accessLevel,
        shareToken: share.shareToken,
        expiresAt: share.expiresAt,
        isActive: share.isActive,
        shareNotes: share.shareNotes,
        createdAt: share.createdAt,
        sharedWith: share.sharedWithUser,
        sharedBy: share.sharedByUser
      }))
    })
  } catch (error) {
    console.error("Error fetching formula shares:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create new formula share
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can share formulas
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formulaId = params.id
    const body = await request.json()
    
    const validationResult = shareSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid share data",
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const shareData = validationResult.data

    // Verify user owns the formula or has admin permissions
    const formula = await prisma.formula.findFirst({
      where: {
        id: formulaId,
        OR: [
          { createdBy: session.user.id },
          ...(session.user.role === Role.ADMIN ? [{}] : [])
        ]
      }
    })

    if (!formula) {
      return NextResponse.json(
        { error: "Formula not found or access denied" },
        { status: 404 }
      )
    }

    let sharedWithUserId: string | undefined
    let expiresAt: Date | undefined

    // Handle user-specific sharing
    if (shareData.shareType === "user") {
      if (shareData.email) {
        const targetUser = await prisma.user.findUnique({
          where: { email: shareData.email }
        })
        
        if (!targetUser) {
          return NextResponse.json(
            { error: "User not found with that email address" },
            { status: 404 }
          )
        }
        
        sharedWithUserId = targetUser.id
      } else if (shareData.userId) {
        sharedWithUserId = shareData.userId
      } else {
        return NextResponse.json(
          { error: "Email or user ID required for user sharing" },
          { status: 400 }
        )
      }

      // Check if share already exists for this user
      const existingShare = await prisma.formulaShare.findFirst({
        where: {
          formulaId,
          sharedWith: sharedWithUserId,
          isActive: true
        }
      })

      if (existingShare) {
        return NextResponse.json(
          { error: "Formula is already shared with this user" },
          { status: 400 }
        )
      }
    }

    // Handle expiration
    if (shareData.expiresIn && shareData.expiresIn !== "never") {
      const duration = shareData.expiresIn
      const now = new Date()
      
      if (duration.endsWith("d")) {
        const days = parseInt(duration.slice(0, -1))
        expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
      } else if (duration.endsWith("h")) {
        const hours = parseInt(duration.slice(0, -1))
        expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000)
      }
    }

    // Generate share token for link shares
    let shareToken: string | undefined
    if (shareData.shareType === "link") {
      shareToken = generateId("share")
    }

    // Create the share
    const share = await prisma.formulaShare.create({
      data: {
        formulaId,
        sharedBy: session.user.id,
        sharedWith: sharedWithUserId,
        shareType: shareData.shareType,
        accessLevel: shareData.accessLevel,
        shareToken,
        expiresAt,
        requiresAuth: shareData.requiresAuth,
        shareNotes: shareData.shareNotes || shareData.message,
        permissions: {
          canView: true,
          canEdit: ["edit", "admin"].includes(shareData.accessLevel),
          canComment: ["comment", "edit", "admin"].includes(shareData.accessLevel),
          canShare: shareData.accessLevel === "admin"
        }
      },
      include: {
        sharedWithUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    // Send email notification for user shares
    if (shareData.shareType === "user" && sharedWithUserId) {
      // TODO: Implement email notification service
      console.log(`Would send email notification to ${shareData.email} about formula share`)
    }

    // Audit the sharing action
    await auditPHIAccess(
      "create",
      "FormulaShare",
      formulaId,
      session.user.id,
      session.user.role,
      ["sharing_data"],
      AuditOutcome.SUCCESS,
      `Created ${shareData.shareType} share with ${shareData.accessLevel} access`
    )

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        shareType: share.shareType,
        accessLevel: share.accessLevel,
        shareToken: share.shareToken,
        expiresAt: share.expiresAt,
        sharedWith: share.sharedWithUser
      },
      message: "Share created successfully"
    })
  } catch (error) {
    console.error("Error creating formula share:", error)
    
    // Audit the failed attempt
    const session = await getServerSession(authOptions)
    if (session?.user) {
      await auditPHIAccess(
        "create",
        "FormulaShare",
        params.id,
        session.user.id,
        session.user.role,
        ["sharing_data"],
        AuditOutcome.FAILURE,
        `Failed to create formula share: ${error}`
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}