import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "MapVetoLobby" ADD COLUMN "knifeRound" BOOLEAN DEFAULT false`);
    console.log('Column knifeRound added successfully');
  } catch (err: any) {
    if (err.message?.includes('já existe') || err.message?.includes('already exists')) {
      console.log('Column knifeRound already exists');
    } else {
      throw err;
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
