const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGlobalMatch() {
  const matchId = 'demo_8885ba7d89d63f48';
  console.log(`Checking GlobalMatch for match: ${matchId}`);
  
  const match = await prisma.globalMatch.findUnique({
    where: { id: matchId },
    include: { players: true }
  });
  
  if (!match) {
    console.log('GlobalMatch not found');
    // Try to find any recent match
    const recent = await prisma.globalMatch.findFirst({
        orderBy: { createdAt: 'desc' }
    });
    if (recent) {
        console.log(`Found recent match instead: ${recent.id}`);
    }
    return;
  }
  
  console.log('Match found. Players count:', match.players.length);
  if (match.players.length > 0) {
    const p = match.players[0];
    console.log('Player record fields:', Object.keys(p));
    console.log('KAST/Rating values:', p.kast, p.kast_percent, p.rating);
  }
}

checkGlobalMatch().catch(console.error).finally(() => prisma.$disconnect());
