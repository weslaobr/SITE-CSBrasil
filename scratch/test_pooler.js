const { PrismaClient } = require('@prisma/client');

async function main() {
  const url = "postgres://postgres.qjgmqlhlrzvmilanqldw:ALpndxFObhEupjbK@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true";
  
  console.log("Testing connection to: " + url.replace("ALpndxFObhEupjbK", "****"));
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });

  try {
    const count = await prisma.user.count();
    console.log("Connection successful! Users count:", count);
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
