const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const target = '7e9536ca-9c1a-48bf-8751-f412fe423925';
        // Check GlobalMatch id, source, mapName, or metadata
        const matches = await prisma.globalMatch.findMany({
            where: {
                OR: [
                    { id: { contains: target } },
                    { metadata: { path: ['demoUrl'], string_contains: target } }
                ]
            }
        });
        console.log("Search result:", JSON.stringify(matches, null, 2));
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
