
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.globalMatchPlayer.count({
            where: {
                OR: [
                    { metadata: { path: ['impact'], not: null } },
                    { metadata: { path: ['impact_rating'], not: null } },
                    { metadata: { path: ['impactRating'], not: null } },
                    { metadata: { path: ['ratings', 'impact'], not: null } }
                ]
            }
        });
        console.log(`Players with impact in metadata: ${count}`);
        
        const first = await prisma.globalMatchPlayer.findFirst({
            where: {
                OR: [
                    { metadata: { path: ['impact'], not: null } },
                    { metadata: { path: ['impact_rating'], not: null } },
                    { metadata: { path: ['impactRating'], not: null } }
                ]
            },
            select: { metadata: true, globalMatchId: true }
        });
        
        if (first) {
            console.log(`Found one! Match ${first.globalMatchId}`);
            console.log(JSON.stringify(first.metadata, null, 2).substring(0, 500));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
