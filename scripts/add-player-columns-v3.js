const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Adding columns to Player table (schema-aware)...");
    const sql = `
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Player' AND column_name='steamName') THEN
              ALTER TABLE public."Player" ADD COLUMN "steamName" TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Player' AND column_name='steamAvatar') THEN
              ALTER TABLE public."Player" ADD COLUMN "steamAvatar" TEXT;
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
