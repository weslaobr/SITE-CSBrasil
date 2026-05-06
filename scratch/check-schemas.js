const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchemas() {
  console.log('Checking GlobalMatchPlayer fields:');
  // We can't directly list columns with Prisma, but we can try to find one record
  const p = await prisma.globalMatchPlayer.findFirst();
  if (p) {
    console.log(Object.keys(p));
  } else {
    console.log('No GlobalMatchPlayer records found to inspect');
  }
}

checkSchemas().catch(console.error).finally(() => prisma.$disconnect());
