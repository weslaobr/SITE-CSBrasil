const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMatch() {
    const matchId = 'cmolja6vc0001i262jtq021fj';
    
    // Check GlobalMatch
    const gm = await prisma.globalMatch.findUnique({ where: { id: matchId } });
    if (gm) console.log('GlobalMatch found:', gm.id);
    
    // Check Match
    try {
        const m = await prisma.match.findUnique({ where: { id: matchId } });
        if (m) {
            console.log('Match found in Match table:');
            console.log('ID:', m.id);
            console.log('External ID:', m.externalId);
            console.log('Source:', m.source);
        }
    } catch (e) {
        console.error('Error checking Match table:', e.message);
    }

    await prisma.$disconnect();
}

checkMatch();
