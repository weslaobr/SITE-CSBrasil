
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const variations = [
        'ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN DEFAULT false',
        'ALTER TABLE public."User" ADD COLUMN "isAdmin" BOOLEAN DEFAULT false',
        'ALTER TABLE user ADD COLUMN isAdmin BOOLEAN DEFAULT false',
        'ALTER TABLE "user" ADD COLUMN "isAdmin" BOOLEAN DEFAULT false'
    ];

    for (const sql of variations) {
        try {
            console.log(`Trying: ${sql}`);
            await prisma.$executeRawUnsafe(sql);
            console.log("Success!");
            break;
        } catch (e) {
            console.log(`Failed: ${e.message}`);
        }
    }
    await prisma.$disconnect();
}

main();
