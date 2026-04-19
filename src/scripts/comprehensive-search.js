const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const targetId = '7e9536ca-9c1a-48bf-8751-f412fe423925';
        const matches = await prisma.globalMatch.findMany({
            take: 100,
            select: { id: true, source: true, metadata: true }
        });
        
        console.log(`Checking ${matches.length} recent matches for ID ${targetId}...`);
        const found = matches.find(m => m.id === targetId || m.id.includes(targetId));
        if (found) {
            console.log("Found match:", JSON.stringify(found, null, 2));
        } else {
            console.log("Match not found in latest 100.");
            // Try explicit findUnique
            const unique = await prisma.globalMatch.findUnique({ where: { id: targetId } });
            console.log("Unique search result:", unique ? "Found" : "Not Found");
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
