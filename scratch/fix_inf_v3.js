
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInf() {
  console.log("--- Fixing invalid float values using case-insensitive table names ---");
  try {
    // We'll try to find the correct table name by querying information_schema
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name ILIKE 'GlobalMatchPlayer' OR table_name ILIKE 'Match')
    `);
    
    console.log("Found tables:", tables);
    
    for (const t of tables) {
      const tableName = t.table_name;
      console.log(`Fixing table: ${tableName}`);
      const count = await prisma.$executeRawUnsafe(`
        UPDATE "${tableName}" 
        SET adr = 0 
        WHERE adr::text = 'Infinity' OR adr::text = '-Infinity' OR adr::text = 'NaN' OR adr::text = 'inf'
      `);
      console.log(`Updated ${count} rows in ${tableName}`);
    }
    
    console.log("--- Cleanup complete ---");
  } catch (e) {
    console.error("Critical error during cleanup:", e);
  } finally {
    await prisma.$disconnect();
  }
}

fixInf();
