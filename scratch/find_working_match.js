
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findWorkingMatch() {
  const match = await prisma.globalMatch.findFirst({
    where: { 
      GlobalMatchPlayer: {
        some: { 
          eloChange: { not: 0 },
          eloChange: { not: null }
        }
      }
    },
    include: { GlobalMatchPlayer: true }
  });

  if (match) {
    console.log(`Working Match ID: ${match.id} | Source: ${match.source} | Map: ${match.mapName}`);
    const p = match.GlobalMatchPlayer.find(p => p.eloChange !== 0);
    console.log(`  Player with points: ${p.steamId} | Points: ${p.eloChange}`);
  } else {
    console.log("No working match found");
  }
  await prisma.$disconnect();
}

findWorkingMatch();
