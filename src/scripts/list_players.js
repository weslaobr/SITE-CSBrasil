const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const players = await prisma.player.findMany({
        select: {
            steamId: true,
            steamName: true
        }
    });
    console.log("DATABASE PLAYERS:");
    console.log(JSON.stringify(players, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
