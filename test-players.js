const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const players = await prisma.player.findMany({ include: { Stats: true } });
  console.log('Total players:', players.length);
  const ranked = players.map(p => {
    const stats = p.Stats;
    const rating = stats?.premierRating || stats?.faceitElo || 0;
    return { steamId: p.steamId, rating };
  }).filter(u => u.rating > 0);
  console.log('Players with rating > 0:', ranked.length);
}
test().finally(() => prisma.$disconnect());
