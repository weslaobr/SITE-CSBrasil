const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTrackerPlayers() {
  const matchId = 'demo_8885ba7d89d63f48';
  console.log(`Checking tracker_match_players for match: ${matchId}`);
  
  const players = await prisma.tracker_match_players.findMany({
    where: { match_id: matchId }
  });
  
  console.log('Players found:', players.length);
  if (players.length > 0) {
    const p = players[0];
    console.log('Fields:', Object.keys(p));
    console.log('KAST value:', p.kast);
  }
}

checkTrackerPlayers().catch(console.error).finally(() => prisma.$disconnect());
