import { z } from "zod"
import { HerbType } from "@prisma/client"

// Herb inventory schemas
export const herbSchema = z.object({
  name: z.string().min(1, "Herb name is required"),
  latinName: z
    .string()
    .regex(/^[A-Z][a-z]+ [a-z]+$/, "Latin name must be in proper botanical format (e.g., 'Echinacea purpurea')")
    .optional()
    .or(z.literal("")),
  type: z.nativeEnum(HerbType),
  description: z.string().optional(),
  
  // Inventory tracking
  quantity: z.number().min(0, "Quantity cannot be negative"),
  unit: z.enum(["grams", "ounces", "pounds", "kg", "ml", "liters", "pieces", "bundles"]),
  minimumStock: z.number().min(0, "Minimum stock cannot be negative").optional(),
  costPerUnit: z.number().min(0, "Cost per unit cannot be negative").optional(),
  
  // Sourcing information
  supplier: z.string().optional(),
  supplierInfo: z
    .object({
      contactPerson: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
      certifications: z.array(z.string()).optional(),
    })
    .optional(),
  batchNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  
  // Quality and compliance
  harvestDate: z.string().datetime().optional(),
  expirationDate: z.string().datetime().optional(),
  qualityGrade: z.enum(["organic", "wildcrafted", "conventional", "pharmaceutical"]).optional(),
  certifications: z.array(z.string()).optional(),
  
  // Storage information
  storageLocation: z.string().optional(),
  storageConditions: z
    .object({
      temperature: z.string().optional(),
      humidity: z.string().optional(),
      lightConditions: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  
  notes: z.string().optional(),
  images: z.array(z.string().url()).optional(),
})

export const herbUpdateSchema = herbSchema.partial().extend({
  id: z.string(),
})

// Inventory adjustment schemas
export const inventoryAdjustmentSchema = z.object({
  herbId: z.string(),
  action: z.enum(["ADD", "REMOVE", "ADJUST", "EXPIRE"]),
  quantity: z.number().min(0.001, "Quantity must be greater than 0"),
  reason: z.string().min(1, "Reason for adjustment is required"),
})

// Inventory search and filter schemas
export const inventoryFilterSchema = z.object({
  search: z.string().optional(),
  type: z.nativeEnum(HerbType).optional(),
  supplier: z.string().optional(),
  lowStock: z.boolean().optional(),
  expiringSoon: z.boolean().optional(),
  qualityGrade: z.enum(["organic", "wildcrafted", "conventional", "pharmaceutical"]).optional(),
  sortBy: z.enum(["name", "quantity", "expirationDate", "costPerUnit", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
})

// Bulk operations
export const bulkInventoryUpdateSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      quantity: z.number().min(0),
      costPerUnit: z.number().min(0).optional(),
    })
  ),
  reason: z.string().min(1, "Reason for bulk update is required"),
})

// Supplier management
export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]{10,}$/, "Please enter a valid phone number")
    .optional(),
  address: z.string().optional(),
  website: z.string().url().optional(),
  certifications: z.array(z.string()).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})

// Inventory report schemas
export const inventoryReportSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  includeExpired: z.boolean().optional(),
  includeLowStock: z.boolean().optional(),
  groupBy: z.enum(["type", "supplier", "location"]).optional(),
})

// Type exports
export type HerbInput = z.infer<typeof herbSchema>
export type HerbUpdateInput = z.infer<typeof herbUpdateSchema>
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>
export type InventoryFilterInput = z.infer<typeof inventoryFilterSchema>
export type BulkInventoryUpdateInput = z.infer<typeof bulkInventoryUpdateSchema>
export type SupplierInput = z.infer<typeof supplierSchema>
export type InventoryReportInput = z.infer<typeof inventoryReportSchema>