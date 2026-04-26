const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const steamId = '76561198771796413';
  const player = await prisma.player.findUnique({
    where: { steamId },
    include: { Stats: true }
  });

  if (!player) {
    console.log('Player NOT FOUND in database.');
    return;
  }

  console.log('Player Found:');
  console.log('Steam ID:', player.steamId);
  console.log('Name:', player.steamName);
  console.log('Stats:', player.Stats ? {
    premier: player.Stats.premierRating,
    faceitElo: player.Stats.faceitElo,
    faceitLevel: player.Stats.faceitLevel,
    gcLevel: player.Stats.gcLevel
  } : 'NO STATS');

  const user = await prisma.user.findUnique({
    where: { steamId }
  });
  console.log('User Account:', user ? 'FOUND' : 'NOT FOUND');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
