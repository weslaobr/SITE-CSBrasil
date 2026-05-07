
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserFields() {
    try {
        const user = await prisma.user.findFirst({
            include: { Match: true }
        });
        console.log('Successfully fetched User with include: { Match: true }');
    } catch (e) {
        console.log('Failed to fetch User with include: { Match: true }:', e.message);
    }

    try {
        const user = await prisma.user.findFirst({
            include: { matches: true }
        });
        console.log('Successfully fetched User with include: { matches: true }');
    } catch (e) {
        console.log('Failed to fetch User with include: { matches: true }:', e.message);
    }
}

checkUserFields().finally(() => prisma.$disconnect());
