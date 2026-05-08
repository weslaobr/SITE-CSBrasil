
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupOrphans() {
  console.log("--- Cleaning up orphaned tracker records ---");
  try {
    // 1. Find all tracker_matches
    const trackerMatches = await prisma.tracker_matches.findMany({
      select: { match_id: true }
    });
    
    console.log(`Found ${trackerMatches.length} tracker matches.`);
    
    let deletedCount = 0;
    for (const tm of trackerMatches) {
      // 2. Check if a corresponding GlobalMatch exists
      const exists = await prisma.globalMatch.findUnique({
        where: { id: tm.match_id }
      });
      
      if (!exists) {
        console.log(`Match ${tm.match_id} is orphaned. Deleting tracker records...`);
        try {
          await prisma.tracker_matches.delete({
            where: { match_id: tm.match_id }
          });
          deletedCount++;
        } catch (delErr) {
          console.warn(`Failed to delete ${tm.match_id}: ${delErr.message}`);
        }
      }
    }
    
    console.log(`Successfully deleted ${deletedCount} orphaned tracker records.`);
  } catch (e) {
    console.error("Cleanup error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOrphans();
