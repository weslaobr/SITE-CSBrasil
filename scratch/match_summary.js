const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const matchId = 'demo_dc5d64c6894fe35064dce1de';
    const globalMatch = await prisma.globalMatch.findUnique({
        where: { id: matchId },
        include: { players: true }
    });

    if (!globalMatch) {
        console.log('Match not found');
        return;
    }

    console.log(`Match ID: ${globalMatch.id}`);
    console.log(`Score: ${globalMatch.scoreA} - ${globalMatch.scoreB}`);
    
    const players = globalMatch.players.map(p => ({
        name: p.metadata.name || p.steamId,
        team: p.team,
        result: p.matchResult,
        kills: p.kills,
        deaths: p.deaths
    }));

    console.log('Players:');
    players.forEach(p => {
        console.log(`- ${p.name} (${p.team}): ${p.result} [K:${p.kills} D:${p.deaths}]`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
