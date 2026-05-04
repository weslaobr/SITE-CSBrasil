import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPremierMatches() {
  const premierMatches = await prisma.globalMatch.findMany({
    where: {
      OR: [
        { source: { contains: 'premier', mode: 'insensitive' } },
        { metadata: { path: ['gameMode'], string_contains: 'premier' } }
      ]
    },
    include: {
      players: {
        take: 5
      }
    },
    take: 5
  });

  console.log('Premier Matches Found:', JSON.stringify(premierMatches, null, 2));

  const playersWithRating = await prisma.globalMatchPlayer.findMany({
    where: {
      OR: [
        { eloAfter: { gt: 0 } },
        { metadata: { path: ['rank'], not: null } }
      ]
    },
    take: 10
  });

  console.log('Players with ELO/Rank metadata:', JSON.stringify(playersWithRating, null, 2));

  await prisma.$disconnect();
}

checkPremierMatches().catch(console.error);
