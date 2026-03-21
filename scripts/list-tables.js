const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log("Tables in DB:");
    console.dir(tables, { depth: null });
  } catch (error) {
    console.error("Error listing tables:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
