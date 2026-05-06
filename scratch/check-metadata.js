const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMetadata() {
  const matchId = 'demo_8885ba7d89d63f48';
  console.log(`Checking metadata for match: ${matchId}`);
  
  const match = await prisma.match.findUnique({
    where: { externalId: matchId },
    select: { metadata: true }
  });
  
  if (!match) {
    console.log('Match not found');
    return;
  }
  
  const meta = match.metadata;
  console.log('Metadata structure:', JSON.stringify(meta, null, 2).substring(0, 1000));
  
  if (meta && meta.players) {
    console.log('Players in metadata found');
    const firstPlayer = Object.values(meta.players)[0];
    console.log('First player fields:', Object.keys(firstPlayer));
    console.log('KAST in first player:', firstPlayer.kast, firstPlayer.kast_percent, firstPlayer.kast_percentage);
  } else {
    console.log('No players object in metadata');
  }
}

checkMetadata().catch(console.error).finally(() => prisma.$disconnect());
