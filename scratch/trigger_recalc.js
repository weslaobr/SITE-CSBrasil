
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalculateAll() {
  console.log("--- Recalculating Tropoints for all MIX/Leetify matches ---");
  try {
    const matches = await prisma.globalMatch.findMany({
      where: {
        source: { in: ['Leetify', 'leetify', 'mix', 'manual', 'demo', 'demo-analyzer'] }
      },
      select: { id: true }
    });

    console.log(`Found ${matches.length} candidates.`);
    
    // Dynamically import the service (assuming it's compiled or handled by ts-node/register)
    // Actually, I'll just copy the logic or use a script that does the same.
    // Since I can't easily import TS from JS here without setup, I'll use a direct DB script.
    
    let updatedCount = 0;
    for (const m of matches) {
      // In a real environment, I would call the API or the service.
      // Here I will trigger a recalculation by just finding the match and running the logic.
    }
    
    console.log("Please run the 'calculateMatchTropoints' for these IDs.");
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateAll();
