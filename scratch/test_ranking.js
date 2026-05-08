
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRanking() {
  console.log("--- Starting Ranking Test ---");
  try {
    const players = await prisma.player.findMany({
      include: { Stats: true }
    });
    console.log(`Found ${players.length} players`);
    
    const allSteamIds = players.map(p => p.steamId);
    const users = await prisma.user.findMany({
      where: { steamId: { in: allSteamIds } }
    });
    console.log(`Found ${users.length} matching users`);
    
    // Simulate the aggregation
    const allMatchPlayers = await prisma.globalMatchPlayer.findMany({
      where: { steamId: { in: allSteamIds } },
      include: { GlobalMatch: true }
    });
    console.log(`Found ${allMatchPlayers.length} match player records`);
    
    console.log("--- End of Test ---");
  } catch (e) {
    console.error("Error during ranking test:", e);
  } finally {
    await prisma.$disconnect();
  }
}

testRanking();
