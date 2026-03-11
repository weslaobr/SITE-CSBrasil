import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            steamId: true,
            faceitNickname: true
        }
    });

    for (const user of users) {
        const steamCount = await prisma.match.count({
            where: { userId: user.id, source: 'Steam' }
        });
        const faceitCount = await prisma.match.count({
            where: { userId: user.id, source: 'Faceit' }
        });

        console.log(`User: ${user.name || 'Unknown'} (${user.id})`);
        console.log(`- Steam Matches: ${steamCount}`);
        console.log(`- Faceit Matches: ${faceitCount}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
