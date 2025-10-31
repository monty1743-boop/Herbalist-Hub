import { NextRequest } from "next/server"
import { createHealthCheck } from "@/lib/api/middleware"
import { checkDatabaseConnection } from "@/lib/db/client"
import { encryptionConfig } from "@/lib/encryption/config"

// Health check dependencies
const healthDependencies = {
  database: checkDatabaseConnection,
  encryption: async () => {
    try {
      const validation = encryptionConfig.validateConfiguration()
      return validation.isValid
    } catch {
      return false
    }
  },
  environment: async () => {
    return !!(process.env.DATABASE_URL && process.env.NEXTAUTH_SECRET)
  },
}

export const GET = createHealthCheck(healthDependencies)