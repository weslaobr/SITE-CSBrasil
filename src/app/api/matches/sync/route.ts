import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFaceitMatches, getFaceitPlayer } from "@/services/faceit-service";
import { getSteamMatchHistory } from "@/services/steam-service";
import { getLeetifyProfile } from "@/services/leetify-service";
import axios from "axios";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                faceitNickname: true,
                steamId: true,
                steamMatchAuthCode: true,
                steamLatestMatchCode: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const results = {
            faceit: 0,
            steam: 0
        };

        const { steamStartCode } = await req.json().catch(() => ({ steamStartCode: '' }));

        // 1. Steam Deep Sync - Processa em Lotes (Batches)
        let nextSteamCode = steamStartCode;
        let hasMore = false;

        if (user.steamMatchAuthCode && user.steamLatestMatchCode) {
            try {
                // Puxa o lote da Steam (agora batendo no bot para info REAL e hookeando a Demo)
                const steamMatches = await getSteamMatchHistory(
                    user.steamId,
                    user.steamMatchAuthCode,
                    steamStartCode || user.steamLatestMatchCode,
                    3 // Limitando a 3 por chamada para não sobrecarregar o bot com Demos
                );

                if (steamMatches && steamMatches.length > 0) {
                    for (const match of steamMatches) {
                        if (match.id === 'sync-ready' || match.id === 'error-412' || match.id === 'no-bot') continue;
                        
                        const exists = await prisma.match.findUnique({ where: { externalId: match.externalId as string } });
                        if (!exists) {
                            await prisma.match.create({
                                data: {
                                    id: match.externalId,
                                    userId: userId,
                                    source: match.source,
                                    externalId: match.externalId,
                                    gameMode: match.gameMode,
                                    mapName: match.mapName,
                                    kills: match.kills,
                                    deaths: match.deaths,
                                    assists: match.assists,
                                    score: match.score || "Unknown",
                                    mvps: match.mvps || 0,
                                    duration: match.duration,
                                    matchDate: new Date(match.matchDate),
                                    result: match.result || "Unknown",
                                    url: match.url
                                }
                            });
                            results.steam++;
                        }
                        
                        nextSteamCode = match.externalId;
                        hasMore = true;
                    }
                }
            } catch (err) {
                console.error("Steam Sync Error:", err);
            }
        }

        return NextResponse.json({ success: true, results, hasMore, nextSteamCode });
    } catch (error) {
        console.error("Deep Sync Error:", error);
        return NextResponse.json({ error: "Failed to perform deep sync" }, { status: 500 });
    }
}
