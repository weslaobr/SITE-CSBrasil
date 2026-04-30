const { prisma } = require('./src/lib/prisma');
const { getLeetifyMaxRating } = require('./src/services/leetify-tropacs');

const steamId = '76561198829795742';

async function sync() {
    try {
        console.log(`[Manual Sync] Iniciando para ${steamId}...`);
        const maxRating = await getLeetifyMaxRating(steamId);
        console.log(`[Manual Sync] Max Rating encontrado: ${maxRating}`);

        if (maxRating > 0) {
            const player = await prisma.player.findUnique({
                where: { steamId: steamId },
                include: { Stats: true }
            });

            if (player) {
                if (player.Stats) {
                    await prisma.stats.update({
                        where: { id: player.Stats.id },
                        data: { premierRating: maxRating }
                    });
                    console.log(`[Manual Sync] Stats atualizado!`);
                } else {
                    await prisma.stats.create({
                        data: {
                            playerId: player.id,
                            premierRating: maxRating
                        }
                    });
                    console.log(`[Manual Sync] Stats criado!`);
                }
            } else {
                console.log(`[Manual Sync] Player não encontrado no banco de dados. Criando player básico...`);
                await prisma.player.create({
                    data: {
                        steamId: steamId,
                        Stats: {
                            create: {
                                premierRating: maxRating
                            }
                        }
                    }
                });
                console.log(`[Manual Sync] Player e Stats criados!`);
            }
        } else {
            console.log(`[Manual Sync] Nenhum rating encontrado.`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

sync();
