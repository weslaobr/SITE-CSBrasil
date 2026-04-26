import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'tracker%';
  `);

  console.log("--- TRACKER TABLES IN PUBLIC SCHEMA ---");
  console.log(JSON.stringify(tables, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
