import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    take: 5,
    orderBy: { matchDate: 'desc' }
  });

  console.log("--- LEGACY MATCHES ---");
  matches.forEach(m => {
    console.log(`ID: ${m.id}, Map: ${m.mapName}, Kills: ${m.kills}`);
    console.log(`Metadata: ${JSON.stringify(m.metadata, null, 2)}`);
  });

  const gmps = await prisma.globalMatchPlayer.findMany({
    take: 5,
    include: { match: true }
  });

  console.log("\n--- GLOBAL MATCH PLAYERS ---");
  gmps.forEach(g => {
    console.log(`MatchID: ${g.globalMatchId}, SteamID: ${g.steamId}, Kills: ${g.kills}`);
    console.log(`Metadata: ${JSON.stringify(g.metadata, null, 2)}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
