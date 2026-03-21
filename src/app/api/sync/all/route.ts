import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeetifyPlayerData } from "@/services/leetify-tropacs";
import axios from "axios";

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY || '4549d73d-8a0d-40ff-9051-a3166c518dae';
const LEETIFY_BASE_URL = 'https://api-public.cs-prod.leetify.com';

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

        let syncedCount = 0;

        // Sync Leetify Recent Matches
        if (user.steamId) {
            try {
                const leetifyData = await getLeetifyPlayerData(user.steamId);
                const recentMatches = leetifyData?.recentMatches || [];
                console.log(`[QuickSync] Found ${recentMatches.length} Leetify recent matches`);

                for (const m of recentMatches) {
                    const externalId = `leetify-${m.id}`;
                    const mapName = (m.map_name || 'Unknown').replace('de_', '');
                    const scoreArr = Array.isArray(m.score) ? m.score : [0, 0];
                    const scoreStr = `${scoreArr[0]}-${scoreArr[1]}`;
                    const result = m.outcome === 'win' ? 'Win' : m.outcome === 'tie' ? 'Draw' : 'Loss';
                    const matchDate = m.finished_at ? new Date(m.finished_at) : new Date();

                    // HS%: accuracy_head is already a percentage value (e.g. 29.79 = 29.79%)
                    let hsPercentage: number | null = null;
                    if (m.accuracy_head != null) {
                        const raw = Number(m.accuracy_head);
                        // If > 1 it's already a full % (29.79), if <= 1 it's a ratio (0.2979)
                        hsPercentage = raw > 1 ? Math.round(raw) : Math.round(raw * 100);
                    }

                    // Fetch full match details to get kills/deaths/assists/adr for the user
                    let kills = 0, deaths = 0, assists = 0, adr: number | null = null;
                    let matchMetaExtra: any = {};
                    try {
                        const detailRes = await axios.get(`${LEETIFY_BASE_URL}/v2/matches/${m.id}`, {
                            headers: { '_leetify_key': LEETIFY_API_KEY },
                            timeout: 5000
                        });
                        const detail = detailRes.data;

                        // Find the current user's row in the stats array
                        const playerStat = detail.stats?.find((p: any) =>
                            p.steam64_id === user.steamId ||
                            p.steamId === user.steamId ||
                            p.player_id === user.steamId
                        );

                        if (playerStat) {
                            // Leetify v2 match detail uses: total_kills, total_deaths, total_assists, dpr (not kills/deaths/assists/adr)
                            kills = playerStat.total_kills ?? playerStat.kills ?? 0;
                            deaths = playerStat.total_deaths ?? playerStat.deaths ?? 0;
                            assists = playerStat.total_assists ?? playerStat.assists ?? 0;
                            adr = playerStat.dpr ?? playerStat.adr ?? playerStat.average_damage_per_round ?? null;

                            // accuracy_head in match detail is a 0-1 ratio (e.g. 0.2979 = 29.79%)
                            if (hsPercentage == null && playerStat.accuracy_head != null) {
                                const raw = Number(playerStat.accuracy_head);
                                hsPercentage = raw > 1 ? Math.round(raw) : Math.round(raw * 100);
                            }
                            if (hsPercentage == null && playerStat.hs_percentage != null) {
                                hsPercentage = Number(playerStat.hs_percentage);
                            }
                        }

                        matchMetaExtra = {
                            leetify_ratings: detail.ratings,
                            teamA: detail.teamA,
                            teamB: detail.teamB
                        };
                    } catch (detailErr: any) {
                        console.warn(`[QuickSync] Could not fetch match details for ${m.id}: ${detailErr.message}`);
                    }

                    const sharedData = {
                        kills,
                        deaths,
                        assists,
                        score: scoreStr,
                        adr,
                        hsPercentage,
                        result,
                        matchDate,
                        metadata: { ...m, ...matchMetaExtra, source_detail: 'leetify' }
                    };

                    await prisma.match.upsert({
                        where: { externalId },
                        update: sharedData,
                        create: {
                            userId,
                            source: 'Leetify',
                            externalId,
                            gameMode: m.data_source || 'Matchmaking',
                            mapName: mapName.charAt(0).toUpperCase() + mapName.slice(1),
                            mvps: m.mvps ?? 0,
                            duration: m.match_duration ? `${Math.round(m.match_duration / 60)} min` : '45 min',
                            url: m.id ? `https://leetify.com/app/match-details/${m.id}/scoreboard` : null,
                            ...sharedData
                        }
                    });
                    syncedCount++;
                }
            } catch (e: any) {
                console.error("[QuickSync] Leetify match sync failed:", e.message);
            }
        }

        return NextResponse.json({ success: true, count: syncedCount });
    } catch (error) {
        console.error("Critical Sync Error:", error);
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}
