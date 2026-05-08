
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInf() {
  console.log("--- Fixing invalid float values using Prisma row-by-row ---");
  try {
    const players = await prisma.globalMatchPlayer.findMany({
      select: { id: true }
    });
    console.log(`Checking ${players.length} global match players...`);
    
    let fixed = 0;
    for (const p of players) {
      try {
        // Try to fetch the full record
        await prisma.globalMatchPlayer.findUnique({
          where: { id: p.id },
          select: { adr: true }
        });
      } catch (e) {
        if (e.message.includes('Could not convert value inf') || e.message.includes('Inconsistent column data')) {
          console.log(`Found invalid ADR for record ${p.id}. Resetting to 0...`);
          // Use raw SQL to fix this specific record by ID
          await prisma.$executeRawUnsafe(`UPDATE "GlobalMatchPlayer" SET adr = 0 WHERE id = '${p.id}'`);
          fixed++;
        }
      }
    }
    
    console.log(`Finished. Fixed ${fixed} records.`);
  } catch (e) {
    console.error("Critical error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

fixInf();
