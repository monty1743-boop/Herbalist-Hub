import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/client"
import { Role } from "@prisma/client"

// GET - Get a single herb by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only herbalists and admins can access herbs
    if (![Role.HERBALIST, Role.ADMIN].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const herbId = params.id

    // Get herb with full details
    const herb = await prisma.herb.findUnique({
      where: { id: herbId },
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
        
        // Related data
        preparations: {
          select: {
            id: true,
            name: true,
            method: true,
            instructions: true,
            yieldAmount: true,
            yieldUnit: true,
          }
        },
        
        formulaIngredients: {
          select: {
            id: true,
            quantity: true,
            unit: true,
            formula: {
              select: {
                id: true,
                name: true,
                isPublic: true,
                isDraft: true,
              }
            }
          },
          take: 10, // Latest 10 formulas using this herb
        },
        
        inventoryLogs: {
          select: {
            id: true,
            action: true,
            quantity: true,
            reason: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20, // Latest 20 inventory changes
        },
      }
    })

    if (!herb) {
      return NextResponse.json({ error: "Herb not found" }, { status: 404 })
    }

    // Calculate derived fields
    const quantity = herb.quantity?.toNumber() || 0
    const minimumStock = herb.minimumStock?.toNumber() || 0
    
    let availabilityStatus = "available"
    if (quantity <= 0) {
      availabilityStatus = "out_of_stock"
    } else if (quantity <= minimumStock) {
      availabilityStatus = "low_stock"
    }

    const daysUntilExpiration = herb.expirationDate 
      ? Math.ceil((new Date(herb.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    const enrichedHerb = {
      ...herb,
      availabilityStatus,
      daysUntilExpiration,
      isExpiringSoon: daysUntilExpiration !== null && daysUntilExpiration <= 30,
      metrics: {
        totalFormulas: herb.formulaIngredients.length,
        totalPreparations: herb.preparations.length,
        totalInventoryLogs: herb.inventoryLogs.length,
        lastUpdated: herb.updatedAt,
      }
    }

    return NextResponse.json({
      success: true,
      herb: enrichedHerb,
    })
  } catch (error) {
    console.error("Error fetching herb:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}