const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const matchId = 'demo_d679a621b3740b565445407a';
  
  const match = await prisma.globalMatch.findUnique({
    where: { id: matchId },
    include: { players: true }
  });
  
  if (!match) {
    console.log('Match not found');
    return;
  }
  
  console.log('Match:', {
    id: match.id,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    mapName: match.mapName
  });
  
  console.log('Players:');
  match.players.forEach(p => {
    console.log(`- SteamId: ${p.steamId}, Team: ${p.team}, Result: ${p.matchResult}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
