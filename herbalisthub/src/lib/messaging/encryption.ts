/**
 * Client-side message encryption utilities
 * Provides end-to-end encryption for HIPAA-compliant messaging
 */

export class MessageEncryption {
  private static async generateKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    )
  }

  private static async generateSymmetricKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    )
  }

  private static async exportKey(key: CryptoKey, format: "raw" | "spki" | "pkcs8"): Promise<ArrayBuffer> {
    return await window.crypto.subtle.exportKey(format, key)
  }

  private static async importKey(
    keyData: ArrayBuffer,
    algorithm: AlgorithmIdentifier | RsaHashedImportParams | AesKeyAlgorithm,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ): Promise<CryptoKey> {
    return await window.crypto.subtle.importKey("raw", keyData, algorithm, extractable, keyUsages)
  }

  /**
   * Encrypt a message using AES-GCM with a randomly generated key
   * Returns both the encrypted data and the encrypted symmetric key
   */
  static async encryptMessage(
    message: string,
    recipientPublicKey: CryptoKey
  ): Promise<{
    encryptedMessage: ArrayBuffer
    encryptedKey: ArrayBuffer
    iv: ArrayBuffer
  }> {
    try {
      // Generate a symmetric key for this message
      const symmetricKey = await this.generateSymmetricKey()
      
      // Generate a random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12))
      
      // Encrypt the message with the symmetric key
      const encodedMessage = new TextEncoder().encode(message)
      const encryptedMessage = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        symmetricKey,
        encodedMessage
      )
      
      // Export the symmetric key and encrypt it with the recipient's public key
      const exportedSymmetricKey = await this.exportKey(symmetricKey, "raw")
      const encryptedKey = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP",
        },
        recipientPublicKey,
        exportedSymmetricKey
      )

      return {
        encryptedMessage,
        encryptedKey,
        iv,
      }
    } catch (error) {
      console.error("Message encryption failed:", error)
      throw new Error("Failed to encrypt message")
    }
  }

  /**
   * Decrypt a message using the user's private key and the encrypted symmetric key
   */
  static async decryptMessage(
    encryptedMessage: ArrayBuffer,
    encryptedKey: ArrayBuffer,
    iv: ArrayBuffer,
    userPrivateKey: CryptoKey
  ): Promise<string> {
    try {
      // Decrypt the symmetric key with the user's private key
      const decryptedSymmetricKeyData = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        userPrivateKey,
        encryptedKey
      )
      
      // Import the decrypted symmetric key
      const symmetricKey = await this.importKey(
        decryptedSymmetricKeyData,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      )
      
      // Decrypt the message with the symmetric key
      const decryptedMessage = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        symmetricKey,
        encryptedMessage
      )
      
      return new TextDecoder().decode(decryptedMessage)
    } catch (error) {
      console.error("Message decryption failed:", error)
      throw new Error("Failed to decrypt message")
    }
  }

  /**
   * Generate and store a key pair for the current user
   * This should be called during user onboarding or first message access
   */
  static async generateUserKeyPair(): Promise<{
    publicKey: string
    privateKey: string
  }> {
    try {
      const keyPair = await this.generateKeyPair()
      
      const publicKeyData = await this.exportKey(keyPair.publicKey, "spki")
      const privateKeyData = await this.exportKey(keyPair.privateKey, "pkcs8")
      
      // Convert to base64 for storage
      const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyData)))
      const privateKey = btoa(String.fromCharCode(...new Uint8Array(privateKeyData)))
      
      return { publicKey, privateKey }
    } catch (error) {
      console.error("Key generation failed:", error)
      throw new Error("Failed to generate encryption keys")
    }
  }

  /**
   * Convert base64 string back to CryptoKey for use in encryption/decryption
   */
  static async importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
    try {
      const publicKeyData = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0))
      
      return await window.crypto.subtle.importKey(
        "spki",
        publicKeyData,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        false,
        ["encrypt"]
      )
    } catch (error) {
      console.error("Public key import failed:", error)
      throw new Error("Failed to import public key")
    }
  }

  /**
   * Convert base64 string back to CryptoKey for use in decryption
   */
  static async importPrivateKey(privateKeyBase64: string): Promise<CryptoKey> {
    try {
      const privateKeyData = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0))
      
      return await window.crypto.subtle.importKey(
        "pkcs8",
        privateKeyData,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        false,
        ["decrypt"]
      )
    } catch (error) {
      console.error("Private key import failed:", error)
      throw new Error("Failed to import private key")
    }
  }

  /**
   * Securely store the user's private key in browser storage
   * Note: In production, consider using IndexedDB with additional encryption
   */
  static storePrivateKey(privateKey: string, userId: string): void {
    try {
      // In production, this should be encrypted with a user-derived key
      sessionStorage.setItem(`messaging_private_key_${userId}`, privateKey)
    } catch (error) {
      console.error("Failed to store private key:", error)
      throw new Error("Failed to store encryption key")
    }
  }

  /**
   * Retrieve the user's private key from browser storage
   */
  static getPrivateKey(userId: string): string | null {
    try {
      return sessionStorage.getItem(`messaging_private_key_${userId}`)
    } catch (error) {
      console.error("Failed to retrieve private key:", error)
      return null
    }
  }

  /**
   * Clear stored encryption keys (on logout)
   */
  static clearStoredKeys(userId: string): void {
    try {
      sessionStorage.removeItem(`messaging_private_key_${userId}`)
    } catch (error) {
      console.error("Failed to clear stored keys:", error)
    }
  }
}

/**
 * Utility functions for handling encrypted data in API calls
 */
export class MessageSecurityUtils {
  /**
   * Prepare encrypted message data for API transmission
   */
  static prepareEncryptedData(encryptedData: {
    encryptedMessage: ArrayBuffer
    encryptedKey: ArrayBuffer
    iv: ArrayBuffer
  }): {
    encryptedMessage: string
    encryptedKey: string
    iv: string
  } {
    return {
      encryptedMessage: btoa(String.fromCharCode(...new Uint8Array(encryptedData.encryptedMessage))),
      encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedData.encryptedKey))),
      iv: btoa(String.fromCharCode(...new Uint8Array(encryptedData.iv))),
    }
  }

  /**
   * Restore encrypted data from API response
   */
  static restoreEncryptedData(data: {
    encryptedMessage: string
    encryptedKey: string
    iv: string
  }): {
    encryptedMessage: ArrayBuffer
    encryptedKey: ArrayBuffer
    iv: ArrayBuffer
  } {
    return {
      encryptedMessage: Uint8Array.from(atob(data.encryptedMessage), c => c.charCodeAt(0)).buffer,
      encryptedKey: Uint8Array.from(atob(data.encryptedKey), c => c.charCodeAt(0)).buffer,
      iv: Uint8Array.from(atob(data.iv), c => c.charCodeAt(0)).buffer,
    }
  }

  /**
   * Generate a secure hash for message integrity verification
   */
  static async generateMessageHash(message: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}