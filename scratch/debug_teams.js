const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.globalMatchPlayer.findMany({
    where: { globalMatchId: 'manual_1' },
    select: { id: true, steamId: true, team: true, metadata: true }
}).then(rows => {
    console.log('=== Jogadores e seus times ===');
    rows.forEach(r => {
        const meta = r.metadata || {};
        console.log(`  ${r.steamId} → team="${r.team}" | meta.team="${meta.team}" | meta.name="${meta.name}"`);
    });
}).catch(console.error).finally(() => p.$disconnect());
