import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/client"
import { Role } from "@prisma/client"
import { signUpSchema, type SignUpInput } from "@/lib/validation"
import { generateVerificationToken } from "./verification"
import { sendVerificationEmail } from "@/lib/email/service"

export interface RegistrationResult {
  success: boolean
  user?: {
    id: string
    email: string
    name: string
    role: Role
  }
  error?: string
  verificationToken?: string
}

export async function registerUser(input: SignUpInput): Promise<RegistrationResult> {
  try {
    // Validate input
    const validatedInput = signUpSchema.parse(input)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedInput.email },
    })
    
    if (existingUser) {
      return {
        success: false,
        error: "User with this email already exists",
      }
    }
    
    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12")
    const hashedPassword = await bcrypt.hash(validatedInput.password, saltRounds)
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedInput.email,
        name: validatedInput.name,
        role: validatedInput.role || Role.CLIENT,
        // Note: password will be stored in a separate table for security
        // For now, we'll use a placeholder approach
        practiceInfo: validatedInput.role === Role.HERBALIST ? {} : null,
      },
    })
    
    // Generate verification token
    const verificationToken = await generateVerificationToken(user.id)
    
    // Send verification email
    await sendVerificationEmail(user.email, user.name || "User", verificationToken)
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || "",
        role: user.role,
      },
      verificationToken,
    }
  } catch (error) {
    console.error("Registration error:", error)
    return {
      success: false,
      error: "Registration failed. Please try again.",
    }
  }
}

export async function checkEmailAvailability(email: string): Promise<boolean> {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })
    
    return !existingUser
  } catch (error) {
    console.error("Email availability check error:", error)
    return false
  }
}

export async function validatePracticeInfo(practiceInfo: any): Promise<boolean> {
  // Validate required practice information for herbalist accounts
  if (!practiceInfo) return false
  
  // Basic validation - can be expanded based on requirements
  return !!(
    practiceInfo.licenseNumber ||
    practiceInfo.certifications ||
    practiceInfo.businessName
  )
}

// Rate limiting for registration attempts
const registrationAttempts = new Map<string, { count: number; timestamp: number }>()

export function checkRegistrationRateLimit(ip: string): boolean {
  const now = Date.now()
  const hourInMs = 60 * 60 * 1000
  
  const attempts = registrationAttempts.get(ip)
  
  if (!attempts) {
    registrationAttempts.set(ip, { count: 1, timestamp: now })
    return true
  }
  
  // Reset counter if more than an hour has passed
  if (now - attempts.timestamp > hourInMs) {
    registrationAttempts.set(ip, { count: 1, timestamp: now })
    return true
  }
  
  // Check if under limit (5 attempts per hour)
  if (attempts.count < 5) {
    attempts.count++
    return true
  }
  
  return false
}

export function clearRegistrationRateLimit(ip: string): void {
  registrationAttempts.delete(ip)
}