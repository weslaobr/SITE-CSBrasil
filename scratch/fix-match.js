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
  
  console.log(`Fixing match ${matchId}...`);
  const scoreA = match.scoreA || 0;
  const scoreB = match.scoreB || 0;
  
  let resA = "tie", resB = "tie";
  if (scoreA > scoreB) { resA = "win"; resB = "loss"; }
  else if (scoreB > scoreA) { resA = "loss"; resB = "win"; }
  
  for (const p of match.players) {
    // Standardizing team check
    const isTeamA = !p.team || ['A', 'CT', '3'].includes(p.team.toUpperCase());
    const finalResult = isTeamA ? resA : resB;
    
    console.log(`- Player ${p.steamId} (${p.team}): ${p.matchResult} -> ${finalResult}`);
    
    await prisma.globalMatchPlayer.update({
      where: { id: p.id },
      data: { matchResult: finalResult }
    });
  }
  
  console.log('Done!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
