
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const info = await prisma.$queryRaw`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_name = 'tracker_match_players'
        `;
        console.log(info);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
