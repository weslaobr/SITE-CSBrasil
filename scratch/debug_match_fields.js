const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.globalMatch.findUnique({
    where: { id: 'manual_1' },
    select: {
        id: true, mapName: true, source: true, matchDate: true,
        scoreA: true, scoreB: true, metadata: true
    }
}).then(m => {
    console.log('=== GlobalMatch: manual_1 ===');
    console.log('mapName:', m.mapName);
    console.log('source:', m.source);
    console.log('matchDate:', m.matchDate);
    console.log('scoreA:', m.scoreA, '| scoreB:', m.scoreB);
    const meta = m.metadata || {};
    console.log('\nMetadata keys:', Object.keys(meta));
    console.log('meta.duration:', meta.duration);
    console.log('meta.mapName:', meta.mapName);
    console.log('meta.demoUrl:', meta.demoUrl);
    // Pegar sample de um player para ver matchResult
    return p.globalMatchPlayer.findFirst({
        where: { globalMatchId: 'manual_1' },
        select: { matchResult: true, metadata: true }
    });
}).then(pl => {
    console.log('\n=== GlobalMatchPlayer (sample) ===');
    console.log('matchResult:', pl?.matchResult);
    const m = pl?.metadata || {};
    console.log('metadata keys:', Object.keys(m));
}).catch(console.error).finally(() => p.$disconnect());
