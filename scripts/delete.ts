import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const del = await prisma.match.deleteMany({
        where: { externalId: 'CSGO-ayCMf-hSHUh-SQzDn-LUMje-YjEuA' }
    });
    console.log(`Deleted ${del.count} matches.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
