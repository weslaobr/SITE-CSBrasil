import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const matchWithKast = await prisma.match.findFirst({
    where: {
      metadata: {
        path: ['kast'],
        not: null
      }
    }
  });

  if (matchWithKast) {
    console.log("Found legacy match with KAST!");
    console.log(JSON.stringify(matchWithKast.metadata, null, 2));
  } else {
    console.log("No legacy matches with KAST found.");
  }

  const gmpWithKast = await prisma.globalMatchPlayer.findFirst({
    where: {
      metadata: {
        path: ['kast'],
        not: null
      }
    }
  });

  if (gmpWithKast) {
    console.log("Found GlobalMatchPlayer with KAST!");
    console.log(JSON.stringify(gmpWithKast.metadata, null, 2));
  } else {
    console.log("No GlobalMatchPlayer with KAST found.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
