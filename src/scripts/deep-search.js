const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const target = '7e9536ca-9c1a-48bf-8751-f412fe423925';
        console.log(`Searching for ${target}...`);
        
        // Search in tracker_matches (tracker schema)
        const trackerMatches = await prisma.$queryRawUnsafe(`
            SELECT * FROM tracker.tracker_matches 
            WHERE match_id = $1 OR demo_url LIKE $2
        `, target, `%${target}%`);
        
        console.log("Tracker search results:", JSON.stringify(trackerMatches, null, 2));
        
        // Search in GlobalMatch (public schema)
        const globalMatches = await prisma.$queryRawUnsafe(`
            SELECT * FROM public."GlobalMatch" 
            WHERE id = $1 OR CAST(metadata AS TEXT) LIKE $2
        `, target, `%${target}%`);
        
        console.log("GlobalMatch search results:", JSON.stringify(globalMatches, null, 2));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
