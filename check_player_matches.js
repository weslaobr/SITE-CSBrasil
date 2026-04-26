const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const steamId = '76561198771796413';
  
  const matches = await prisma.globalMatchPlayer.findMany({
    where: { steamId }
  });

  console.log('Matches found in DB:', matches.length);
  
  if (matches.length > 0) {
    const totalKills = matches.reduce((acc, m) => acc + (m.kills || 0), 0);
    const totalDeaths = matches.reduce((acc, m) => acc + (m.deaths || 0), 0);
    const avgAdr = matches.reduce((acc, m) => acc + (m.adr || 0), 0) / matches.length;
    
    console.log('Stats Summary:');
    console.log('Total Kills:', totalKills);
    console.log('Total Deaths:', totalDeaths);
    console.log('Avg ADR:', avgAdr.toFixed(2));
    console.log('KDR:', (totalKills / (totalDeaths || 1)).toFixed(2));
  }
}

main().finally(() => prisma.$disconnect());
