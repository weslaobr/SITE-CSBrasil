
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const matchId = 'demo_9aade6a945b74e29'
  try {
    const match = await prisma.globalMatch.findUnique({
      where: { id: matchId },
      include: { players: true }
    })
    console.log('Match found with players')
  } catch (e: any) {
    console.error('Error fetching match with players:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
