const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const matches = await prisma.globalMatch.findMany({
            orderBy: { matchDate: 'desc' },
            take: 20,
            select: { id: true, source: true, metadata: true }
        });
        console.log("Recent matches sources:");
        matches.forEach(m => {
            const meta = m.metadata || {};
            console.log(`ID: ${m.id} | Source: ${m.source} | DemoUrl: ${meta.demoUrl || 'null'}`);
        });
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
