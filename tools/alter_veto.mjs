import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Adding timerStart column...");
    // PostgreSQL doesn't support ADD COLUMN IF NOT EXISTS in some versions, use DO block
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'MapVetoLobby' 
          AND column_name = 'timerStart'
        ) THEN
          ALTER TABLE public."MapVetoLobby" ADD COLUMN "timerStart" TIMESTAMP(3);
        END IF;
      END $$;
    `);
    console.log("Done!");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
