import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT match_id, steamid64, kast, adr, rating 
    FROM tracker.tracker_match_players 
    LIMIT 10;
  `);

  console.log("--- TRACKER STATS ---");
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
