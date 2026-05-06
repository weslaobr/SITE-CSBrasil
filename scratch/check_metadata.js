
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const players = await prisma.globalMatchPlayer.findMany({
            take: 10,
            orderBy: { id: 'desc' },
            select: {
                id: true,
                metadata: true,
                globalMatchId: true,
                steamId: true
            }
        });
        
        players.forEach(p => {
            console.log(`Player ID: ${p.id}, Match ID: ${p.globalMatchId}, SteamID: ${p.steamId}`);
            console.log(`Metadata keys: ${Object.keys(p.metadata || {}).join(', ')}`);
            if (p.metadata) {
                console.log(`Impact: ${p.metadata.impact}, Impact Rating: ${p.metadata.impact_rating}, impactRating: ${p.metadata.impactRating}`);
            }
            console.log('---');
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
