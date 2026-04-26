const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getCS2SpacePlayerInfo } = require('./src/services/cs2space-service');
const { getFaceitPlayerBySteamId } = require('./src/services/faceit-service');

async function main() {
  const steamId = '76561198771796413';
  console.log('Fetching stats for', steamId);

  try {
    const cs2space = await getCS2SpacePlayerInfo(steamId);
    console.log('CS2Space Data:', JSON.stringify(cs2space, null, 2));

    const faceit = await getFaceitPlayerBySteamId(steamId);
    console.log('Faceit Data:', faceit ? 'Found' : 'Not Found');
    if (faceit) {
      console.log('Faceit Skill Level:', faceit.games?.cs2?.skill_level || faceit.games?.csgo?.skill_level);
      console.log('Faceit Elo:', faceit.games?.cs2?.faceit_elo || faceit.games?.csgo?.faceit_elo);
    }
  } catch (e) {
    console.error('Error fetching external stats:', e.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
