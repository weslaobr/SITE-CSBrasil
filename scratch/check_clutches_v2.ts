import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const gmp = await prisma.globalMatchPlayer.findFirst({
    where: {
      metadata: {
        path: ['clutches'],
        not: null
      }
    }
  });

  if (gmp) {
    console.log("--- PLAYER METADATA ---");
    console.log(JSON.stringify(gmp.metadata, null, 2));
  } else {
    console.log("No player with clutches found.");
    // Try to find ANY player and see what keys are there
    const anyGmp = await prisma.globalMatchPlayer.findFirst();
    if (anyGmp) {
      console.log("--- ANY PLAYER METADATA ---");
      console.log(JSON.stringify(anyGmp.metadata, null, 2));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
