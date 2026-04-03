import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFaceitPlayerBySteamId } from "@/services/faceit-service";
import { getCS2SpacePlayerInfo } from "@/services/cs2space-service";

export async function POST(req: NextRequest) {
    // Rota administrativa para preencher Faceit, CS2Space e inicializar GC vazio se não tiver
    try {
        const players = await prisma.player.findMany({
            include: { Stats: true }
        });

        let updatedFaceit = 0;
        let updatedPremier = 0;

        for (const player of players) {
            let updated = false;
            let currentStats = player.Stats;

            // Se o player não tem model Stats, criamos
            if (!currentStats) {
                currentStats = await (prisma as any).stats.create({
                    data: {
                        playerId: player.id,
                        steamId: player.steamId,
                    }
                });
            }

            const faceitNeedsUpdate = !currentStats.faceitLevel || currentStats.faceitLevel === 0;
            const premierNeedsUpdate = !currentStats.premierRating || currentStats.premierRating === 0;

            if (faceitNeedsUpdate || premierNeedsUpdate) {
                // 1. Tentar CS2 Space (tem premier e as vezes faceit)
                const cs2space = await getCS2SpacePlayerInfo(player.steamId);
                const updateData: any = {};

                if (cs2space) {
                    if (premierNeedsUpdate && cs2space.ranks?.premier) {
                        updateData.premierRating = cs2space.ranks.premier;
                        updatedPremier++;
                        updated = true;
                    }

                    if (faceitNeedsUpdate && cs2space.faceit) {
                        updateData.faceitLevel = cs2space.faceit.level || 0;
                        updateData.faceitElo = cs2space.faceit.elo || 0;
                        if (cs2space.faceit.nickname) {
                            await (prisma as any).player.update({
                                where: { id: player.id },
                                data: { faceitName: cs2space.faceit.nickname }
                            });
                        }
                        updatedFaceit++;
                        updated = true;
                    }
                }

                // 2. Tentar Faceit API Direto se CS2 Space falhou pro Faceit
                if (faceitNeedsUpdate && !updateData.faceitLevel) {
                    const faceitData = await getFaceitPlayerBySteamId(player.steamId);
                    if (faceitData?.games?.cs2) {
                        updateData.faceitLevel = faceitData.games.cs2.skill_level || 0;
                        updateData.faceitElo = faceitData.games.cs2.faceit_elo || 0;
                        if (faceitData.nickname) {
                            await (prisma as any).player.update({
                                where: { id: player.id },
                                data: { faceitName: faceitData.nickname }
                            });
                        }
                        updatedFaceit++;
                        updated = true;
                    }
                }

                // Efetuar Update
                if (updated) {
                    await (prisma as any).stats.update({
                        where: { id: currentStats.id },
                        data: updateData
                    });

                    // Snapshot para o Premier Rating se foi preenchido
                    if (updateData.premierRating && updateData.premierRating > 0) {
                        await (prisma as any).ratingSnapshot.create({
                            data: {
                                steamId: player.steamId,
                                rating: updateData.premierRating,
                                source: 'premier',
                            }
                        }).catch(() => {});
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Busca concluída! ${updatedFaceit} Faceits encontrados e ${updatedPremier} ratings do Premier atualizados. (Obs: A API da GC é privada, então a GamersClub precisa ser preenchida na Central de Sync).`,
            stats: { faceit: updatedFaceit, premier: updatedPremier }
        });

    } catch (error: any) {
        console.error("Erro no sync-platforms:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
