
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const columns = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name = 'tracker_match_players'");
        console.log(JSON.stringify(columns, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
