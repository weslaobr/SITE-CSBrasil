const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function checkMatch() {
    try {
        const m = await p.globalMatch.findUnique({
            where: { id: 'manual_1' },
            include: { players: true }
        });

        console.log("=== Match: manual_1 ===");
        console.log(`scoreA (Team 3/CT): ${m.scoreA}`);
        console.log(`scoreB (Team 2/T):  ${m.scoreB}`);
        console.log(`mapName: ${m.mapName}`);
        console.log("=== Players ===");
        m.players.forEach(pl => {
            console.log(`SteamID: ${pl.steamId} | Team: ${pl.team} | Result: ${pl.matchResult}`);
        });
    } finally {
        await p.$disconnect();
    }
}
checkMatch();
