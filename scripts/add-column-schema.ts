import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE public."MapVetoLobby" ADD COLUMN "knifeRound" BOOLEAN DEFAULT false`);
    console.log('Column knifeRound added successfully to public."MapVetoLobby"');
  } catch (err: any) {
    console.error('Failed with explicit schema:', err.message);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
