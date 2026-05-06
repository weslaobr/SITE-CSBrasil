
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Adding impact column to tracker_match_players...');
        await prisma.$executeRawUnsafe(`
            ALTER TABLE public.tracker_match_players 
            ADD COLUMN IF NOT EXISTS impact DOUBLE PRECISION DEFAULT 0;
        `);
        console.log('Success!');
    } catch (err) {
        console.error('Error adding column:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
