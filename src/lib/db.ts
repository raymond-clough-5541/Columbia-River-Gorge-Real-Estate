import { PrismaClient } from '@prisma/client'
import path from 'path'

// Guard against missing DATABASE_URL during initialization (e.g. Vercel serverless)
if (!process.env.DATABASE_URL) {
  const dbPath = path.join(process.cwd(), 'db', 'custom.db')
  process.env.DATABASE_URL = `file:${dbPath}`
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db