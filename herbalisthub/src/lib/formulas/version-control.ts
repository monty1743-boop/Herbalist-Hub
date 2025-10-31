import { prisma } from "@/lib/db/client"
import { type FormulaInput } from "@/lib/validation/formula"

export enum ChangeType {
  CREATED = "CREATED",
  UPDATED = "UPDATED", 
  INGREDIENT_ADDED = "INGREDIENT_ADDED",
  INGREDIENT_REMOVED = "INGREDIENT_REMOVED",
  INGREDIENT_MODIFIED = "INGREDIENT_MODIFIED",
  METADATA_UPDATED = "METADATA_UPDATED",
  PUBLISHED = "PUBLISHED",
  UNPUBLISHED = "UNPUBLISHED",
  SCALED = "SCALED",
  COPIED = "COPIED"
}

interface ChangeDetail {
  field: string
  oldValue: any
  newValue: any
  description?: string
}

interface IngredientChange {
  herbId: string
  herbName: string
  action: "added" | "removed" | "modified"
  oldQuantity?: number
  newQuantity?: number
  oldUnit?: string
  newUnit?: string
  oldNotes?: string
  newNotes?: string
}

interface VersionSnapshot {
  id: string
  name: string
  description?: string
  instructions?: string
  category?: string
  difficulty?: string
  preparationTime?: number
  yieldAmount?: number
  yieldUnit?: string
  isPublic: boolean
  isDraft: boolean
  version: number
  ingredients: Array<{
    herbId: string
    herbName: string
    quantity: number
    unit: string
    notes?: string
    processingNotes?: string
  }>
  createdAt: string
  updatedAt: string
}

export class FormulaVersionControl {
  /**
   * Create initial version when formula is first created
   */
  static async createInitialVersion(
    formulaId: string,
    formulaData: any,
    userId: string
  ): Promise<void> {
    const snapshot = await this.createSnapshot(formulaData)
    
    await prisma.formulaVersion.create({
      data: {
        formulaId,
        version: 1,
        changeType: ChangeType.CREATED,
        changeTitle: "Formula created",
        changeNotes: "Initial version of the formula",
        changes: {
          action: "created",
          snapshot: snapshot
        },
        formulaSnapshot: snapshot,
        createdBy: userId,
      }
    })
  }

  /**
   * Track changes when formula is updated
   */
  static async trackUpdate(
    formulaId: string,
    oldFormula: any,
    newFormula: any,
    userId: string,
    changeNotes?: string
  ): Promise<void> {
    const changes = await this.detectChanges(oldFormula, newFormula)
    
    if (changes.length === 0) {
      return // No changes to track
    }

    // Get current version number
    const latestVersion = await prisma.formulaVersion.findFirst({
      where: { formulaId },
      orderBy: { version: "desc" }
    })

    const newVersion = (latestVersion?.version || 0) + 1
    const snapshot = await this.createSnapshot(newFormula)
    
    // Determine primary change type
    const primaryChangeType = this.determinePrimaryChangeType(changes)
    const changeTitle = this.generateChangeTitle(changes)

    await prisma.formulaVersion.create({
      data: {
        formulaId,
        version: newVersion,
        changeType: primaryChangeType,
        changeTitle,
        changeNotes,
        changes: {
          modifications: changes,
          summary: {
            totalChanges: changes.length,
            fieldChanges: changes.filter(c => c.type === "field").length,
            ingredientChanges: changes.filter(c => c.type === "ingredient").length,
          }
        },
        formulaSnapshot: snapshot,
        createdBy: userId,
      }
    })

    // Update formula version number
    await prisma.formula.update({
      where: { id: formulaId },
      data: { version: newVersion }
    })
  }

  /**
   * Create a new version for scaling operations
   */
  static async trackScaling(
    originalFormulaId: string,
    scaledFormulaId: string,
    scaleFactor: number,
    userId: string,
    notes?: string
  ): Promise<void> {
    const scaledFormula = await prisma.formula.findUnique({
      where: { id: scaledFormulaId },
      include: {
        ingredients: {
          include: {
            herb: { select: { name: true } }
          }
        }
      }
    })

    if (!scaledFormula) return

    const snapshot = await this.createSnapshot(scaledFormula)

    await prisma.formulaVersion.create({
      data: {
        formulaId: scaledFormulaId,
        version: 1,
        changeType: ChangeType.SCALED,
        changeTitle: `Formula scaled by ${scaleFactor}x`,
        changeNotes: notes || `Scaled from original formula by factor of ${scaleFactor}`,
        changes: {
          action: "scaled",
          scaleFactor,
          originalFormulaId,
          timestamp: new Date().toISOString()
        },
        formulaSnapshot: snapshot,
        createdBy: userId,
      }
    })
  }

  /**
   * Get version history for a formula
   */
  static async getVersionHistory(formulaId: string, limit: number = 50) {
    return await prisma.formulaVersion.findMany({
      where: { formulaId },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { version: "desc" },
      take: limit
    })
  }

  /**
   * Get specific version details
   */
  static async getVersion(formulaId: string, version: number) {
    return await prisma.formulaVersion.findUnique({
      where: {
        formulaId_version: { formulaId, version }
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    })
  }

  /**
   * Compare two versions
   */
  static async compareVersions(
    formulaId: string,
    version1: number,
    version2: number
  ) {
    const [v1, v2] = await Promise.all([
      this.getVersion(formulaId, version1),
      this.getVersion(formulaId, version2)
    ])

    if (!v1 || !v2) {
      throw new Error("One or both versions not found")
    }

    const snapshot1 = v1.formulaSnapshot as VersionSnapshot
    const snapshot2 = v2.formulaSnapshot as VersionSnapshot

    return this.compareSnapshots(snapshot1, snapshot2)
  }

  /**
   * Restore formula to a specific version
   */
  static async restoreVersion(
    formulaId: string,
    targetVersion: number,
    userId: string,
    notes?: string
  ): Promise<void> {
    const versionData = await this.getVersion(formulaId, targetVersion)
    if (!versionData) {
      throw new Error("Version not found")
    }

    const snapshot = versionData.formulaSnapshot as VersionSnapshot
    
    // Get current formula for comparison
    const currentFormula = await prisma.formula.findUnique({
      where: { id: formulaId },
      include: {
        ingredients: {
          include: {
            herb: { select: { name: true } }
          }
        }
      }
    })

    // Update formula with snapshot data
    await prisma.$transaction(async (tx) => {
      // Update main formula
      await tx.formula.update({
        where: { id: formulaId },
        data: {
          name: snapshot.name,
          description: snapshot.description,
          instructions: snapshot.instructions,
          category: snapshot.category,
          difficulty: snapshot.difficulty,
          preparationTime: snapshot.preparationTime,
          yieldAmount: snapshot.yieldAmount,
          yieldUnit: snapshot.yieldUnit,
          isPublic: snapshot.isPublic,
          isDraft: snapshot.isDraft,
        }
      })

      // Replace ingredients
      await tx.formulaIngredient.deleteMany({
        where: { formulaId }
      })

      for (const ingredient of snapshot.ingredients) {
        await tx.formulaIngredient.create({
          data: {
            formulaId,
            herbId: ingredient.herbId,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            processingNotes: ingredient.processingNotes,
          }
        })
      }
    })

    // Track the restoration as a new version
    await this.trackUpdate(
      formulaId,
      currentFormula,
      snapshot,
      userId,
      notes || `Restored to version ${targetVersion}`
    )
  }

  /**
   * Private helper methods
   */
  private static async createSnapshot(formulaData: any): Promise<VersionSnapshot> {
    // If formulaData has ingredients populated, use them
    let ingredients = formulaData.ingredients || []
    
    // If ingredients are not populated, fetch them
    if (formulaData.id && (!ingredients || ingredients.length === 0)) {
      const formulaWithIngredients = await prisma.formula.findUnique({
        where: { id: formulaData.id },
        include: {
          ingredients: {
            include: {
              herb: { select: { name: true } }
            }
          }
        }
      })
      ingredients = formulaWithIngredients?.ingredients || []
    }

    return {
      id: formulaData.id,
      name: formulaData.name,
      description: formulaData.description,
      instructions: formulaData.instructions,
      category: formulaData.category,
      difficulty: formulaData.difficulty,
      preparationTime: formulaData.preparationTime,
      yieldAmount: formulaData.yieldAmount?.toNumber?.() || formulaData.yieldAmount,
      yieldUnit: formulaData.yieldUnit,
      isPublic: formulaData.isPublic,
      isDraft: formulaData.isDraft,
      version: formulaData.version,
      ingredients: ingredients.map((ing: any) => ({
        herbId: ing.herbId,
        herbName: ing.herb?.name || "Unknown",
        quantity: ing.quantity?.toNumber?.() || ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
        processingNotes: ing.processingNotes,
      })),
      createdAt: formulaData.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: formulaData.updatedAt?.toISOString() || new Date().toISOString(),
    }
  }

  private static async detectChanges(oldFormula: any, newFormula: any) {
    const changes: Array<{
      type: "field" | "ingredient"
      field: string
      action: string
      oldValue?: any
      newValue?: any
      details?: any
    }> = []

    // Check field changes
    const fieldsToCheck = [
      "name", "description", "instructions", "category", 
      "difficulty", "preparationTime", "yieldAmount", "yieldUnit",
      "isPublic", "isDraft"
    ]

    for (const field of fieldsToCheck) {
      const oldValue = oldFormula[field]
      const newValue = newFormula[field]
      
      if (oldValue !== newValue) {
        changes.push({
          type: "field",
          field,
          action: "modified",
          oldValue,
          newValue
        })
      }
    }

    // Check ingredient changes
    const oldIngredients = oldFormula.ingredients || []
    const newIngredients = newFormula.ingredients || []
    
    const oldIngredientMap = new Map(oldIngredients.map((ing: any) => [ing.herbId, ing]))
    const newIngredientMap = new Map(newIngredients.map((ing: any) => [ing.herbId, ing]))

    // Find removed ingredients
    for (const [herbId, oldIng] of oldIngredientMap) {
      if (!newIngredientMap.has(herbId)) {
        changes.push({
          type: "ingredient",
          field: "ingredients",
          action: "removed",
          details: {
            herbId,
            herbName: oldIng.herb?.name || "Unknown",
            quantity: oldIng.quantity,
            unit: oldIng.unit
          }
        })
      }
    }

    // Find added and modified ingredients
    for (const [herbId, newIng] of newIngredientMap) {
      const oldIng = oldIngredientMap.get(herbId)
      
      if (!oldIng) {
        // Added ingredient
        changes.push({
          type: "ingredient",
          field: "ingredients",
          action: "added",
          details: {
            herbId,
            herbName: newIng.herb?.name || "Unknown",
            quantity: newIng.quantity,
            unit: newIng.unit
          }
        })
      } else {
        // Check for modifications
        const ingredientChanges = []
        
        if (oldIng.quantity !== newIng.quantity) {
          ingredientChanges.push(`quantity: ${oldIng.quantity} → ${newIng.quantity}`)
        }
        if (oldIng.unit !== newIng.unit) {
          ingredientChanges.push(`unit: ${oldIng.unit} → ${newIng.unit}`)
        }
        if (oldIng.processingNotes !== newIng.processingNotes) {
          ingredientChanges.push(`notes: "${oldIng.processingNotes || ''}" → "${newIng.processingNotes || ''}"`)
        }

        if (ingredientChanges.length > 0) {
          changes.push({
            type: "ingredient",
            field: "ingredients",
            action: "modified",
            details: {
              herbId,
              herbName: newIng.herb?.name || "Unknown",
              changes: ingredientChanges
            }
          })
        }
      }
    }

    return changes
  }

  private static determinePrimaryChangeType(changes: any[]): ChangeType {
    const ingredientChanges = changes.filter(c => c.type === "ingredient")
    const fieldChanges = changes.filter(c => c.type === "field")

    if (ingredientChanges.length > fieldChanges.length) {
      const actions = ingredientChanges.map(c => c.action)
      if (actions.includes("added")) return ChangeType.INGREDIENT_ADDED
      if (actions.includes("removed")) return ChangeType.INGREDIENT_REMOVED
      if (actions.includes("modified")) return ChangeType.INGREDIENT_MODIFIED
    }

    return ChangeType.UPDATED
  }

  private static generateChangeTitle(changes: any[]): string {
    const ingredientChanges = changes.filter(c => c.type === "ingredient")
    const fieldChanges = changes.filter(c => c.type === "field")

    if (ingredientChanges.length > 0 && fieldChanges.length > 0) {
      return `Updated formula and ${ingredientChanges.length} ingredient(s)`
    } else if (ingredientChanges.length > 0) {
      const actions = ingredientChanges.map(c => c.action)
      const uniqueActions = [...new Set(actions)]
      return `${uniqueActions.join(", ")} ingredient(s)`
    } else if (fieldChanges.length > 0) {
      const fields = fieldChanges.map(c => c.field)
      return `Updated ${fields.slice(0, 3).join(", ")}${fields.length > 3 ? ` and ${fields.length - 3} more` : ""}`
    }

    return "Formula updated"
  }

  private static compareSnapshots(snapshot1: VersionSnapshot, snapshot2: VersionSnapshot) {
    const differences = {
      fields: [] as Array<{ field: string, old: any, new: any }>,
      ingredients: {
        added: [] as any[],
        removed: [] as any[],
        modified: [] as any[]
      }
    }

    // Compare fields
    const fieldsToCompare = [
      "name", "description", "instructions", "category", 
      "difficulty", "preparationTime", "yieldAmount", "yieldUnit",
      "isPublic", "isDraft"
    ]

    for (const field of fieldsToCompare) {
      const old = snapshot1[field as keyof VersionSnapshot]
      const new_ = snapshot2[field as keyof VersionSnapshot]
      
      if (old !== new_) {
        differences.fields.push({ field, old, new: new_ })
      }
    }

    // Compare ingredients
    const oldIngredients = new Map(snapshot1.ingredients.map(ing => [ing.herbId, ing]))
    const newIngredients = new Map(snapshot2.ingredients.map(ing => [ing.herbId, ing]))

    // Find added ingredients
    for (const [herbId, ingredient] of newIngredients) {
      if (!oldIngredients.has(herbId)) {
        differences.ingredients.added.push(ingredient)
      }
    }

    // Find removed ingredients
    for (const [herbId, ingredient] of oldIngredients) {
      if (!newIngredients.has(herbId)) {
        differences.ingredients.removed.push(ingredient)
      }
    }

    // Find modified ingredients
    for (const [herbId, newIng] of newIngredients) {
      const oldIng = oldIngredients.get(herbId)
      if (oldIng && (
        oldIng.quantity !== newIng.quantity ||
        oldIng.unit !== newIng.unit ||
        oldIng.processingNotes !== newIng.processingNotes
      )) {
        differences.ingredients.modified.push({
          herbId,
          herbName: newIng.herbName,
          changes: {
            quantity: oldIng.quantity !== newIng.quantity ? {
              old: oldIng.quantity,
              new: newIng.quantity
            } : undefined,
            unit: oldIng.unit !== newIng.unit ? {
              old: oldIng.unit,
              new: newIng.unit
            } : undefined,
            processingNotes: oldIng.processingNotes !== newIng.processingNotes ? {
              old: oldIng.processingNotes,
              new: newIng.processingNotes
            } : undefined,
          }
        })
      }
    }

    return differences
  }
}