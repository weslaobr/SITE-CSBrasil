const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log("Testing GlobalMatch query...");
        const matches = await prisma.globalMatch.findMany({
            include: {
                GlobalMatchPlayer: {
                    include: {
                        User: {
                            select: {
                                name: true,
                                image: true,
                                steamId: true
                            }
                        }
                    }
                }
            },
            orderBy: { matchDate: 'desc' },
            take: 5
        });
        console.log(`Successfully fetched ${matches.length} matches.`);
        if (matches.length > 0) {
            console.log("First match GlobalMatchPlayer count:", matches[0].GlobalMatchPlayer.length);
        }
    } catch (e) {
        console.error("Query failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
