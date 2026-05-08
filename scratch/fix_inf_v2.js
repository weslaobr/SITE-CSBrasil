
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInf() {
  console.log("--- Checking for invalid float values in the database ---");
  try {
    // We try multiple table name variations just in case
    const tables = ['GlobalMatchPlayer', 'globalmatchplayer', 'Match', 'match'];
    
    for (const table of tables) {
      try {
        console.log(`Trying to fix table: ${table}`);
        const count = await prisma.$executeRawUnsafe(`
          UPDATE "${table}" 
          SET adr = 0 
          WHERE adr::text = 'Infinity' OR adr::text = '-Infinity' OR adr::text = 'NaN' OR adr::text = 'inf'
        `);
        console.log(`Successfully updated ${count} rows in ${table}`);
      } catch (e) {
        console.warn(`Could not update ${table}: ${e.message}`);
      }
    }
    
    console.log("--- Cleanup complete ---");
  } catch (e) {
    console.error("Critical error during cleanup:", e);
  } finally {
    await prisma.$disconnect();
  }
}

fixInf();
