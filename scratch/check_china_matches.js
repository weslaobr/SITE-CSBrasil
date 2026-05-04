const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findChinaMatches() {
  const china = await prisma.player.findFirst({
    where: {
      OR: [
        { steamName: 'China' },
        { steamId: '76561198272379761' } // Assuming this is China
      ]
    }
  });

  if (!china) {
    console.log('China not found');
    return;
  }

  console.log(`Found player: ${china.steamName} (${china.steamId})`);

  const matches = await prisma.globalMatchPlayer.findMany({
    where: { steamId: china.steamId },
    include: { match: true },
    orderBy: { match: { matchDate: 'desc' } }
  });

  console.log(`Found ${matches.length} matches for ${china.steamName}`);
  
  matches.forEach(m => {
      console.log(`Date: ${m.match.matchDate}, Source: ${m.match.source}, Result: ${m.matchResult}, ELO After: ${m.eloAfter}, Rank Meta: ${m.metadata?.rank || m.metadata?.skill_level}`);
  });

  await prisma.$disconnect();
}

findChinaMatches();
