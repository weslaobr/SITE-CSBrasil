const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking and adding columns to tracker.tracker_matches...");
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='tracker' AND table_name='tracker_matches' AND column_name='demo_url') THEN
                    ALTER TABLE tracker.tracker_matches ADD COLUMN demo_url TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='tracker' AND table_name='tracker_matches' AND column_name='source') THEN
                    ALTER TABLE tracker.tracker_matches ADD COLUMN source TEXT DEFAULT 'vanilla';
                END IF;
            END $$;
        `);
        console.log("Database schema updated successfully.");
    } catch (error) {
        console.error("Error updating database schema:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
