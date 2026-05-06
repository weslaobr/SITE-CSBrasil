
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const players = await prisma.globalMatchPlayer.findMany({
            where: { globalMatchId: { startsWith: 'leetify-' } },
            take: 10,
            select: {
                id: true,
                metadata: true,
                globalMatchId: true,
                steamId: true
            }
        });
        
        if (players.length === 0) {
            // Try without prefix
            const allPlayers = await prisma.globalMatchPlayer.findMany({
                take: 50,
                select: {
                    id: true,
                    metadata: true,
                    globalMatchId: true,
                    steamId: true
                }
            });
            allPlayers.forEach(p => {
                if (p.metadata && (p.metadata.impact || p.metadata.impact_rating || p.metadata.impactRating)) {
                    console.log(`FOUND IMPACT: Match ${p.globalMatchId}, Player ${p.steamId}`);
                    console.log(`Impact: ${p.metadata.impact}, Impact Rating: ${p.metadata.impact_rating}, impactRating: ${p.metadata.impactRating}`);
                }
            });
        } else {
            players.forEach(p => {
                console.log(`Player ID: ${p.id}, Match ID: ${p.globalMatchId}`);
                if (p.metadata) {
                    console.log(`Impact: ${p.metadata.impact}, Impact Rating: ${p.metadata.impact_rating}, impactRating: ${p.metadata.impactRating}`);
                }
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
