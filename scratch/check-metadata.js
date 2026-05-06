const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMetadata() {
  const baseId = 'demo_8885ba7d89d63f48';
  
  console.log(`Checking metadata for match: ${baseId}`);
  const players = await prisma.globalMatchPlayer.findMany({
    where: { globalMatchId: baseId },
    select: { steamId: true, metadata: true }
  });
  
  players.forEach(p => {
    const m = p.metadata || {};
    console.log(`Player ${p.steamId}: KAST_META=${m.kast || m.kast_percent || m.kast_percentage || m.kastPercentage || 'MISSING'}`);
  });
}

checkMetadata().catch(console.error).finally(() => prisma.$disconnect());
