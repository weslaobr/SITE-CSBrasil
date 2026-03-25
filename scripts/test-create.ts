import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst();
  if (!user) { console.log('No user found'); return; }
  try {
    const lobby = await (prisma as any).mapVetoLobby.create({
      data: {
        creatorId: user.id,
        format: 'BO3',
        knifeRound: false,
        status: 'WAITING',
        mapPool: ["Mirage"],
        rpsState: {},
        vetoHistory: [],
      }
    });
    console.log('Success:', lobby.id);
  } catch (err: any) {
    console.error('FAILED TO CREATE LOBBY:', err);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
