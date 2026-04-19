const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const matchId = '7e9536ca-9c1a-48bf-8751-f412fe423925';
        const m = await prisma.globalMatch.findUnique({
            where: { id: matchId },
            select: { id: true, source: true, metadata: true }
        });
        console.log("Match data:", JSON.stringify(m, null, 2));
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
