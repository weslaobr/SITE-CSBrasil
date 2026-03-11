import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const matches = await prisma.match.findMany({
        where: { userId: 'cmmdtsywu000063jwfmi5m0oz' },
        orderBy: { matchDate: 'desc' },
        take: 3
    });
    console.log(JSON.stringify(matches, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
