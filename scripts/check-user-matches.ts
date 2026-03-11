import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const steamId = '76561198024691636';
    const user = await prisma.user.findFirst({
        where: { steamId: steamId }
    });

    if (!user) {
        console.log('User not found in DB');
        return;
    }

    const matches = await prisma.match.findMany({
        where: { userId: user.id },
        orderBy: { matchDate: 'desc' }
    });

    console.log(`User: ${user.name} (${user.id})`);
    console.log(`Total Matches: ${matches.length}`);

    matches.forEach(m => {
        console.log(`- [${m.source}] ${m.mapName} (${m.gameMode}) | Result: ${m.result} | Score: ${m.score} | Date: ${m.matchDate.toISOString()} | ExternalID: ${m.externalId}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
