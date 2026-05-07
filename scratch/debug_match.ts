
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const matchId = 'demo_9aade6a945b74e29'
  try {
    const match = await prisma.globalMatch.findUnique({
      where: { id: matchId },
      include: { GlobalMatchPlayer: true }
    })
    console.log('Match found:', JSON.stringify(match, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2))
  } catch (e) {
    console.error('Error fetching match:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
