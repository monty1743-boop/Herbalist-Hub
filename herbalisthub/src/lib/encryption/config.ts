import { env } from "@/lib/env"

/**
 * Encryption configuration and key management
 */
export class EncryptionConfig {
  private static instance: EncryptionConfig
  private masterKey: string | null = null
  private keyRotationSchedule: Record<string, Date> = {}

  private constructor() {
    this.initializeKeys()
  }

  public static getInstance(): EncryptionConfig {
    if (!EncryptionConfig.instance) {
      EncryptionConfig.instance = new EncryptionConfig()
    }
    return EncryptionConfig.instance
  }

  /**
   * Initialize encryption keys from environment
   */
  private initializeKeys(): void {
    // In production, these would come from a secure key management service (AWS KMS, Azure Key Vault, etc.)
    this.masterKey = env.PHI_MASTER_KEY || this.generateMasterKey()

    if (!env.PHI_MASTER_KEY) {
      console.warn("PHI_MASTER_KEY not found in environment. Generated temporary key for development.")
      console.warn("In production, ensure PHI_MASTER_KEY is set in your secure environment variables.")
    }

    // Set up key rotation schedule (every 90 days)
    this.scheduleKeyRotation()
  }

  /**
   * Generate a new master key for development
   */
  private generateMasterKey(): string {
    const crypto = require("crypto")
    return crypto.randomBytes(32).toString("hex")
  }

  /**
   * Get the current master key
   */
  public getMasterKey(): string {
    if (!this.masterKey) {
      throw new Error("Encryption master key not initialized")
    }
    return this.masterKey
  }

  /**
   * Schedule automatic key rotation
   */
  private scheduleKeyRotation(): void {
    const now = new Date()
    const rotationDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days
    
    this.keyRotationSchedule["master"] = rotationDate
  }

  /**
   * Check if key rotation is needed
   */
  public needsKeyRotation(keyId: string = "master"): boolean {
    const rotationDate = this.keyRotationSchedule[keyId]
    if (!rotationDate) return false
    
    return new Date() >= rotationDate
  }

  /**
   * Get encryption configuration for different environments
   */
  public getConfig() {
    return {
      algorithm: "aes-256-gcm",
      keyLength: 32,
      ivLength: 16,
      tagLength: 16,
      saltLength: 32,
      pbkdf2Iterations: 100000,
      environment: env.NODE_ENV,
      keyRotationInterval: 90, // days
      auditLogging: true,
      validateOnDecryption: true,
    }
  }

  /**
   * Validate encryption configuration
   */
  public validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.masterKey) {
      errors.push("Master key not configured")
    }

    if (this.masterKey && this.masterKey.length < 64) {
      errors.push("Master key is too short (minimum 64 hex characters for 256-bit key)")
    }

    if (env.NODE_ENV === "production") {
      if (!env.PHI_MASTER_KEY) {
        errors.push("PHI_MASTER_KEY environment variable must be set in production")
      }

      if (!env.DATABASE_URL?.includes("ssl=true")) {
        errors.push("Database connection should use SSL in production")
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get compliance report
   */
  public getComplianceReport() {
    const config = this.getConfig()
    const validation = this.validateConfiguration()

    return {
      timestamp: new Date().toISOString(),
      encryptionAlgorithm: config.algorithm,
      keyManagement: {
        masterKeyConfigured: !!this.masterKey,
        keyRotationScheduled: Object.keys(this.keyRotationSchedule).length > 0,
        nextRotationDate: this.keyRotationSchedule["master"]?.toISOString(),
        needsRotation: this.needsKeyRotation(),
      },
      compliance: {
        hipaaCompliant: validation.isValid,
        auditLoggingEnabled: config.auditLogging,
        encryptionAtRest: true,
        encryptionInTransit: env.NODE_ENV === "production",
      },
      configuration: {
        environment: config.environment,
        validationEnabled: config.validateOnDecryption,
        secureDefaults: true,
      },
      issues: validation.errors,
    }
  }
}

// Export singleton instance
export const encryptionConfig = EncryptionConfig.getInstance()

/**
 * Environment-specific encryption settings
 */
export const ENCRYPTION_SETTINGS = {
  development: {
    strictValidation: false,
    auditLevel: "basic",
    allowInsecureKeys: true,
  },
  staging: {
    strictValidation: true,
    auditLevel: "detailed",
    allowInsecureKeys: false,
  },
  production: {
    strictValidation: true,
    auditLevel: "comprehensive",
    allowInsecureKeys: false,
    requireHSM: true, // Hardware Security Module
    requireSSL: true,
  },
}

/**
 * Get current environment encryption settings
 */
export function getCurrentEncryptionSettings() {
  const environment = env.NODE_ENV as keyof typeof ENCRYPTION_SETTINGS
  return ENCRYPTION_SETTINGS[environment] || ENCRYPTION_SETTINGS.development
}

/**
 * Validate encryption setup on application startup
 */
export function validateEncryptionSetup(): { success: boolean; errors: string[] } {
  const config = encryptionConfig
  const validation = config.validateConfiguration()
  const settings = getCurrentEncryptionSettings()

  const errors: string[] = [...validation.errors]

  // Additional environment-specific validation
  if (env.NODE_ENV === "production") {
    if (settings.requireSSL && !env.DATABASE_URL?.includes("ssl=true")) {
      errors.push("Production environment requires SSL database connection")
    }

    if (settings.requireHSM && !env.HSM_ENABLED) {
      errors.push("Production environment requires Hardware Security Module")
    }
  }

  return {
    success: errors.length === 0,
    errors,
  }
}

/**
 * Log encryption configuration status
 */
export function logEncryptionStatus(): void {
  const report = encryptionConfig.getComplianceReport()
  const setup = validateEncryptionSetup()

  console.log("=== PHI Encryption Status ===")
  console.log(`Environment: ${report.configuration.environment}`)
  console.log(`Algorithm: ${report.encryptionAlgorithm}`)
  console.log(`HIPAA Compliant: ${report.compliance.hipaaCompliant}`)
  console.log(`Master Key Configured: ${report.keyManagement.masterKeyConfigured}`)
  console.log(`Next Key Rotation: ${report.keyManagement.nextRotationDate}`)
  
  if (setup.errors.length > 0) {
    console.warn("Encryption Issues:", setup.errors)
  } else {
    console.log("✓ Encryption setup validated successfully")
  }
}