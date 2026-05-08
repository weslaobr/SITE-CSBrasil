
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkManualMatches() {
  const matches = await prisma.globalMatch.findMany({
    where: { 
      source: { in: ['manual', 'mix', 'demo-analyzer'] },
      GlobalMatchPlayer: {
        some: { eloChange: 0 }
      }
    },
    include: { GlobalMatchPlayer: true },
    take: 10
  });

  for (const m of matches) {
    console.log(`Match ID: ${m.id} | Source: ${m.source} | Score: ${m.scoreA}-${m.scoreB}`);
    const p = m.GlobalMatchPlayer[0];
    console.log(`  Sample Player Result: ${p.matchResult} | eloChange: ${p.eloChange}`);
  }
  await prisma.$disconnect();
}

checkManualMatches();
