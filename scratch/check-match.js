const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMatch() {
  const id = 'demo_8885ba7d89d63f48_76561198024691636';
  console.log(`Checking match with ID: ${id}`);
  
  const match = await prisma.globalMatch.findUnique({
    where: { id },
    include: { players: true }
  });
  
  if (match) {
    console.log('Match found!');
    console.log('Source:', match.source);
    console.log('Players count:', match.players.length);
  } else {
    console.log('Match not found in GlobalMatch');
    
    // Try to find any match with a similar ID
    const partialId = '8885ba7d89d63f48';
    const similar = await prisma.globalMatch.findMany({
      where: {
        id: {
          contains: partialId
        }
      }
    });
    console.log(`Found ${similar.length} matches containing ${partialId}`);
    similar.forEach(m => console.log(' - ', m.id));
  }
}

checkMatch().catch(console.error).finally(() => prisma.$disconnect());
