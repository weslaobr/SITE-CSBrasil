const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== SCHEMAS ===");
  const schemas = await prisma.$queryRaw`
    SELECT schema_name FROM information_schema.schemata 
    WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema'
  `;
  console.log(schemas);

  console.log("\n=== ALL TABLES ===");
  const tables = await prisma.$queryRaw`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT LIKE 'pg_%' AND table_schema != 'information_schema'
    ORDER BY table_schema, table_name
  `;
  console.log(tables);

  console.log("\n=== ROW COUNTS ===");
  for (const t of tables) {
    const fullName = `"${t.table_schema}"."${t.table_name}"`;
    try {
      const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${fullName}`);
      console.log(`${fullName}: ${countRes[0].count} rows`);
    } catch (e) {
      console.log(`Failed to get count for ${fullName}: ${e.message}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
