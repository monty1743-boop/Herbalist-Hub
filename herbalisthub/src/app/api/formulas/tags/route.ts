import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { Role } from "@prisma/client"

// GET - Get popular formula tags
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can access formula tags
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search")

    // Build where clause for tag search
    const where: any = {}
    
    if (search) {
      where.tag = {
        contains: search,
        mode: "insensitive"
      }
    }

    // Get tags with their usage count
    const tags = await prisma.formulaTag.groupBy({
      by: ["tag"],
      where,
      _count: {
        formulaId: true
      },
      orderBy: {
        _count: {
          formulaId: "desc"
        }
      },
      take: limit
    })

    // Transform to simple array of tag names with counts
    const tagsWithCounts = tags.map(tag => ({
      name: tag.tag,
      count: tag._count.formulaId
    }))

    // Also get just the tag names for simple usage
    const tagNames = tags.map(tag => tag.tag)

    return NextResponse.json({
      success: true,
      tags: tagNames,
      tagsWithCounts,
      total: tags.length
    })
  } catch (error) {
    console.error("Error fetching formula tags:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Add new tag to a formula
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can manage formula tags
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { formulaId, tag } = body

    if (!formulaId || !tag) {
      return NextResponse.json(
        { error: "Formula ID and tag are required" },
        { status: 400 }
      )
    }

    // Verify formula exists and user has access
    const formula = await prisma.formula.findFirst({
      where: {
        id: formulaId,
        OR: [
          { createdBy: session.user.id },
          { isPublic: true, isDraft: false }
        ]
      }
    })

    if (!formula) {
      return NextResponse.json(
        { error: "Formula not found or access denied" },
        { status: 404 }
      )
    }

    // Check if tag already exists for this formula
    const existingTag = await prisma.formulaTag.findUnique({
      where: {
        formulaId_tag: {
          formulaId,
          tag: tag.toLowerCase().trim()
        }
      }
    })

    if (existingTag) {
      return NextResponse.json(
        { error: "Tag already exists for this formula" },
        { status: 400 }
      )
    }

    // Create the tag
    const newTag = await prisma.formulaTag.create({
      data: {
        formulaId,
        tag: tag.toLowerCase().trim(),
        createdBy: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      tag: newTag,
      message: "Tag added successfully"
    })
  } catch (error) {
    console.error("Error creating formula tag:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}