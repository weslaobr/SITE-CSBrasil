
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const playerCount = await prisma.player.count();
  const userCount = await prisma.user.count();
  console.log('Player count:', playerCount);
  console.log('User count:', userCount);
  const players = await prisma.player.findMany({ take: 5 });
  console.log('First 5 players:', JSON.stringify(players, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
