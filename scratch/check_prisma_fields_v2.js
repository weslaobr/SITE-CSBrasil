
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFields() {
    console.log('--- User ---');
    try {
        await prisma.user.findFirst({ include: { Match: true } });
        console.log('User.Match: OK');
    } catch (e) { console.log('User.Match: FAIL'); }

    try {
        await prisma.user.findFirst({ include: { matches: true } });
        console.log('User.matches: OK');
    } catch (e) { console.log('User.matches: FAIL'); }

    console.log('\n--- GlobalMatchPlayer ---');
    try {
        await prisma.globalMatchPlayer.findFirst({ include: { GlobalMatch: true } });
        console.log('GlobalMatchPlayer.GlobalMatch: OK');
    } catch (e) { console.log('GlobalMatchPlayer.GlobalMatch: FAIL'); }

    try {
        await prisma.globalMatchPlayer.findFirst({ include: { match: true } });
        console.log('GlobalMatchPlayer.match: OK');
    } catch (e) { console.log('GlobalMatchPlayer.match: FAIL'); }
}

checkFields().finally(() => prisma.$disconnect());
