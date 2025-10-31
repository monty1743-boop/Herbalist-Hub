import crypto from "crypto"

// Encryption configuration
const ALGORITHM = "aes-256-gcm"
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32 // 256 bits

export interface EncryptedData {
  encryptedData: string // Base64 encoded
  iv: string // Base64 encoded
  tag: string // Base64 encoded
  salt?: string // Base64 encoded (for key derivation)
  keyId?: string // Reference to key management system
}

export interface EncryptionKey {
  id: string
  key: Buffer
  createdAt: Date
  isActive: boolean
}

export class PHIEncryption {
  private static masterKey: Buffer | null = null
  private static keyCache = new Map<string, EncryptionKey>()

  /**
   * Initialize the encryption system with a master key
   */
  static initialize(masterKey?: string) {
    if (masterKey) {
      this.masterKey = Buffer.from(masterKey, "hex")
    } else {
      // Generate master key from environment or create new one
      const envKey = process.env.PHI_MASTER_KEY
      if (envKey) {
        this.masterKey = Buffer.from(envKey, "hex")
      } else {
        // In production, this should come from a secure key management system
        console.warn("No PHI_MASTER_KEY found in environment. Generating temporary key.")
        this.masterKey = crypto.randomBytes(KEY_LENGTH)
      }
    }
  }

  /**
   * Derive encryption key from master key and salt
   */
  private static deriveKey(salt: Buffer): Buffer {
    if (!this.masterKey) {
      this.initialize()
    }
    
    return crypto.pbkdf2Sync(this.masterKey!, salt, 100000, KEY_LENGTH, "sha256")
  }

  /**
   * Generate a new encryption key
   */
  static generateKey(): EncryptionKey {
    return {
      id: crypto.randomUUID(),
      key: crypto.randomBytes(KEY_LENGTH),
      createdAt: new Date(),
      isActive: true,
    }
  }

  /**
   * Encrypt sensitive data (PHI)
   */
  static encrypt(plaintext: string, keyId?: string): EncryptedData {
    try {
      if (!plaintext) {
        throw new Error("Cannot encrypt empty data")
      }

      // Generate salt and derive key
      const salt = crypto.randomBytes(SALT_LENGTH)
      const key = this.deriveKey(salt)

      // Generate initialization vector
      const iv = crypto.randomBytes(IV_LENGTH)

      // Create cipher
      const cipher = crypto.createCipher(ALGORITHM, key)
      cipher.setAAD(Buffer.from("PHI_DATA")) // Additional authenticated data

      // Encrypt the data
      let encrypted = cipher.update(plaintext, "utf8")
      encrypted = Buffer.concat([encrypted, cipher.final()])

      // Get authentication tag
      const tag = cipher.getAuthTag()

      return {
        encryptedData: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
        salt: salt.toString("base64"),
        keyId: keyId || "default",
      }
    } catch (error) {
      console.error("Encryption error:", error)
      throw new Error("Failed to encrypt data")
    }
  }

  /**
   * Decrypt sensitive data (PHI)
   */
  static decrypt(encryptedData: EncryptedData): string {
    try {
      if (!encryptedData.encryptedData || !encryptedData.iv || !encryptedData.tag) {
        throw new Error("Invalid encrypted data format")
      }

      // Derive key from salt
      const salt = Buffer.from(encryptedData.salt || "", "base64")
      const key = this.deriveKey(salt)

      // Parse encrypted components
      const iv = Buffer.from(encryptedData.iv, "base64")
      const tag = Buffer.from(encryptedData.tag, "base64")
      const encrypted = Buffer.from(encryptedData.encryptedData, "base64")

      // Create decipher
      const decipher = crypto.createDecipher(ALGORITHM, key)
      decipher.setAuthTag(tag)
      decipher.setAAD(Buffer.from("PHI_DATA"))

      // Decrypt the data
      let decrypted = decipher.update(encrypted)
      decrypted = Buffer.concat([decrypted, decipher.final()])

      return decrypted.toString("utf8")
    } catch (error) {
      console.error("Decryption error:", error)
      throw new Error("Failed to decrypt data")
    }
  }

  /**
   * Encrypt multiple fields in an object
   */
  static encryptFields<T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt: (keyof T)[]
  ): T {
    const result = { ...data }

    for (const field of fieldsToEncrypt) {
      if (result[field] && typeof result[field] === "string") {
        result[field] = this.encrypt(result[field] as string) as T[keyof T]
      }
    }

    return result
  }

  /**
   * Decrypt multiple fields in an object
   */
  static decryptFields<T extends Record<string, any>>(
    data: T,
    fieldsToDecrypt: (keyof T)[]
  ): T {
    const result = { ...data }

    for (const field of fieldsToDecrypt) {
      if (result[field] && typeof result[field] === "object") {
        try {
          result[field] = this.decrypt(result[field] as EncryptedData) as T[keyof T]
        } catch (error) {
          console.error(`Failed to decrypt field ${String(field)}:`, error)
          // Leave field as encrypted if decryption fails
        }
      }
    }

    return result
  }

  /**
   * Check if data is encrypted
   */
  static isEncrypted(data: any): data is EncryptedData {
    return (
      typeof data === "object" &&
      data !== null &&
      typeof data.encryptedData === "string" &&
      typeof data.iv === "string" &&
      typeof data.tag === "string"
    )
  }

  /**
   * Securely hash sensitive data for indexing (one-way)
   */
  static hashForIndex(data: string, salt?: string): string {
    const saltBuffer = salt ? Buffer.from(salt, "hex") : crypto.randomBytes(16)
    const hash = crypto.pbkdf2Sync(data, saltBuffer, 10000, 32, "sha256")
    return `${saltBuffer.toString("hex")}:${hash.toString("hex")}`
  }

  /**
   * Generate a search token for encrypted data
   * This allows searching without full decryption
   */
  static generateSearchToken(data: string): string {
    const normalized = data.toLowerCase().trim()
    return crypto.createHash("sha256").update(normalized).digest("hex")
  }

  /**
   * Key rotation - re-encrypt data with new key
   */
  static rotateEncryption(encryptedData: EncryptedData, newKeyId?: string): EncryptedData {
    // Decrypt with old key
    const plaintext = this.decrypt(encryptedData)
    
    // Re-encrypt with new key
    return this.encrypt(plaintext, newKeyId)
  }

  /**
   * Secure data deletion (overwrite memory)
   */
  static secureDelete(sensitiveData: string | Buffer): void {
    if (typeof sensitiveData === "string") {
      // For strings, we can't directly overwrite memory in JavaScript
      // But we can at least clear the reference
      sensitiveData = ""
    } else if (Buffer.isBuffer(sensitiveData)) {
      // Overwrite buffer with random data
      crypto.randomFillSync(sensitiveData)
    }
  }

  /**
   * Validate encryption integrity
   */
  static validateIntegrity(encryptedData: EncryptedData): boolean {
    try {
      // Attempt to decrypt - if successful, integrity is maintained
      this.decrypt(encryptedData)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get encryption metadata for audit logging
   */
  static getMetadata(encryptedData: EncryptedData) {
    return {
      algorithm: ALGORITHM,
      keyId: encryptedData.keyId,
      hasIV: !!encryptedData.iv,
      hasTag: !!encryptedData.tag,
      hasSalt: !!encryptedData.salt,
      dataLength: encryptedData.encryptedData.length,
    }
  }
}

// Initialize encryption on module load
PHIEncryption.initialize()

/**
 * Convenience functions for common PHI fields
 */
export const encryptPHI = PHIEncryption.encrypt.bind(PHIEncryption)
export const decryptPHI = PHIEncryption.decrypt.bind(PHIEncryption)
export const encryptPHIFields = PHIEncryption.encryptFields.bind(PHIEncryption)
export const decryptPHIFields = PHIEncryption.decryptFields.bind(PHIEncryption)
export const isEncryptedPHI = PHIEncryption.isEncrypted.bind(PHIEncryption)

/**
 * Type guard for encrypted PHI data
 */
export function isEncryptedData(value: unknown): value is EncryptedData {
  return PHIEncryption.isEncrypted(value)
}