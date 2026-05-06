const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function fixMatches() {
    console.log("Fixing matches...");
    try {
        const matches = await p.globalMatch.findMany({
            where: { mapName: 'Desconhecido' },
            include: { players: true }
        });

        for (const m of matches) {
            const meta = m.metadata || {};
            let newMapName = m.mapName;
            
            // Fix map name
            if (meta.demoUrl) {
                try {
                    const tokenMatch = meta.demoUrl.match(/token=([^&]+)/);
                    if (tokenMatch) {
                        const payloadBase64 = tokenMatch[1].split('.')[1];
                        if (payloadBase64) {
                            let b64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
                            while (b64.length % 4) b64 += '=';
                            const payload = Buffer.from(b64, 'base64').toString('utf-8');
                            const mapMatch = payload.match(/_(de_[a-zA-Z0-9]+|cs_[a-zA-Z0-9]+)_/i);
                            if (mapMatch) newMapName = mapMatch[1];
                        }
                    }
                } catch (e) {
                    console.log("Failed to parse jwt for map", e.message);
                }
            }

            if (newMapName !== m.mapName) {
                await p.globalMatch.update({
                    where: { id: m.id },
                    data: { mapName: newMapName }
                });
                console.log(`Updated map for ${m.id} to ${newMapName}`);
            }

            // Fix results for players if missing or 'tie'
            const scoreA = m.scoreA ?? 0;
            const scoreB = m.scoreB ?? 0;
            for (const pl of m.players) {
                if (!pl.matchResult || pl.matchResult === 'tie') {
                    const isA = !['B','T','2'].includes(String(pl.team || '').toUpperCase());
                    const myScore = isA ? scoreA : scoreB;
                    const theirScore = isA ? scoreB : scoreA;
                    const result = myScore > theirScore ? 'win' : myScore < theirScore ? 'loss' : 'tie';
                    if (result !== pl.matchResult) {
                        await p.globalMatchPlayer.update({
                            where: { id: pl.id },
                            data: { matchResult: result }
                        });
                        console.log(`Updated player ${pl.steamId} result to ${result}`);
                    }
                }
            }
        }
        console.log("Done fixing matches");
    } finally {
        await p.$disconnect();
    }
}
fixMatches();
