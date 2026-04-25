const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tables = await prisma.$queryRawUnsafe(`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`);
    console.log('Tabelas encontradas:', JSON.stringify(tables, null, 2));
  } catch (e) {
    console.error('Erro ao listar tabelas:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
