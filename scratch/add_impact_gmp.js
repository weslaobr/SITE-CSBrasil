
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Adding impact column to GlobalMatchPlayer...');
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='GlobalMatchPlayer' AND column_name='impact') THEN
                    ALTER TABLE public."GlobalMatchPlayer" ADD COLUMN impact DOUBLE PRECISION DEFAULT 0;
                END IF;
            END $$;
        `);
        console.log('Success!');
    } catch (err) {
        console.error('Error adding column:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
