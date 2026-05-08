
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInf() {
  console.log("--- Fixing invalid float values using schema-qualified SQL ---");
  try {
    const tables = ['Match', 'GlobalMatchPlayer'];
    
    for (const tableName of tables) {
      console.log(`Fixing table: public."${tableName}"`);
      const count = await prisma.$executeRawUnsafe(`
        UPDATE public."${tableName}" 
        SET adr = 0 
        WHERE adr::text = 'Infinity' OR adr::text = '-Infinity' OR adr::text = 'NaN' OR adr::text = 'inf'
      `);
      console.log(`Successfully updated ${count} rows in ${tableName}`);
    }
    
    console.log("--- Cleanup complete ---");
  } catch (e) {
    console.error("Critical error during cleanup:", e);
  } finally {
    await prisma.$disconnect();
  }
}

fixInf();
