const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Adding columns to Player table using compatible SQL...");
    const sql = `
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Player' AND column_name='steamName') THEN
              ALTER TABLE "Player" ADD COLUMN "steamName" TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Player' AND column_name='steamAvatar') THEN
              ALTER TABLE "Player" ADD COLUMN "steamAvatar" TEXT;
          END IF;
      END $$;
    `;
    await prisma.$executeRawUnsafe(sql);
    console.log("Columns added successfully!");
  } catch (error) {
    console.error("Error adding columns:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
