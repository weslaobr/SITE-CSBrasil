
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Attempting to add 'isAdmin' column...");
        try {
            await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN DEFAULT false`;
            console.log("Column added.");
        } catch (e) {
            console.log("Column might already exist or another error occurred:", e.message);
        }
        
        const adminSteamId = "76561198024691636";
        console.log(`Setting isAdmin=true for steamId ${adminSteamId}...`);
        await prisma.user.update({
            where: { steamId: adminSteamId },
            data: { isAdmin: true }
        });
        console.log("Admin set successfully.");
    } catch (e) {
        console.error("Fatal Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
