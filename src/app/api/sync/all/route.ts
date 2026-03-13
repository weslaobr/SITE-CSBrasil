import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeetifyPlayerData } from "@/services/leetify-csbrasil";

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
                    // Debug: log first match to reveal actual field names
                    if (recentMatches.indexOf(m) === 0) {
                        console.log('[QuickSync] First Leetify match fields:', JSON.stringify(m, null, 2));
                    }

                    const externalId = `leetify-${m.id}`;
                    const mapName = (m.map_name || 'Unknown').replace('de_', '');
                    const scoreArr = Array.isArray(m.score) ? m.score : [0, 0];
                    const scoreStr = `${scoreArr[0]}-${scoreArr[1]}`;
                    const result = m.outcome === 'win' ? 'Win' : m.outcome === 'tie' ? 'Draw' : 'Loss';
                    const matchDate = m.finished_at ? new Date(m.finished_at) : new Date();

                    // Multiple field fallbacks for kills/deaths/assists
                    const kills = m.kills ?? m.num_kills ?? m.totalKills ?? m.total_kills ?? 0;
                    const deaths = m.deaths ?? m.num_deaths ?? m.totalDeaths ?? m.total_deaths ?? 0;
                    const assists = m.assists ?? m.num_assists ?? m.totalAssists ?? m.total_assists ?? 0;

                    // ADR fallbacks
                    const adr: number | null = m.adr ?? m.average_damage_per_round ?? m.avgDamagePerRound ?? null;

                    // HS%: accuracy_head can be a ratio (0.2979) or percentage (29.79)
                    let hsPercentage: number | null = null;
                    if (m.accuracy_head != null) {
                        // If value > 1, it's already expressed as a percentage (e.g. 29.79)
                        // If value <= 1, it's a decimal ratio (e.g. 0.2979) — multiply by 100
                        hsPercentage = m.accuracy_head > 1
                            ? Math.round(m.accuracy_head)
                            : Math.round(m.accuracy_head * 100);
                    } else if (m.hs_percentage != null) {
                        hsPercentage = Number(m.hs_percentage);
                    } else if (m.headshot_percentage != null) {
                        const raw = Number(m.headshot_percentage);
                        hsPercentage = Math.round(raw > 1 ? raw : raw * 100);
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
                        metadata: { ...m, source_detail: 'leetify' }
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
