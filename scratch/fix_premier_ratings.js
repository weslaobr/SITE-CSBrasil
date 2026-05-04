const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixLowRatings() {
  try {
    console.log('Searching for players with suspicious premierRating (<= 100)...');
    
    const affected = await prisma.stats.findMany({
      where: {
        AND: [
          { premierRating: { lte: 100 } },
          { premierRating: { gt: 0 } }
        ]
      },
      include: {
        Player: true
      }
    });

    console.log(`Found ${affected.length} affected players.`);

    for (const stat of affected) {
      console.log(`Fixing player: ${stat.Player.steamName || stat.Player.steamId} (Current: ${stat.premierRating})`);
      await prisma.stats.update({
        where: { id: stat.id },
        data: { premierRating: 0 }
      });
    }

    console.log('Cleanup complete.');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLowRatings();
