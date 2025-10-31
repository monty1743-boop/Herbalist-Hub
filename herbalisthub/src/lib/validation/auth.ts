import { z } from "zod"
import { Role } from "@prisma/client"

// Authentication schemas
export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  confirmPassword: z.string(),
  role: z.nativeEnum(Role).optional().default(Role.CLIENT),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const passwordResetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// User profile schema
export const userProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]{10,}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  image: z.string().url("Please enter a valid image URL").optional(),
  practiceInfo: z
    .object({
      licenseNumber: z.string().optional(),
      certifications: z.array(z.string()).optional(),
      businessName: z.string().optional(),
      businessAddress: z.string().optional(),
      website: z.string().url().optional(),
    })
    .optional(),
})

// Session validation
export const sessionSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().email(),
    role: z.nativeEnum(Role),
    image: z.string().nullable(),
  }),
  expires: z.string(),
})

// Type exports
export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type PasswordResetInput = z.infer<typeof passwordResetSchema>
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>
export type UserProfileInput = z.infer<typeof userProfileSchema>
export type SessionData = z.infer<typeof sessionSchema>