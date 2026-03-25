import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const variations = ['MapVetoLobby', '"MapVetoLobby"', 'mapvetolobby', '"mapvetolobby"'];
  for (const v of variations) {
    try {
      console.log(`Trying ${v}...`);
      await prisma.$executeRawUnsafe(`ALTER TABLE ${v} ADD COLUMN "knifeRound" BOOLEAN DEFAULT false`);
      console.log(`Success with ${v}`);
      return;
    } catch (err: any) {
      console.log(`Failed with ${v}: ${err.message}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
