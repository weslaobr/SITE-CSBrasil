const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const matches = await prisma.globalMatch.findMany({
            where: { source: 'mix' },
            take: 5,
            select: { id: true, source: true, metadata: true }
        });
        console.log("Mix matches found:", JSON.stringify(matches, null, 2));
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
