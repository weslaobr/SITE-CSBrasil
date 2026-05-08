
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log("--- Checking for duplicate kill events ---");
  try {
    const result = await prisma.$queryRaw`
      SELECT match_id, round_id, tick, attacker_steamid, victim_steamid, COUNT(*) 
      FROM public.tracker_kill_events 
      GROUP BY match_id, round_id, tick, attacker_steamid, victim_steamid 
      HAVING COUNT(*) > 1 
      LIMIT 10
    `;
    console.log("Duplicate samples:", result);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();
