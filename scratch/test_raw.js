const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const queries = [
    `SELECT count(*) FROM "tracker_match_players"`,
    `SELECT count(*) FROM tracker_match_players`,
    `SELECT count(*) FROM "public"."tracker_match_players"`,
    `SELECT count(*) FROM "tracker"."tracker_match_players"`,
  ];

  for (const q of queries) {
    try {
      console.log(`Running: ${q}`);
      const res = await prisma.$queryRawUnsafe(q);
      console.log(`Success! Result:`, res);
    } catch (e) {
      console.log(`Failed: ${e.message}\n`);
    }
  }
}

main().finally(() => prisma.$disconnect());
