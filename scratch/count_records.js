
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const players = await prisma.player.count();
  const users = await prisma.user.count();
  const matches = await prisma.match.count();
  const globalMatches = await prisma.globalMatch.count();
  const globalMatchPlayers = await prisma.globalMatchPlayer.count();
  
  console.log({ players, users, matches, globalMatches, globalMatchPlayers });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
