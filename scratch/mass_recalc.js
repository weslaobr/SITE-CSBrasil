
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function massRecalculate() {
  console.log("--- Mass Recalculating Tropoints ---");
  try {
    const matches = await prisma.globalMatch.findMany({
      where: {
        source: { in: ['Leetify', 'leetify', 'mix', 'manual', 'demo', 'demo-analyzer'] }
      },
      include: { GlobalMatchPlayer: true }
    });

    console.log(`Processing ${matches.length} matches...`);

    for (const match of matches) {
      for (const p of match.GlobalMatchPlayer) {
        const kills = p.kills || 0;
        const deaths = p.deaths || 0;
        const adr = Number(p.adr || 0);
        const mvps = p.mvps || 0;
        const result = (p.matchResult || "").toLowerCase();

        let newEloChange = 0;
        if (result === 'win' || result === 'vitoria' || result === 'vitória') {
          newEloChange = 15;
        } else if (result === 'loss' || result === 'derrota') {
          newEloChange = -10;
        }

        if (newEloChange !== 0) {
          if (kills > deaths) newEloChange += 2;
          else if (deaths > kills + 3) newEloChange -= 2;
          if (adr > 90) newEloChange += 3;
          else if (adr < 50) newEloChange -= 2;
          newEloChange += mvps;
        }

        if (newEloChange !== (p.eloChange || 0)) {
           await prisma.globalMatchPlayer.update({
             where: { id: p.id },
             data: { eloChange: newEloChange }
           });
        }
      }
    }
    console.log("Success! All matches updated.");
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

massRecalculate();
