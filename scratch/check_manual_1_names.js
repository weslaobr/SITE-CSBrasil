const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function checkNamesDB() {
    try {
        const m = await p.globalMatch.findUnique({
            where: { id: 'manual_1' },
            include: { players: true }
        });

        const steamIds = m.players.map(p => p.steamId);
        const users = await p.user.findMany({ where: { steamId: { in: steamIds } } });
        const players = await p.player.findMany({ where: { steamId: { in: steamIds } } });

        const getName = (id) => {
            const u = users.find(u => u.steamId === id);
            const pl = players.find(p => p.steamId === id);
            return (u && u.name) || (pl && pl.faceitName) || id;
        };

        console.log("=== TIME 3 (CT) / SCORE A: 3 / RESULTADO: DERROTA ===");
        m.players.filter(pl => String(pl.team) === '3').forEach(pl => {
            console.log(`- ${getName(pl.steamId)} (SteamID: ${pl.steamId})`);
        });

        console.log("\n=== TIME 2 (TR) / SCORE B: 13 / RESULTADO: VITÓRIA ===");
        m.players.filter(pl => String(pl.team) === '2').forEach(pl => {
            console.log(`- ${getName(pl.steamId)} (SteamID: ${pl.steamId})`);
        });
    } finally {
        await p.$disconnect();
    }
}
checkNamesDB();
