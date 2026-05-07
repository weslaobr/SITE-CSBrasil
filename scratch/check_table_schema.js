const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const tables = ['tracker_matches', 'tracker_match_players', 'GlobalMatch', 'GlobalMatchPlayer'];
        for (const t of tables) {
            try {
                const cols = await prisma.$queryRawUnsafe(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '${t}'
                `);
                console.log(`Table ${t} columns:`, cols.length);
            } catch (e) {
                console.log(`Table ${t} does not exist (uncased).`);
            }
            
            try {
                const cols = await prisma.$queryRawUnsafe(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '"${t}"'
                `);
                console.log(`Table "${t}" columns:`, cols.length);
            } catch (e) {
                console.log(`Table "${t}" does not exist (cased).`);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
check();
