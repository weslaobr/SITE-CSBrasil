const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkKast() {
  const baseId = 'demo_8885ba7d89d63f48';
  
  console.log(`Checking KAST for match: ${baseId}`);
  const players = await prisma.tracker_match_players.findMany({
    where: { match_id: baseId },
    select: { steamid64: true, kast: true }
  });
  
  players.forEach(p => {
    console.log(`Player ${p.steamid64}: KAST = ${p.kast}`);
  });
}

checkKast().catch(console.error).finally(() => prisma.$disconnect());
