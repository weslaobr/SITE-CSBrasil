import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const match = await prisma.match.findFirst({
    where: {
      metadata: {
        path: ['source_detail'],
        equals: 'leetify'
      }
    }
  });

  if (match) {
    console.log("--- LEETIFY MATCH PLAYER STATS KEYS ---");
    const meta = match.metadata as any;
    if (meta.stats && meta.stats.length > 0) {
      console.log(Object.keys(meta.stats[0]));
      console.log("Sample Stat Object:");
      console.log(JSON.stringify(meta.stats[0], null, 2));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
