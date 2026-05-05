const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Ver como a API retorna os nomes + verificar tabela tracker_players
async function check() {
    // 1. Ver campos de nome nos GlobalMatchPlayers
    const players = await p.globalMatchPlayer.findMany({
        where: { globalMatchId: 'manual_1' },
        select: { steamId: true, metadata: true }
    });

    console.log('=== GlobalMatchPlayer metadata ===');
    players.forEach(pl => {
        const m = pl.metadata || {};
        console.log(`steamId: ${pl.steamId}`);
        console.log(`  metadata keys: ${Object.keys(m).join(', ') || '(vazio)'}`);
        console.log(`  m.name=${m.name}, m.nickname=${m.nickname}, m.playerNickname=${m.playerNickname}`);
    });

    // 2. Ver tabela tracker_players para nomes
    try {
        const trackerPlayers = await p.$queryRaw`
            SELECT steamid64, persona_name FROM tracker_players LIMIT 10
        `;
        console.log('\n=== tracker_players (persona_name) ===');
        trackerPlayers.forEach(tp => console.log(`  ${tp.steamid64} → ${tp.persona_name}`));
    } catch(e) {
        console.log('\ntracker_players query failed:', e.message);
    }
}

check().catch(console.error).finally(() => p.$disconnect());
