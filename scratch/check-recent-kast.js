const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentKast() {
  console.log('Checking KAST for the 10 most recent tracker matches...');
  const recent = await prisma.tracker_matches.findMany({
    orderBy: { parsed_at: 'desc' },
    take: 10,
    include: {
      tracker_match_players: {
        select: { steamid64: true, kast: true }
      }
    }
  });
  
  recent.forEach(m => {
    console.log(`Match ${m.match_id} (Parsed at: ${m.parsed_at}):`);
    m.tracker_match_players.forEach(p => {
      console.log(`  - Player ${p.steamid64}: KAST = ${p.kast}`);
    });
  });
}

checkRecentKast().catch(console.error).finally(() => prisma.$disconnect());
