
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name = 'Match' OR table_name = 'GlobalMatchPlayer'
  `);
  console.log(result);
}

checkSchema().finally(() => prisma.$disconnect());
