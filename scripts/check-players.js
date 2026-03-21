const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const players = await prisma.player.findMany({
      include: {
        Stats: true
      },
      take: 10
    });
    console.log("Players in DB:");
    console.dir(players, { depth: null });
  } catch (error) {
    console.error("Error fetching players:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
