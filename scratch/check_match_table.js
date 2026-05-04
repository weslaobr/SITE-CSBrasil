const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const matchId = 'demo_dc5d64c6894fe35064dce1de';
    const matches = await prisma.match.findMany({
        where: { externalId: matchId }
    });

    console.log(`Found ${matches.length} entries in Match table for externalId ${matchId}`);
    matches.forEach(m => {
        console.log(`- Player ID: ${m.userId}, Result: ${m.result}, Score: ${m.score}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
