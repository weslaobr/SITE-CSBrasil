
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const steamId = "76561198024691636";
    try {
        console.log(`Setting isAdmin=true for steamId ${steamId}...`);
        // First try via Prisma
        await prisma.user.update({
            where: { steamId: steamId },
            data: { isAdmin: true }
        });
        console.log("Success via Prisma!");
    } catch (e) {
        console.log("Failed via Prisma, trying raw SQL...");
        try {
            await prisma.$executeRawUnsafe(`UPDATE public."User" SET "isAdmin" = true WHERE "steamId" = '${steamId}'`);
            console.log("Success via Raw SQL!");
        } catch (err) {
            console.error("Fatal Error:", err.message);
        }
    }
    await prisma.$disconnect();
}

main();
