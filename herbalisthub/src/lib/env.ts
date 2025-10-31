import { z } from "zod"

// Environment variable validation schema
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  TEST_DATABASE_URL: z.string().optional(),
  
  // NextAuth.js
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  
  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Email Services
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  
  // AWS Services
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),
  
  // Google Services
  GOOGLE_CALENDAR_API_KEY: z.string().optional(),
  GOOGLE_ANALYTICS_ID: z.string().optional(),
  
  // Payment Processing
  STRIPE_PUBLIC_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Security & Encryption
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  BCRYPT_SALT_ROUNDS: z.string().default("12"),
  
  // External APIs
  ZOOM_API_KEY: z.string().optional(),
  ZOOM_API_SECRET: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
  // Application Settings
  APP_NAME: z.string().default("HerbalistHub"),
  APP_VERSION: z.string().default("1.0.0"),
  DEFAULT_TIMEZONE: z.string().default("America/New_York"),
  MAX_FILE_SIZE: z.string().default("10485760"), // 10MB
  SESSION_TIMEOUT: z.string().default("86400"), // 24 hours
  
  // Monitoring & Logging
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  
  // Redis
  REDIS_URL: z.string().optional(),
  
  // Feature Flags
  ENABLE_GOOGLE_CALENDAR_SYNC: z.string().default("true"),
  ENABLE_EMAIL_REMINDERS: z.string().default("true"),
  ENABLE_SMS_NOTIFICATIONS: z.string().default("false"),
  ENABLE_FILE_UPLOADS: z.string().default("true"),
  ENABLE_AUDIT_LOGGING: z.string().default("true"),
  
  // Development
  SEED_DATABASE: z.string().default("false"),
  DEBUG: z.string().default("false"),
  PRISMA_STUDIO_PORT: z.string().default("5555"),
})

// Parse and validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:")
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join(".")}: ${err.message}`)
      })
      process.exit(1)
    }
    throw error
  }
}

// Export validated environment variables
export const env = validateEnv()

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>

// Helper functions for feature flags
export const isFeatureEnabled = (feature: keyof Pick<Env, 
  | "ENABLE_GOOGLE_CALENDAR_SYNC"
  | "ENABLE_EMAIL_REMINDERS"
  | "ENABLE_SMS_NOTIFICATIONS"
  | "ENABLE_FILE_UPLOADS"
  | "ENABLE_AUDIT_LOGGING"
>): boolean => {
  return env[feature] === "true"
}

// Helper functions for environment checks
export const isDevelopment = env.NODE_ENV === "development"
export const isProduction = env.NODE_ENV === "production"
export const isStaging = env.NODE_ENV === "staging"

// Helper functions for service availability
export const hasGoogleOAuth = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
export const hasEmailService = !!(env.SMTP_HOST || env.SENDGRID_API_KEY)
export const hasAWS = !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY)
export const hasStripe = !!(env.STRIPE_PUBLIC_KEY && env.STRIPE_SECRET_KEY)
export const hasTwilio = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN)
export const hasZoom = !!(env.ZOOM_API_KEY && env.ZOOM_API_SECRET)
export const hasRedis = !!env.REDIS_URL
export const hasSentry = !!env.SENTRY_DSN

// Configuration objects for external services
export const databaseConfig = {
  url: env.DATABASE_URL,
  testUrl: env.TEST_DATABASE_URL,
}

export const authConfig = {
  secret: env.NEXTAUTH_SECRET,
  url: env.NEXTAUTH_URL,
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  },
}

export const emailConfig = {
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ? parseInt(env.SMTP_PORT) : undefined,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
  },
  sendgrid: {
    apiKey: env.SENDGRID_API_KEY,
  },
}

export const awsConfig = {
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region: env.AWS_REGION,
  s3: {
    bucket: env.AWS_S3_BUCKET,
    region: env.AWS_S3_REGION,
  },
}

export const securityConfig = {
  encryptionKey: env.ENCRYPTION_KEY,
  jwtSecret: env.JWT_SECRET,
  bcryptSaltRounds: parseInt(env.BCRYPT_SALT_ROUNDS),
}

export const appConfig = {
  name: env.APP_NAME,
  version: env.APP_VERSION,
  timezone: env.DEFAULT_TIMEZONE,
  maxFileSize: parseInt(env.MAX_FILE_SIZE),
  sessionTimeout: parseInt(env.SESSION_TIMEOUT),
  logLevel: env.LOG_LEVEL,
}

// Validate required environment variables for production
export function validateProductionEnv() {
  if (!isProduction) return

  const requiredForProduction = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "ENCRYPTION_KEY",
    "JWT_SECRET",
  ]

  const missing = requiredForProduction.filter((key) => !process.env[key])

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables for production:")
    missing.forEach((key) => console.error(`  ${key}`))
    process.exit(1)
  }

  console.log("✅ Production environment variables validated")
}

// Validate environment on module load
if (isDevelopment) {
  console.log("🔧 Development environment loaded")
} else if (isStaging) {
  console.log("🚧 Staging environment loaded")
} else if (isProduction) {
  console.log("🚀 Production environment loaded")
  validateProductionEnv()
}