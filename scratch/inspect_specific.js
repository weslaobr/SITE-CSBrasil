
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectSpecificMatch() {
  const m = await prisma.globalMatch.findUnique({
    where: { id: 'a650d3a6-cc4a-4e1c-9503-48bcb12ed4bf' },
    include: { GlobalMatchPlayer: true }
  });

  if (m) {
    console.log(`Match ID: ${m.id} | Source: '${m.source}' | Metadata:`, JSON.stringify(m.metadata).substring(0, 100));
    for (const p of m.GlobalMatchPlayer) {
      if (p.eloChange) {
        console.log(`  Player: ${p.steamId} | eloChange: ${p.eloChange} | Result: ${p.matchResult}`);
      }
    }
  }
  await prisma.$disconnect();
}

inspectSpecificMatch();
