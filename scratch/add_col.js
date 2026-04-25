
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Adding column 'isAdmin' to 'User' table...");
        // Use raw SQL to add the column, wrapped in a try/catch in case it already exists
        await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN DEFAULT false');
        console.log("Column added successfully.");
    } catch (e) {
        console.log("Column might already exist or error occurred:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
