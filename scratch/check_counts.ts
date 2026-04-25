import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userCount = await prisma.user.count();
    const playerCount = await prisma.player.count();

    console.log(`Total Users (logged into site): ${userCount}`);
    console.log(`Total Players (registered in bot/ranking): ${playerCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
