
import { prisma } from './src/lib/prisma';

async function main() {
    const matches = await prisma.match.findMany({
        take: 10,
        orderBy: { matchDate: 'desc' }
    });
    console.log(JSON.stringify(matches, null, 2));
}

main();
