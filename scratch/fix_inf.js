
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInf() {
  console.log("--- Checking for 'inf' values in GlobalMatchPlayer ---");
  try {
    // Prisma might not be able to even query these rows via findMany, 
    // so we use raw SQL to find and fix them.
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "GlobalMatchPlayer" 
      SET adr = 0 
      WHERE adr = 'Infinity' OR adr = '-Infinity' OR adr::text = 'Infinity' OR adr::text = 'NaN'
    `);
    
    console.log(`Updated ${result} rows with invalid ADR values.`);
  } catch (e) {
    console.error("Error during fix:", e);
  } finally {
    await prisma.$disconnect();
  }
}

fixInf();
