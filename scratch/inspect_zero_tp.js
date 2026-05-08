
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectMatches() {
  const matches = await prisma.globalMatch.findMany({
    where: { 
      GlobalMatchPlayer: {
        some: { eloChange: 0 }
      }
    },
    include: { GlobalMatchPlayer: true },
    take: 5
  });

  for (const m of matches) {
    console.log(`Match ID: ${m.id} | Score: ${m.scoreA}-${m.scoreB} | Source: ${m.source}`);
    for (const p of m.GlobalMatchPlayer) {
      console.log(`  Player: ${p.steamId} | Result: ${p.matchResult} | Team: ${p.team} | K/D: ${p.kills}/${p.deaths} | ADR: ${p.adr}`);
    }
  }
  await prisma.$disconnect();
}

inspectMatches();
