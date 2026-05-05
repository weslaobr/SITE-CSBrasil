const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.globalMatchPlayer.findFirst({ orderBy: { id: 'desc' } }).then(r => {
    console.log('=== GlobalMatchPlayer ===');
    console.log('GlobalMatchPlayer.id (UUID):', r.id);
    console.log('GlobalMatchPlayer.globalMatchId (match id):', r.globalMatchId);
    console.log('');
    console.log('PROBLEMA: A /api/matches retorna id=gmp.id, mas /api/match/[id] busca por GlobalMatch.id = gmp.globalMatchId');
    console.log('FIX: Modal deve receber globalMatchId, não gmp.id');
}).catch(e => console.error(e)).finally(() => p.$disconnect());
