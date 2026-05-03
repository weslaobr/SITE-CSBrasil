
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function detectPlatform(source, gameMode) {
    const src = (source || '').toLowerCase();
    const mode = (gameMode || '').toLowerCase();
    if (['mix', 'demo', 'local'].some(s => src.includes(s))) return 'mix';
    if (['mix', 'demo', 'local'].some(s => mode.includes(s))) return 'mix';
    return 'other';
}

async function main() {
    const users = await prisma.user.findMany({
        include: {
            matches: {
                select: { id: true, externalId: true, mapName: true, matchDate: true, source: true, gameMode: true }
            }
        }
    });

    const results = [];

    for (const user of users) {
        const globalMatches = await prisma.globalMatchPlayer.findMany({
            where: { steamId: user.steamId },
            include: { match: true }
        });

        if (globalMatches.length === 0 && user.matches.length === 0) continue;

        const processedKeys = new Set();
        let uniqueMix = 0;
        let rawMix = 0;

        const allRaw = [
            ...globalMatches.map(g => ({
                id: g.match.id,
                externalId: g.match.externalId,
                map: g.match.mapName,
                date: g.match.matchDate,
                source: g.match.source,
                gameMode: g.match.gameMode
            })),
            ...user.matches.map(m => ({
                id: m.id,
                externalId: m.externalId,
                map: m.mapName,
                date: m.matchDate,
                source: m.source,
                gameMode: m.gameMode
            }))
        ];

        allRaw.forEach(m => {
            if (detectPlatform(m.source, m.gameMode) === 'mix') {
                rawMix++;
                const normId = String(m.externalId || m.id).replace('leetify-', '').replace('manual-', '');
                const timeBin = Math.floor(new Date(m.date).getTime() / (120 * 60 * 1000));
                const mapKey = (m.map || '').toLowerCase().replace('de_', '').trim();
                const key = normId ? `id_${normId}` : `time_${mapKey}_${timeBin}`;
                
                if (!processedKeys.has(key)) {
                    processedKeys.add(key);
                    uniqueMix++;
                }
            }
        });

        if (rawMix !== uniqueMix) {
            results.push({
                steamId: user.steamId,
                name: user.nickname,
                rawMix,
                uniqueMix,
                diff: rawMix - uniqueMix
            });
        }
    }

    console.log('--- USERS WITH DUPLICATED MIX MATCHES ---');
    console.table(results.sort((a, b) => b.diff - a.diff));
    console.log(`Total users checked: ${users.length}`);
    console.log(`Users with duplicates: ${results.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
