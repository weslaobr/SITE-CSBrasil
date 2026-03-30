const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const steamId = '76561198024691636';
    console.log(`Checking GlobalMatchPlayer data for SteamID: ${steamId}`);
    
    try {
        const results = await prisma.globalMatchPlayer.findMany({
            where: { steamId: steamId },
            include: {
                match: true
            },
            orderBy: {
                match: {
                    matchDate: 'desc'
                }
            },
            take: 3
        });

        if (results.length === 0) {
            console.log('No matches found for this user in GlobalMatchPlayer table.');
            return;
        }

        results.forEach((res, i) => {
            console.log(`\n--- Match ${i + 1} ---`);
            console.log(`Match ID: ${res.match.id}`);
            console.log(`Date: ${res.match.matchDate}`);
            console.log(`Source: ${res.match.source}`);
            console.log(`K/D/A: ${res.kills}/${res.deaths}/${res.assists}`);
            console.log(`Metadata:`, JSON.stringify(res.metadata, null, 2));
        });
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
