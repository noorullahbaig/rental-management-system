import { PrismaClient } from '@prisma/client'
import { seedStarterData } from '../server/state.ts'

const prisma = new PrismaClient()

try {
  await seedStarterData(prisma)
  console.log('Starter operational data restored.')
} finally {
  await prisma.$disconnect()
}
