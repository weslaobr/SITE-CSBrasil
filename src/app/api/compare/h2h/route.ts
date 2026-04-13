import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const steamIdA = searchParams.get('steamIdA');
        const steamIdB = searchParams.get('steamIdB');

        if (!steamIdA || !steamIdB) {
            return NextResponse.json({ error: "Faltam parâmetros steamIdA ou steamIdB." }, { status: 400 });
        }

        // Recupera todos ids de matches que A jogou
        const matchesA = await prisma.globalMatchPlayer.findMany({
            where: { steamId: steamIdA },
            select: { globalMatchId: true }
        });

        if (!matchesA.length) {
            return NextResponse.json({
                matches: [],
                winsA: 0,
                winsB: 0,
                totalCommon: 0
            });
        }

        const matchIds = matchesA.map(m => m.globalMatchId);

        // Recupera matches inteiras que B tambem jogou e que estão no array acima
        const commonMatches = await prisma.globalMatch.findMany({
            where: {
                id: { in: matchIds },
                players: {
                    some: { steamId: steamIdB }
                }
            },
            include: {
                players: {
                    where: { steamId: { in: [steamIdA, steamIdB] } }
                }
            },
            orderBy: {
                matchDate: 'desc'
            }
        });

        let winsA = 0;
        let winsB = 0;

        const results = commonMatches.map(match => {
            const playerA = match.players.find(p => p.steamId === steamIdA);
            const playerB = match.players.find(p => p.steamId === steamIdB);

            if (!playerA || !playerB) return null; // Fallback inesperado

            // A maior pontuação vence. Se empatar em pontos, vale kills
            let winnerId = null;
            if (playerA.score > playerB.score) {
                winnerId = steamIdA;
                winsA++;
            } else if (playerB.score > playerA.score) {
                winnerId = steamIdB;
                winsB++;
            } else {
                // Em caso de empate absoluto de score, usamos kills
                if (playerA.kills > playerB.kills) {
                    winnerId = steamIdA;
                    winsA++;
                } else if (playerB.kills > playerA.kills) {
                    winnerId = steamIdB;
                    winsB++;
                }
                // Senão, é empate total na nossa métrica
            }

            return {
                matchId: match.id,
                date: match.matchDate,
                map: match.mapName,
                playerA: {
                    team: playerA.team,
                    result: playerA.matchResult,
                    score: playerA.score,
                    kills: playerA.kills,
                    deaths: playerA.deaths,
                    assists: playerA.assists,
                    mvp: playerA.mvps
                },
                playerB: {
                    team: playerB.team,
                    result: playerB.matchResult,
                    score: playerB.score,
                    kills: playerB.kills,
                    deaths: playerB.deaths,
                    assists: playerB.assists,
                    mvp: playerB.mvps
                },
                isSameTeam: playerA.team === playerB.team,
                betterPlacedSteamId: winnerId
            };
        }).filter(Boolean); // remove nulos

        return NextResponse.json({
            matches: results,
            winsA,
            winsB,
            totalCommon: results.length
        });

    } catch (error) {
        console.error("H2H Compare API Error:", error);
        return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
    }
}
