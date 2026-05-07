
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFields() {
    console.log('--- Tournament ---');
    try {
        await prisma.tournament.findFirst({ include: { TournamentMatch: true } });
        console.log('Tournament.TournamentMatch: OK');
    } catch (e) { console.log('Tournament.TournamentMatch: FAIL'); }

    try {
        await prisma.tournament.findFirst({ include: { matches: true } });
        console.log('Tournament.matches: OK');
    } catch (e) { console.log('Tournament.matches: FAIL'); }

    try {
        await prisma.tournament.findFirst({ include: { TournamentTeam: true } });
        console.log('Tournament.TournamentTeam: OK');
    } catch (e) { console.log('Tournament.TournamentTeam: FAIL'); }

    try {
        await prisma.tournament.findFirst({ include: { teams: true } });
        console.log('Tournament.teams: OK');
    } catch (e) { console.log('Tournament.teams: FAIL'); }
}

checkFields().finally(() => prisma.$disconnect());
