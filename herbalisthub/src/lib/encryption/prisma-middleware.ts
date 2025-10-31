import { Prisma } from "@prisma/client"
import { PHIEncryption, EncryptedData } from "./crypto"
import { auditLogger, AuditEventType, AuditOutcome, DataSensitivity } from "@/lib/audit/logger"

// Define which fields need encryption for each model
export const ENCRYPTION_CONFIG = {
  ClientProfile: {
    // Health information fields that contain PHI
    allergies: true,
    medications: true,
    conditions: true,
    healthGoals: true,
    emergencyContact: true,
  },
  ConsultationNote: {
    // All consultation notes contain PHI
    chiefComplaint: true,
    assessment: true,
    recommendations: true,
    followUp: true,
    privateNotes: true,
  },
  IntakeSubmission: {
    // Form responses may contain PHI
    responses: true,
  },
  Message: {
    // Message content may contain PHI
    content: true,
  },
  // Add other models as needed
} as const

type EncryptableModel = keyof typeof ENCRYPTION_CONFIG
type EncryptableField<T extends EncryptableModel> = keyof typeof ENCRYPTION_CONFIG[T]

/**
 * Prisma middleware for automatic PHI encryption/decryption
 */
export function createEncryptionMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const { model, action } = params

    // Only process models that have encryption configuration
    if (!model || !(model in ENCRYPTION_CONFIG)) {
      return next(params)
    }

    const modelName = model as EncryptableModel
    const encryptionFields = ENCRYPTION_CONFIG[modelName]

    try {
      // Handle different Prisma operations
      switch (action) {
        case "create":
        case "createMany":
          params.args.data = await encryptModelData(modelName, params.args.data, encryptionFields)
          break

        case "update":
        case "updateMany":
          if (params.args.data) {
            params.args.data = await encryptModelData(modelName, params.args.data, encryptionFields)
          }
          break

        case "upsert":
          if (params.args.create) {
            params.args.create = await encryptModelData(modelName, params.args.create, encryptionFields)
          }
          if (params.args.update) {
            params.args.update = await encryptModelData(modelName, params.args.update, encryptionFields)
          }
          break
      }

      // Execute the query
      const result = await next(params)

      // Decrypt the result for read operations
      switch (action) {
        case "findFirst":
        case "findUnique":
          return result ? decryptModelData(modelName, result, encryptionFields) : result

        case "findMany":
          return Array.isArray(result) 
            ? result.map(item => decryptModelData(modelName, item, encryptionFields))
            : result

        case "create":
        case "update":
        case "upsert":
          return result ? decryptModelData(modelName, result, encryptionFields) : result

        default:
          return result
      }
    } catch (error) {
      // Log encryption/decryption errors for audit
      await auditLogger.log({
        eventType: AuditEventType.PHI_READ,
        outcome: AuditOutcome.FAILURE,
        timestamp: new Date(),
        resourceType: modelName,
        dataSensitivity: DataSensitivity.PHI,
        details: {
          action,
          error: error instanceof Error ? error.message : "Unknown encryption error",
        },
      })

      // Re-throw the error
      throw error
    }
  }
}

/**
 * Encrypt specified fields in model data
 */
async function encryptModelData<T extends EncryptableModel>(
  modelName: T,
  data: any,
  encryptionFields: Record<string, boolean>
): Promise<any> {
  if (!data || typeof data !== "object") {
    return data
  }

  const encryptedData = { ...data }

  for (const [fieldName, shouldEncrypt] of Object.entries(encryptionFields)) {
    if (shouldEncrypt && fieldName in encryptedData) {
      const fieldValue = encryptedData[fieldName]

      if (fieldValue !== null && fieldValue !== undefined) {
        try {
          // Handle different data types
          if (typeof fieldValue === "string") {
            encryptedData[fieldName] = PHIEncryption.encrypt(fieldValue)
          } else if (typeof fieldValue === "object" && !PHIEncryption.isEncrypted(fieldValue)) {
            // For JSON fields, stringify then encrypt
            encryptedData[fieldName] = PHIEncryption.encrypt(JSON.stringify(fieldValue))
          }
          
          // Log PHI encryption event
          await auditLogger.log({
            eventType: AuditEventType.PHI_CREATE,
            outcome: AuditOutcome.SUCCESS,
            timestamp: new Date(),
            resourceType: modelName,
            dataSensitivity: DataSensitivity.PHI,
            details: {
              field: fieldName,
              action: "encrypt",
            },
          })
        } catch (error) {
          console.error(`Failed to encrypt ${fieldName} in ${modelName}:`, error)
          // Log encryption failure
          await auditLogger.log({
            eventType: AuditEventType.PHI_CREATE,
            outcome: AuditOutcome.FAILURE,
            timestamp: new Date(),
            resourceType: modelName,
            dataSensitivity: DataSensitivity.PHI,
            details: {
              field: fieldName,
              action: "encrypt",
              error: error instanceof Error ? error.message : "Unknown error",
            },
          })
          throw error
        }
      }
    }
  }

  return encryptedData
}

/**
 * Decrypt specified fields in model data
 */
function decryptModelData<T extends EncryptableModel>(
  modelName: T,
  data: any,
  encryptionFields: Record<string, boolean>
): any {
  if (!data || typeof data !== "object") {
    return data
  }

  const decryptedData = { ...data }

  for (const [fieldName, shouldDecrypt] of Object.entries(encryptionFields)) {
    if (shouldDecrypt && fieldName in decryptedData) {
      const fieldValue = decryptedData[fieldName]

      if (fieldValue !== null && fieldValue !== undefined && PHIEncryption.isEncrypted(fieldValue)) {
        try {
          const decrypted = PHIEncryption.decrypt(fieldValue)
          
          // Try to parse as JSON for object fields
          try {
            decryptedData[fieldName] = JSON.parse(decrypted)
          } catch {
            // If JSON parsing fails, keep as string
            decryptedData[fieldName] = decrypted
          }
        } catch (error) {
          console.error(`Failed to decrypt ${fieldName} in ${modelName}:`, error)
          // Leave field encrypted if decryption fails
          // This prevents data loss but alerts us to potential issues
        }
      }
    }
  }

  return decryptedData
}

/**
 * Manually encrypt data for a specific model and field
 */
export async function encryptFieldValue<T extends EncryptableModel>(
  modelName: T,
  fieldName: EncryptableField<T>,
  value: any
): Promise<EncryptedData | any> {
  const encryptionFields = ENCRYPTION_CONFIG[modelName]
  
  if (!encryptionFields[fieldName]) {
    return value // Field doesn't require encryption
  }

  if (value === null || value === undefined) {
    return value
  }

  try {
    if (typeof value === "string") {
      return PHIEncryption.encrypt(value)
    } else if (typeof value === "object") {
      return PHIEncryption.encrypt(JSON.stringify(value))
    }
    
    return value
  } catch (error) {
    console.error(`Failed to encrypt ${String(fieldName)} in ${modelName}:`, error)
    throw error
  }
}

/**
 * Manually decrypt data for a specific model and field
 */
export function decryptFieldValue<T extends EncryptableModel>(
  modelName: T,
  fieldName: EncryptableField<T>,
  value: any
): any {
  const encryptionFields = ENCRYPTION_CONFIG[modelName]
  
  if (!encryptionFields[fieldName]) {
    return value // Field doesn't require decryption
  }

  if (value === null || value === undefined || !PHIEncryption.isEncrypted(value)) {
    return value
  }

  try {
    const decrypted = PHIEncryption.decrypt(value)
    
    // Try to parse as JSON
    try {
      return JSON.parse(decrypted)
    } catch {
      return decrypted
    }
  } catch (error) {
    console.error(`Failed to decrypt ${String(fieldName)} in ${modelName}:`, error)
    return value // Return encrypted value if decryption fails
  }
}

/**
 * Create search tokens for encrypted fields to enable searching
 */
export function createSearchTokens<T extends EncryptableModel>(
  modelName: T,
  data: Record<string, any>
): Record<string, string> {
  const encryptionFields = ENCRYPTION_CONFIG[modelName]
  const searchTokens: Record<string, string> = {}

  for (const [fieldName, isEncrypted] of Object.entries(encryptionFields)) {
    if (isEncrypted && fieldName in data && typeof data[fieldName] === "string") {
      // Create a search token for the field
      const tokenFieldName = `${fieldName}SearchToken`
      searchTokens[tokenFieldName] = PHIEncryption.generateSearchToken(data[fieldName])
    }
  }

  return searchTokens
}

/**
 * Utility to check if a field should be encrypted for a given model
 */
export function shouldEncryptField<T extends EncryptableModel>(
  modelName: T,
  fieldName: string
): boolean {
  const encryptionFields = ENCRYPTION_CONFIG[modelName]
  return fieldName in encryptionFields && encryptionFields[fieldName as keyof typeof encryptionFields]
}

/**
 * Get all encryptable fields for a model
 */
export function getEncryptableFields<T extends EncryptableModel>(
  modelName: T
): Array<EncryptableField<T>> {
  const encryptionFields = ENCRYPTION_CONFIG[modelName]
  return Object.keys(encryptionFields).filter(
    field => encryptionFields[field as keyof typeof encryptionFields]
  ) as Array<EncryptableField<T>>
}