const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const target = '7e9536ca-9c1a-48bf-8751-f412fe423925';
        // Try queryRaw to search across tracker.tracker_matches by stringifying rows
        // This is a hacky way to find it if we don't know the column
        const matches = await prisma.$queryRawUnsafe(`
            SELECT * FROM tracker.tracker_matches 
            WHERE CAST(match_id AS TEXT) LIKE $1 
               OR CAST(demo_url AS TEXT) LIKE $1
        `, `%${target}%`);
        
        console.log("Found in tracker_matches:", JSON.stringify(matches, null, 2));
    } catch (error) {
        console.error("Error searching in tracker:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
