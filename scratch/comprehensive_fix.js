const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Utility function to get mix level (copied from codebase logic)
function getMixLevelFromPoints(points) {
    if (points >= 1000) return { level: 10, label: 'Lenda' };
    if (points >= 900)  return { level: 9,  label: 'Mestre' };
    if (points >= 800)  return { level: 8,  label: 'Elite' };
    if (points >= 700)  return { level: 7,  label: 'Diamante' };
    if (points >= 600)  return { level: 6,  label: 'Platina' };
    if (points >= 500)  return { level: 5,  label: 'Ouro' };
    if (points >= 400)  return { level: 4,  label: 'Prata' };
    if (points >= 300)  return { level: 3,  label: 'Bronze' };
    if (points >= 200)  return { level: 2,  label: 'Ferro' };
    return { level: 1, label: 'Iniciante' };
}

async function main() {
    const matchId = 'demo_dc5d64c6894fe35064dce1de';
    
    // Original eloChange values before my first fix attempt
    const originalEloChanges = {
        '76561198020546683': -3,  // One Lung
        '76561198144073356': -3,  // GFR
        '76561199387431535': -11, // jp123
        '76561198114408160': -10, // baba_irewole
        '76561198254133467': -3,  // weslao123
        '76561198293963459': -3,  // Fumabare
        '76561198125439704': -3,  // JamalzeraAA
        '76561199527141120': -4,  // Serio Memo?
        '76561198032908374': -3,  // f0rest
        '76561198168741793': -10  // Fazendo o pezinho
    };

    console.log(`Recalculating everything for match: ${matchId}`);

    const match = await prisma.globalMatch.findUnique({
        where: { id: matchId },
        include: { players: true }
    });

    if (!match) {
        console.log('Match not found');
        return;
    }

    for (const p of match.players) {
        const steamId = p.steamId;
        const oldEloChange = originalEloChanges[steamId] || 0;
        
        // Ensure result is correct (we already set winners to 'win' and losers to 'loss' in previous script)
        const result = p.matchResult.toLowerCase();
        const kills = p.kills || 0;
        const deaths = p.deaths || 0;
        const adr = p.adr || 0;
        const mvps = p.mvps || 0;
        const metadata = (p.metadata || {});
        const isSub = metadata.isSub === true;
        const isLeaver = metadata.isLeaver === true;

        let newEloChange = 0;
        if (isLeaver) {
            newEloChange = -15;
        } else {
            if (result === 'win')  newEloChange = 15;
            if (result === 'loss') newEloChange = -10;

            if (result === 'win' || result === 'loss') {
                if (kills > deaths)          newEloChange += 2;
                else if (deaths > kills + 3) newEloChange -= 2;
                if (adr > 90)                newEloChange += 3;
                else if (adr < 50)           newEloChange -= 2;
                newEloChange += mvps * 1;
            }

            if (isSub) {
                newEloChange = Math.round(newEloChange * 0.5);
            }
        }

        console.log(`Player ${steamId}: result=${result}, K=${kills} D=${deaths} ADR=${adr}, oldElo=${oldEloChange}, newElo=${newEloChange}`);

        // Update GlobalMatchPlayer
        await prisma.globalMatchPlayer.update({
            where: { id: p.id },
            data: { 
                matchResult: result, // Reinforcing just in case
                eloChange: newEloChange 
            }
        });

        // Update User rankingPoints
        if (p.userId) {
            const user = await prisma.user.findUnique({ where: { id: p.userId } });
            if (user) {
                const diff = newEloChange - oldEloChange;
                const newPoints = Math.max(0, (user.rankingPoints ?? 500) + diff);
                const newLevel = getMixLevelFromPoints(newPoints).level;

                console.log(`Updating User ${user.name} (${user.id}): Points ${user.rankingPoints} -> ${newPoints}, Level -> ${newLevel}`);

                await prisma.user.update({
                    where: { id: p.userId },
                    data: { 
                        rankingPoints: newPoints,
                        mixLevel: newLevel
                    }
                });
            }
        }
    }

    console.log('Fix complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
