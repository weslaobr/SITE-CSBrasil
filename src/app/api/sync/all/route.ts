import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFaceitMatches, getFaceitPlayer, getFaceitMatchStats } from "@/services/faceit-service";
import { getSteamMatchHistory } from "@/services/steam-service";
import { getLeetifyProfile } from "@/services/leetify-service";
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

        /* 1. Sync Steam Matches - DEACTIVATED (Only Leetify allowed)
        if (user.steamId && user.steamMatchAuthCode) {
            // Forward Sync logic...
            const steamMatches = await getSteamMatchHistory(user.steamId, user.steamMatchAuthCode, startCode, 10, '', stopAtCode);
            // ... (rest of steam sync)
        }
        */

        /* 2. Sync Faceit Matches - DEACTIVATED (Only Leetify allowed)
        if (user.faceitNickname) {
            // faceit sync logic...
        }
        */

        // 3. Sync Leetify Recent Matches (the "Combat History" shown on Profile page)
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

                    await prisma.match.upsert({
                        where: { externalId },
                        update: {
                            metadata: { ...m, source_detail: 'leetify' }
                        },
                        create: {
                            userId,
                            source: 'Leetify',
                            externalId,
                            gameMode: m.data_source || 'Matchmaking',
                            mapName: mapName.charAt(0).toUpperCase() + mapName.slice(1),
                            kills: m.kills || 0,
                            deaths: m.deaths || 0,
                            assists: m.assists || 0,
                            score: scoreStr,
                            mvps: m.mvps || 0,
                            duration: m.match_duration ? `${Math.round(m.match_duration / 60)} min` : '45 min',
                            adr: m.adr || (m.leetify_rating ? Math.abs(m.leetify_rating) * 100 : null),
                            hsPercentage: m.hs_percentage || null,
                            result,
                            matchDate,
                            url: m.id ? `https://leetify.com/app/match-details/${m.id}/scoreboard` : null,
                            metadata: { ...m, source_detail: 'leetify' }
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
