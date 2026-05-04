const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const matchId = 'demo_dc5d64c6894fe35064dce1de';
    
    console.log(`Fixing match: ${matchId}`);

    // Winners (Unknown team)
    const winnersUpdate = await prisma.globalMatchPlayer.updateMany({
        where: {
            globalMatchId: matchId,
            team: 'Unknown'
        },
        data: {
            matchResult: 'win',
            eloChange: 15 // Giving +15 ELO for the win
        }
    });
    console.log(`Updated ${winnersUpdate.count} winners.`);

    // Losers (CT team) - keeping them as loss, but ensuring eloChange is negative
    const losersUpdate = await prisma.globalMatchPlayer.updateMany({
        where: {
            globalMatchId: matchId,
            team: 'CT'
        },
        data: {
            matchResult: 'loss',
            eloChange: -15 // Setting -15 ELO for the loss
        }
    });
    console.log(`Updated ${losersUpdate.count} losers.`);

    // Check if there are any players with team 'T' or others
    const others = await prisma.globalMatchPlayer.findMany({
        where: {
            globalMatchId: matchId,
            NOT: [
                { team: 'Unknown' },
                { team: 'CT' }
            ]
        }
    });
    if (others.length > 0) {
        console.log(`Found ${others.length} other players. Investigating...`);
        for (const p of others) {
            console.log(`Player: ${p.metadata?.name || p.steamId}, Team: ${p.team}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
