const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const target = '7e9536ca-9c1a-48bf-8751-f412fe423925';
        const match = await prisma.match.findUnique({
            where: { id: target }
        });
        console.log("Match search result:", JSON.stringify(match, null, 2));
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
