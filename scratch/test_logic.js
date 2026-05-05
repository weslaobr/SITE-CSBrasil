const axios = require('axios');

async function testApi() {
    try {
        // We can't call localhost:3000 if it's not running, 
        // but we can try to find the match manually via Prisma and see what the logic would do.
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        const matchId = 'manual_1';
        const localMatch = await prisma.globalMatch.findUnique({
            where: { id: matchId },
            include: { players: true }
        });

        if (!localMatch) {
            console.log("Match not found in DB");
            return;
        }

        const trackerPlayers = await prisma.tracker_match_players.findMany({
            where: { match_id: matchId }
        });

        console.log("Match Scores:", localMatch.scoreA, localMatch.scoreB);
        console.log("Players count:", localMatch.players.length);
        console.log("Tracker records:", trackerPlayers.length);

        const localStats = localMatch.players.map(p => ({
            name: p.nickname || "Jogador",
            steam64_id: p.steamId,
            kills: p.kills || 0,
            // ...
        }));

        const mergedStats = localStats.map(ls => {
            const tp = trackerPlayers.find(t => String(t.steamid64) === String(ls.steam64_id));
            if (tp) {
                return { ...ls, foundTracker: true, kills: tp.kills };
            }
            return { ...ls, foundTracker: false };
        });

        console.log("Merged Stats Samples:", mergedStats.slice(0, 2));

    } catch (e) {
        console.error(e);
    }
}

testApi();
