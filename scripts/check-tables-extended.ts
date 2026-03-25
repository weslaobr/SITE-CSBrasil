import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const db = await prisma.$queryRaw`SELECT current_database(), current_schema()`;
  console.log('Current context:', db);
  const tables = await prisma.$queryRaw`SELECT table_schema, table_name FROM information_schema.tables WHERE table_name ILIKE '%veto%'`;
  console.log('Relevant tables:', tables);
}
main().catch(console.error).finally(() => prisma.$disconnect());
