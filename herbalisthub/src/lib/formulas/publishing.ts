import { prisma } from "@/lib/db/client"
import { FormulaVersionControl, ChangeType } from "@/lib/formulas/version-control"

export enum PublishingStatus {
  DRAFT = "DRAFT",
  PENDING_REVIEW = "PENDING_REVIEW", 
  APPROVED = "APPROVED",
  PUBLISHED = "PUBLISHED",
  REJECTED = "REJECTED",
  ARCHIVED = "ARCHIVED"
}

export enum VisibilityLevel {
  PRIVATE = "PRIVATE",           // Only creator can see
  PRACTICE = "PRACTICE",         // Practice members can see
  PUBLIC = "PUBLIC",             // Anyone can see
  MARKETPLACE = "MARKETPLACE"    // Available in marketplace
}

interface PublishingValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

interface PublishingWorkflowOptions {
  skipValidation?: boolean
  publishedBy?: string
  publishingNotes?: string
  visibility?: VisibilityLevel
  autoApprove?: boolean
}

export class FormulaPublishing {
  /**
   * Validate formula for publishing
   */
  static async validateForPublishing(formulaId: string): Promise<PublishingValidation> {
    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      include: {
        ingredients: {
          include: {
            herb: {
              select: {
                id: true,
                name: true,
                quantity: true,
                minimumStock: true,
                type: true,
              }
            }
          }
        }
      }
    })

    if (!formula) {
      return {
        isValid: false,
        errors: ["Formula not found"],
        warnings: []
      }
    }

    const errors: string[] = []
    const warnings: string[] = []

    // Required fields validation
    if (!formula.name?.trim()) {
      errors.push("Formula name is required")
    }

    if (!formula.description?.trim()) {
      errors.push("Formula description is required")
    }

    if (!formula.instructions?.trim()) {
      errors.push("Preparation instructions are required")
    }

    if (!formula.category?.trim()) {
      warnings.push("Formula category should be specified")
    }

    if (!formula.difficulty) {
      warnings.push("Difficulty level should be specified")
    }

    // Ingredients validation
    if (!formula.ingredients || formula.ingredients.length === 0) {
      errors.push("Formula must have at least one ingredient")
    } else {
      // Check ingredient availability
      let unavailableIngredients = 0
      let lowStockIngredients = 0
      
      formula.ingredients.forEach(ingredient => {
        const herbQuantity = ingredient.herb.quantity?.toNumber() || 0
        const minimumStock = ingredient.herb.minimumStock?.toNumber() || 0
        const requiredQuantity = ingredient.quantity?.toNumber() || 0

        if (herbQuantity <= 0) {
          unavailableIngredients++
          warnings.push(`${ingredient.herb.name} is out of stock`)
        } else if (herbQuantity <= minimumStock) {
          lowStockIngredients++
          warnings.push(`${ingredient.herb.name} is low in stock`)
        } else if (herbQuantity < requiredQuantity) {
          warnings.push(`${ingredient.herb.name} has insufficient quantity (available: ${herbQuantity}, needed: ${requiredQuantity})`)
        }
      })

      if (unavailableIngredients > 0) {
        warnings.push(`${unavailableIngredients} ingredient(s) are out of stock`)
      }

      if (lowStockIngredients > 0) {
        warnings.push(`${lowStockIngredients} ingredient(s) are low in stock`)
      }
    }

    // Dosage and safety validation
    if (!formula.dosage?.trim()) {
      warnings.push("Dosage information should be provided")
    }

    if (!formula.duration?.trim()) {
      warnings.push("Treatment duration should be specified")
    }

    if (!formula.contraindications?.trim()) {
      warnings.push("Contraindications should be documented")
    }

    if (!formula.interactions?.trim()) {
      warnings.push("Potential interactions should be documented")
    }

    // Yield validation
    if (!formula.yieldAmount || formula.yieldAmount.toNumber() <= 0) {
      warnings.push("Expected yield amount should be specified")
    }

    if (!formula.yieldUnit?.trim()) {
      warnings.push("Yield unit should be specified")
    }

    // Cost validation
    if (!formula.finalPrice || formula.finalPrice.toNumber() <= 0) {
      warnings.push("Final price should be calculated")
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Publish a formula
   */
  static async publishFormula(
    formulaId: string,
    userId: string,
    options: PublishingWorkflowOptions = {}
  ): Promise<{ success: boolean; message: string; warnings?: string[] }> {
    const { 
      skipValidation = false, 
      publishingNotes = "",
      visibility = VisibilityLevel.PUBLIC,
      autoApprove = false
    } = options

    // Validate formula before publishing
    if (!skipValidation) {
      const validation = await this.validateForPublishing(formulaId)
      
      if (!validation.isValid) {
        return {
          success: false,
          message: `Cannot publish formula: ${validation.errors.join(", ")}`,
          warnings: validation.warnings
        }
      }
    }

    // Get current formula
    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      include: {
        ingredients: {
          include: {
            herb: { select: { name: true } }
          }
        }
      }
    })

    if (!formula) {
      return {
        success: false,
        message: "Formula not found"
      }
    }

    // Check if already published
    if (formula.isPublic && !formula.isDraft) {
      return {
        success: false,
        message: "Formula is already published"
      }
    }

    // Update formula status
    const updatedFormula = await prisma.formula.update({
      where: { id: formulaId },
      data: {
        isPublic: visibility === VisibilityLevel.PUBLIC || visibility === VisibilityLevel.MARKETPLACE,
        isDraft: false,
        publishedAt: new Date(),
      }
    })

    // Track the publishing in version control
    await FormulaVersionControl.trackUpdate(
      formulaId,
      formula,
      { ...formula, isPublic: true, isDraft: false, publishedAt: new Date() },
      userId,
      publishingNotes || `Published formula with ${visibility.toLowerCase()} visibility`
    )

    const validation = await this.validateForPublishing(formulaId)
    
    return {
      success: true,
      message: `Formula "${formula.name}" published successfully`,
      warnings: validation.warnings
    }
  }

  /**
   * Unpublish a formula (make it private)
   */
  static async unpublishFormula(
    formulaId: string,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    // Get current formula
    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      include: {
        ingredients: {
          include: {
            herb: { select: { name: true } }
          }
        }
      }
    })

    if (!formula) {
      return {
        success: false,
        message: "Formula not found"
      }
    }

    // Check if already unpublished
    if (!formula.isPublic || formula.isDraft) {
      return {
        success: false,
        message: "Formula is already private"
      }
    }

    // Update formula status
    await prisma.formula.update({
      where: { id: formulaId },
      data: {
        isPublic: false,
        isDraft: true,
        publishedAt: null,
      }
    })

    // Track the unpublishing in version control
    await FormulaVersionControl.trackUpdate(
      formulaId,
      formula,
      { ...formula, isPublic: false, isDraft: true, publishedAt: null },
      userId,
      reason || "Formula unpublished and made private"
    )

    return {
      success: true,
      message: `Formula "${formula.name}" unpublished and made private`
    }
  }

  /**
   * Change formula visibility
   */
  static async changeVisibility(
    formulaId: string,
    visibility: VisibilityLevel,
    userId: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      include: {
        ingredients: {
          include: {
            herb: { select: { name: true } }
          }
        }
      }
    })

    if (!formula) {
      return {
        success: false,
        message: "Formula not found"
      }
    }

    const isPublic = visibility === VisibilityLevel.PUBLIC || visibility === VisibilityLevel.MARKETPLACE
    const isDraft = visibility === VisibilityLevel.PRIVATE

    // Update formula visibility
    await prisma.formula.update({
      where: { id: formulaId },
      data: {
        isPublic,
        isDraft,
        publishedAt: isPublic && !isDraft ? new Date() : null,
      }
    })

    // Track the visibility change
    await FormulaVersionControl.trackUpdate(
      formulaId,
      formula,
      { ...formula, isPublic, isDraft },
      userId,
      notes || `Changed visibility to ${visibility.toLowerCase()}`
    )

    return {
      success: true,
      message: `Formula visibility changed to ${visibility.toLowerCase()}`
    }
  }

  /**
   * Get publishing status and validation
   */
  static async getPublishingStatus(formulaId: string) {
    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      select: {
        id: true,
        name: true,
        isPublic: true,
        isDraft: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!formula) {
      return null
    }

    const validation = await this.validateForPublishing(formulaId)
    
    let status: PublishingStatus
    let visibility: VisibilityLevel

    if (formula.isDraft) {
      status = PublishingStatus.DRAFT
      visibility = VisibilityLevel.PRIVATE
    } else if (formula.isPublic) {
      status = PublishingStatus.PUBLISHED
      visibility = VisibilityLevel.PUBLIC
    } else {
      status = PublishingStatus.APPROVED
      visibility = VisibilityLevel.PRACTICE
    }

    return {
      formula: {
        id: formula.id,
        name: formula.name,
        isPublic: formula.isPublic,
        isDraft: formula.isDraft,
        publishedAt: formula.publishedAt,
      },
      status,
      visibility,
      validation,
      canPublish: validation.isValid,
      publishingBlockers: validation.errors,
      publishingWarnings: validation.warnings,
    }
  }

  /**
   * Get published formulas (public library)
   */
  static async getPublishedFormulas(options: {
    page?: number
    limit?: number
    category?: string
    difficulty?: string
    search?: string
    sortBy?: string
    sortOrder?: "asc" | "desc"
  } = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      difficulty,
      search,
      sortBy = "publishedAt",
      sortOrder = "desc"
    } = options

    const where: any = {
      isPublic: true,
      isDraft: false,
    }

    if (category && category !== "all") {
      where.category = category
    }

    if (difficulty && difficulty !== "all") {
      where.difficulty = difficulty
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ]
    }

    const skip = (page - 1) * limit

    const [formulas, totalCount] = await Promise.all([
      prisma.formula.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          difficulty: true,
          yieldAmount: true,
          yieldUnit: true,
          finalPrice: true,
          publishedAt: true,
          version: true,
          creator: {
            select: {
              id: true,
              name: true,
            }
          },
          _count: {
            select: {
              ingredients: true,
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.formula.count({ where }),
    ])

    return {
      formulas,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      }
    }
  }
}