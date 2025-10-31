#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"
import { seedUsers } from "./seeds/users"
import { seedHerbs } from "./seeds/herbs"
import { seedFormulas } from "./seeds/formulas"
import { seedAppointments } from "./seeds/appointments"
import { seedContent } from "./seeds/content"
import { seedAuditLogs } from "./seeds/audit-logs"

const prisma = new PrismaClient()

/**
 * Main seeding function
 * Runs all seed functions in the correct order to maintain referential integrity
 */
async function main() {
  console.log("🌱 Starting database seeding...")

  try {
    // Clear existing data in development only
    if (process.env.NODE_ENV === "development") {
      console.log("🧹 Clearing existing data...")
      await clearDatabase()
    }

    // Seed in order of dependencies
    console.log("👥 Seeding users and authentication...")
    await seedUsers(prisma)

    console.log("🌿 Seeding herbs and inventory...")
    await seedHerbs(prisma)

    console.log("⚗️ Seeding formulas and preparations...")
    await seedFormulas(prisma)

    console.log("📅 Seeding appointments and consultations...")
    await seedAppointments(prisma)

    console.log("📚 Seeding content and educational materials...")
    await seedContent(prisma)

    console.log("📊 Seeding audit logs and system data...")
    await seedAuditLogs(prisma)

    console.log("✅ Database seeding completed successfully!")
    
    // Display seeded data summary
    await displaySeedingSummary()

  } catch (error) {
    console.error("❌ Error during seeding:", error)
    throw error
  }
}

/**
 * Clear existing data for fresh seeding (development only)
 */
async function clearDatabase() {
  const tablenames = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = schema()
    AND table_name NOT IN ('_prisma_migrations')
  `

  const tables = tablenames
    .map(({ table_name }: { table_name: string }) => table_name)
    .filter((name: string) => name !== "_prisma_migrations")

  try {
    // Disable foreign key checks for MySQL
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0;")
    
    // Truncate all tables
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`)
    }
    
    // Re-enable foreign key checks
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1;")
    
    console.log(`🗑️ Cleared ${tables.length} tables`)
  } catch (error) {
    console.log("Note: Some tables may not exist yet, which is normal for initial setup")
  }
}

/**
 * Display summary of seeded data
 */
async function displaySeedingSummary() {
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.herb.count(),
    prisma.formula.count(),
    prisma.appointment.count(),
    prisma.blogPost.count(),
    prisma.auditLog.count(),
  ])

  console.log("\n📈 Seeding Summary:")
  console.log(`  Users: ${counts[0]}`)
  console.log(`  Herbs: ${counts[1]}`)
  console.log(`  Formulas: ${counts[2]}`)
  console.log(`  Appointments: ${counts[3]}`)
  console.log(`  Blog Posts: ${counts[4]}`)
  console.log(`  Audit Logs: ${counts[5]}`)
  console.log("")
}

/**
 * Create default admin user if none exists
 */
export async function createDefaultAdmin() {
  const adminExists = await prisma.user.findFirst({
    where: { role: "ADMIN" }
  })

  if (!adminExists) {
    const hashedPassword = await hash("admin123!", 12)
    
    const admin = await prisma.user.create({
      data: {
        email: "admin@herbalisthub.com",
        name: "System Administrator",
        role: "ADMIN",
        emailVerified: new Date(),
        password: hashedPassword,
        isActive: true,
      }
    })

    console.log("👑 Created default admin user:")
    console.log(`   Email: ${admin.email}`)
    console.log(`   Password: admin123!`)
    console.log(`   Please change the password after first login`)
    
    return admin
  }

  return adminExists
}

/**
 * Run seeding with proper error handling and cleanup
 */
main()
  .catch((e) => {
    console.error("💥 Fatal error during seeding:", e)
    process.exit(1)
  })
  .finally(async () => {
    console.log("🔌 Disconnecting from database...")
    await prisma.$disconnect()
  })

// Export for use in other scripts
export { prisma }