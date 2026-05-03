const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecificPlayer() {
    try {
        const player = await prisma.player.findUnique({
            where: { steamId: '76561198024691636' },
            include: { Stats: true }
        });
        console.log("Player Data:", JSON.stringify(player, null, 2));
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSpecificPlayer();
