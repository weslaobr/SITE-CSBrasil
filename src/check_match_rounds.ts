import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMatchMetadataFull() {
  const matchId = 'demo_fcd8bcc9ded028da61f30c1b';
  const match = await prisma.globalMatch.findUnique({
    where: { id: matchId }
  });

  if (match) {
    const keys = Object.keys(match.metadata as any);
    console.log('Metadata keys:', keys);
    if (keys.includes('round_summaries')) {
        console.log('round_summaries found!');
        console.log('Rounds count:', Object.keys((match.metadata as any).round_summaries).length);
    } else if (keys.includes('roundSummaries')) {
        console.log('roundSummaries found!');
    } else {
        console.log('No round summaries found in metadata.');
    }
  }
}

checkMatchMetadataFull()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
