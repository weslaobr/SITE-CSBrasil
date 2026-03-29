import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const match = await prisma.globalMatch.findFirst({
    include: { players: true }
  })
  console.log(JSON.stringify(match, null, 2))
}
main()
