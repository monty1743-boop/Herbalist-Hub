// Centralized validation exports for easy importing

// Authentication schemas
export * from "./auth"

// Inventory schemas
export * from "./inventory"

// Client management schemas
export * from "./client"

// Appointment schemas
export * from "./appointment"

// Formula schemas
export * from "./formula"

// Utility schemas and helpers
export * from "./utils"

// Re-export zod for convenience
export { z } from "zod"
export type { ZodError, ZodSchema } from "zod"