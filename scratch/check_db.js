const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const matchId = 'manual_1';
        console.log(`--- Checking Match: ${matchId} ---`);
        
        const globalMatch = await prisma.globalMatch.findUnique({
            where: { id: matchId },
            include: { players: true }
        });
        
        if (globalMatch) {
            console.log("GlobalMatch found!");
            console.log(`Players count: ${globalMatch.players.length}`);
            console.table(globalMatch.players.map(p => ({ steamId: p.steamId, kills: p.kills })));
        } else {
            console.log("GlobalMatch NOT found!");
        }

        const trackerPlayers = await prisma.tracker_match_players.findMany({
            where: { match_id: matchId }
        });
        console.log(`TrackerPlayers count: ${trackerPlayers.length}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
