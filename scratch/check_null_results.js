
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNullResults() {
  const players = await prisma.globalMatchPlayer.findMany({
    where: { 
      OR: [
        { matchResult: null },
        { matchResult: '' }
      ]
    },
    include: { GlobalMatch: true },
    take: 10
  });

  console.log(`Found ${players.length} players with empty result.`);
  for (const p of players) {
    console.log(`Match ID: ${p.globalMatchId} | Score: ${p.GlobalMatch.scoreA}-${p.GlobalMatch.scoreB} | Player Team: ${p.team}`);
  }
  await prisma.$disconnect();
}

checkNullResults();
