const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const match = await prisma.globalMatch.findUnique({
        where: { id: 'demo_dc5d64c6894fe35064dce1de' }
    });
    console.log(`Match Source: ${match.source}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
