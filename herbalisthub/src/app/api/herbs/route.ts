import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { Role } from "@prisma/client"

// GET - List herbs with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can access herbs
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const type = searchParams.get("type")
    const availability = searchParams.get("availability")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const sortBy = searchParams.get("sortBy") || "name"
    const sortOrder = searchParams.get("sortOrder") || "asc"

    // Build where clause
    const where: any = {}

    // Text search across name, latin name, and type
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { latinName: { contains: search, mode: "insensitive" } },
        { type: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    // Type filter
    if (type && type !== "all") {
      where.type = type
    }

    // Availability filter
    if (availability && availability !== "all") {
      switch (availability) {
        case "available":
          where.quantity = { gt: 0 }
          break
        case "low_stock":
          where.AND = [
            { quantity: { gt: 0 } },
            { quantity: { lte: prisma.herb.fields.minimumStock } }
          ]
          break
        case "out_of_stock":
          where.quantity = { lte: 0 }
          break
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get herbs
    const [herbs, totalCount] = await Promise.all([
      prisma.herb.findMany({
        where,
        select: {
          id: true,
          name: true,
          latinName: true,
          type: true,
          description: true,
          quantity: true,
          unit: true,
          minimumStock: true,
          costPerUnit: true,
          supplier: true,
          supplierInfo: true,
          batchNumber: true,
          lotNumber: true,
          harvestDate: true,
          expirationDate: true,
          qualityGrade: true,
          certifications: true,
          storageLocation: true,
          storageConditions: true,
          notes: true,
          images: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.herb.count({ where }),
    ])

    // Add calculated fields
    const herbsWithStatus = herbs.map(herb => {
      const quantity = herb.quantity?.toNumber() || 0
      const minimumStock = herb.minimumStock?.toNumber() || 0
      
      let availabilityStatus = "available"
      if (quantity <= 0) {
        availabilityStatus = "out_of_stock"
      } else if (quantity <= minimumStock) {
        availabilityStatus = "low_stock"
      }

      return {
        ...herb,
        availabilityStatus,
        daysUntilExpiration: herb.expirationDate 
          ? Math.ceil((new Date(herb.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      }
    })

    return NextResponse.json({
      herbs: herbsWithStatus,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
      summary: {
        totalHerbs: totalCount,
        availableHerbs: herbsWithStatus.filter(h => h.availabilityStatus === "available").length,
        lowStockHerbs: herbsWithStatus.filter(h => h.availabilityStatus === "low_stock").length,
        outOfStockHerbs: herbsWithStatus.filter(h => h.availabilityStatus === "out_of_stock").length,
      }
    })
  } catch (error) {
    console.error("Error fetching herbs:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}