const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFaceit() {
    try {
        const stats = await prisma.stats.findMany({
            where: {
                faceitLevel: { gt: 0 }
            },
            take: 5
        });
        console.log("Stats with Faceit Level:", JSON.stringify(stats, null, 2));
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkFaceit();
