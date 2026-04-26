import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const match = await prisma.match.findFirst();

  if (match) {
    console.log("--- MATCH METADATA KEYS ---");
    const meta = match.metadata as any;
    console.log(Object.keys(meta));
    
    if (meta.stats && Array.isArray(meta.stats) && meta.stats.length > 0) {
      console.log("--- PLAYER STATS KEYS ---");
      console.log(Object.keys(meta.stats[0]));
      console.log("Sample Stat Object:");
      console.log(JSON.stringify(meta.stats[0], null, 2));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
