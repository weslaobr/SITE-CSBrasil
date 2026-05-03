
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function detectPlatform(source, gameMode) {
    const src = (source || '').toLowerCase();
    const mode = (gameMode || '').toLowerCase();
    
    if (['mix', 'demo', 'local'].some(s => src.includes(s))) return 'mix';
    if (['mix', 'demo', 'local'].some(s => mode.includes(s))) return 'mix';
    return 'other';
}

async function main() {
  const steamId = '76561198024691636';
  
  const user = await prisma.user.findUnique({
    where: { steamId },
    include: {
      matches: true
    }
  });

  const globalMatches = await prisma.globalMatchPlayer.findMany({
    where: { steamId },
    include: {
      match: true
    }
  });

  console.log('--- USER INFO ---');
  console.log('SteamID:', steamId);
  console.log('Total in User table:', user?.matches.length);
  console.log('Total in Global table:', globalMatches.length);

  // Analyze duplicates for MIX only
  const processedKeys = new Set();
  let mixCount = 0;
  let rawMixCount = 0;
  
  const allRaw = [
    ...globalMatches.map(g => ({
      id: g.match.id,
      externalId: g.match.externalId,
      map: g.match.mapName,
      date: g.match.matchDate,
      source: g.match.source,
      gameMode: g.match.gameMode
    })),
    ...user.matches.map(m => ({
      id: m.id,
      externalId: m.externalId,
      map: m.mapName,
      date: m.matchDate,
      source: m.source,
      gameMode: m.gameMode
    }))
  ];

  allRaw.forEach(m => {
    const platform = detectPlatform(m.source, m.gameMode);
    if (platform === 'mix') {
        rawMixCount++;
        const normId = String(m.externalId || m.id).replace('leetify-', '').replace('manual-', '');
        const timeBin = Math.floor(new Date(m.date).getTime() / (120 * 60 * 1000));
        const mapKey = (m.map || '').toLowerCase().replace('de_', '').trim();
        const key = normId ? `id_${normId}` : `time_${mapKey}_${timeBin}`;
        
        if (!processedKeys.has(key)) {
          processedKeys.add(key);
          mixCount++;
        }
    }
  });

  console.log('--- MIX ANALYSIS ---');
  console.log('Raw MIX records (sum):', rawMixCount);
  console.log('Unique MIX matches (deduplicated):', mixCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
