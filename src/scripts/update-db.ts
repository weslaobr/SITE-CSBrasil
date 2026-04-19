import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking and adding columns to tracker.tracker_matches...");
        
        // Add demo_url and source columns if they don't exist
        await prisma.$executeRawUnsafe(`
            ALTER TABLE tracker.tracker_matches 
            ADD COLUMN IF NOT EXISTS demo_url TEXT,
            ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'vanilla';
        `);
        
        console.log("Database schema updated successfully.");
    } catch (error) {
        console.error("Error updating database schema:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
