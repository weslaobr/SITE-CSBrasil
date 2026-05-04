const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPremierData() {
  try {
    const stats = await prisma.stats.findMany({
      where: {
        premierRating: { gt: 0 }
      },
      include: {
        Player: true
      },
      orderBy: {
        premierRating: 'asc'
      },
      take: 20
    });

    console.log('Stats with premierRating (low values first):');
    stats.forEach(s => {
      console.log(`Player: ${s.Player.steamName || s.Player.steamId}, Rating: ${s.premierRating}`);
    });

    const lowRatings = stats.filter(s => s.premierRating < 100);
    if (lowRatings.length > 0) {
      console.log('\nFound suspicious low ratings (< 100):', lowRatings.length);
    }

    const leetifyMatches = await prisma.match.findMany({
        where: {
            source: 'Leetify',
            gameMode: { contains: 'Premier' }
        },
        take: 5
    });
    console.log('\nRecent Leetify Premier Matches:', JSON.stringify(leetifyMatches, null, 2));

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPremierData();
