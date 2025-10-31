import { z } from "zod"

// Formula creation and management schemas
export const formulaIngredientSchema = z.object({
  herbId: z.string(),
  quantity: z.number().min(0.001, "Quantity must be greater than 0"),
  unit: z.enum(["grams", "ounces", "ml", "drops", "parts", "percentage"]),
  ratio: z.string().optional(), // e.g., "1:5", "20%"
  processingNotes: z.string().optional(), // e.g., "finely ground", "fresh only"
})

export const formulaSchema = z.object({
  name: z.string().min(1, "Formula name is required"),
  description: z.string().optional(),
  instructions: z.string().min(1, "Preparation instructions are required"),
  
  // Formula metadata
  category: z.string().optional(), // e.g., "Digestive", "Respiratory"
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  prepTime: z.number().min(1, "Preparation time must be at least 1 minute").optional(),
  yieldAmount: z.number().min(0.001, "Yield amount must be greater than 0").optional(),
  yieldUnit: z.enum(["ml", "grams", "ounces", "cups", "doses"]).optional(),
  
  // Dosage and usage
  dosage: z.string().optional(), // e.g., "1 tsp 3x daily"
  duration: z.string().optional(), // e.g., "2-4 weeks"
  contraindications: z.string().optional(),
  interactions: z.string().optional(), // Drug interactions
  
  // Business information
  laborCost: z.number().min(0, "Labor cost cannot be negative").optional(),
  markupPercent: z.number().min(0, "Markup percentage cannot be negative").optional(),
  
  // Publishing and visibility
  isPublic: z.boolean().default(false),
  isDraft: z.boolean().default(true),
  
  // Ingredients
  ingredients: z
    .array(formulaIngredientSchema)
    .min(1, "Formula must have at least one ingredient"),
}).refine(
  (data) => {
    if (data.yieldAmount && !data.yieldUnit) {
      return false
    }
    if (!data.yieldAmount && data.yieldUnit) {
      return false
    }
    return true
  },
  {
    message: "Yield amount and unit must be provided together",
    path: ["yieldUnit"],
  }
)

export const formulaUpdateSchema = formulaSchema.partial().extend({
  id: z.string(),
  version: z.number().min(1).optional(),
  parentId: z.string().optional(),
})

// Formula scaling schemas
export const formulaScalingSchema = z.object({
  formulaId: z.string(),
  scaleFactor: z.number().min(0.1, "Scale factor must be at least 0.1").max(100, "Scale factor cannot exceed 100"),
  targetYield: z.number().min(0.001, "Target yield must be greater than 0").optional(),
  targetYieldUnit: z.enum(["ml", "grams", "ounces", "cups", "doses"]).optional(),
  roundingPrecision: z.enum(["0.001", "0.01", "0.1", "1"]).default("0.01"),
}).refine(
  (data) => {
    if (data.targetYield && !data.targetYieldUnit) {
      return false
    }
    if (!data.targetYield && data.targetYieldUnit) {
      return false
    }
    return true
  },
  {
    message: "Target yield and unit must be provided together",
    path: ["targetYieldUnit"],
  }
)

// Formula cost calculation schemas
export const formulaCostCalculationSchema = z.object({
  formulaId: z.string(),
  includeLabor: z.boolean().default(true),
  includeOverhead: z.boolean().default(true),
  overheadPercent: z.number().min(0).max(100).default(20),
  profitMargin: z.number().min(0).max(500).default(50), // 50% default margin
})

// Formula search and filter schemas
export const formulaFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  isPublic: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  hasIngredient: z.string().optional(), // Herb ID
  hasIngredients: z.array(z.string()).optional(), // Multiple herb IDs
  tags: z.array(z.string()).optional(), // Formula tags
  priceRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional()
  }).optional(),
  prepTimeRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional()
  }).optional(),
  yieldRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
    unit: z.string().optional()
  }).optional(),
  availabilityStatus: z.enum(["available", "partial", "unavailable"]).optional(),
  createdBy: z.string().optional(), // User ID
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  }).optional(),
  searchFields: z.array(z.enum(["name", "description", "instructions", "category", "tags", "ingredients"])).optional(),
  sortBy: z.enum(["name", "category", "difficulty", "createdAt", "updatedAt", "price", "prepTime", "popularity"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
})

// Formula publishing schemas
export const formulaPublishingSchema = z.object({
  id: z.string(),
  isPublic: z.boolean(),
  publishNotes: z.string().optional(),
  licenseType: z.enum(["cc_by", "cc_by_sa", "cc_by_nc", "proprietary"]).default("cc_by"),
  attributionRequired: z.boolean().default(true),
})

// Formula version control schemas
export const formulaVersionSchema = z.object({
  formulaId: z.string(),
  changes: z.string().min(1, "Description of changes is required"),
  versionNotes: z.string().optional(),
  createNewVersion: z.boolean().default(true),
})

// Formula collection/recipe book schemas
export const formulaCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required"),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  formulaIds: z.array(z.string()).min(1, "Collection must contain at least one formula"),
  tags: z.array(z.string()).optional(),
})

// Formula export schemas
export const formulaExportSchema = z.object({
  formulaIds: z.array(z.string()).min(1, "At least one formula must be selected"),
  format: z.enum(["pdf", "json", "csv", "docx"]).default("pdf"),
  includeImages: z.boolean().default(true),
  includeCostCalculation: z.boolean().default(false),
  includeInstructions: z.boolean().default(true),
  includeDosage: z.boolean().default(true),
  templateStyle: z.enum(["simple", "detailed", "professional"]).default("detailed"),
})

// Formula sharing schemas
export const formulaSharingSchema = z.object({
  formulaId: z.string(),
  shareWith: z.array(z.string()).optional(), // User IDs
  sharePublicly: z.boolean().default(false),
  allowModifications: z.boolean().default(false),
  expirationDate: z.string().datetime().optional(),
  shareNotes: z.string().optional(),
})

// Formula analysis schemas
export const formulaAnalysisSchema = z.object({
  formulaId: z.string(),
  analyzeInteractions: z.boolean().default(true),
  analyzeContraindications: z.boolean().default(true),
  analyzeCost: z.boolean().default(true),
  analyzeAvailability: z.boolean().default(true),
  suggestionLevel: z.enum(["basic", "detailed", "expert"]).default("detailed"),
})

// Preparation method schemas
export const preparationMethodSchema = z.object({
  formulaId: z.string().optional(),
  herbId: z.string().optional(),
  name: z.string().min(1, "Preparation method name is required"),
  method: z.enum(["decoction", "infusion", "tincture", "oil", "salve", "capsule", "powder", "syrup", "other"]),
  instructions: z.string().min(1, "Preparation instructions are required"),
  yieldAmount: z.number().min(0.001, "Yield amount must be greater than 0").optional(),
  yieldUnit: z.enum(["ml", "grams", "ounces", "cups", "doses"]).optional(),
  preparationTime: z.number().min(1, "Preparation time must be at least 1 minute").optional(),
  shelfLife: z.string().optional(), // e.g., "2 years", "6 months"
  storageInstructions: z.string().optional(),
})

// Type exports
export type FormulaIngredientInput = z.infer<typeof formulaIngredientSchema>
export type FormulaInput = z.infer<typeof formulaSchema>
export type FormulaUpdateInput = z.infer<typeof formulaUpdateSchema>
export type FormulaScalingInput = z.infer<typeof formulaScalingSchema>
export type FormulaCostCalculationInput = z.infer<typeof formulaCostCalculationSchema>
export type FormulaFilterInput = z.infer<typeof formulaFilterSchema>
export type FormulaPublishingInput = z.infer<typeof formulaPublishingSchema>
export type FormulaVersionInput = z.infer<typeof formulaVersionSchema>
export type FormulaCollectionInput = z.infer<typeof formulaCollectionSchema>
export type FormulaExportInput = z.infer<typeof formulaExportSchema>
export type FormulaSharingInput = z.infer<typeof formulaSharingSchema>
export type FormulaAnalysisInput = z.infer<typeof formulaAnalysisSchema>
export type PreparationMethodInput = z.infer<typeof preparationMethodSchema>