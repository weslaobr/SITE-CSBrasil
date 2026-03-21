const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Adding columns to Player table...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "steamName" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "steamAvatar" TEXT`);
    console.log("Columns added successfully!");
  } catch (error) {
    console.error("Error adding columns:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
