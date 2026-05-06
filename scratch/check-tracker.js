const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTracker() {
  const baseId = 'demo_8885ba7d89d63f48';
  const fullId = 'demo_8885ba7d89d63f48_76561198024691636';
  
  console.log('Checking tracker players for base ID...');
  const basePlayers = await prisma.tracker_match_players.findMany({
    where: { match_id: baseId }
  });
  console.log(`Base ID: ${basePlayers.length} players`);

  console.log('Checking tracker players for full ID...');
  const fullPlayers = await prisma.tracker_match_players.findMany({
    where: { match_id: fullId }
  });
  console.log(`Full ID: ${fullPlayers.length} players`);
}

checkTracker().catch(console.error).finally(() => prisma.$disconnect());
