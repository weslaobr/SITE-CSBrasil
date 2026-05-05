const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.globalMatch.findUnique({
    where: { id: 'manual_1' },
    select: { id: true, mapName: true, metadata: true }
}).then(m => console.log(m)).finally(() => p.$disconnect());
