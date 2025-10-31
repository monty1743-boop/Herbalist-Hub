import { PrismaClient } from '@prisma/client';
import { createEncryptionMiddleware } from '@/lib/encryption/prisma-middleware';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  });

// Add encryption middleware for automatic PHI encryption/decryption
if (!globalForPrisma.prisma) {
  prisma.$use(createEncryptionMiddleware());
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function for safe database operations
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error('Database operation failed:', error);
    return fallback ?? null;
  }
}

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}