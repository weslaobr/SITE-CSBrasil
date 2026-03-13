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

        // 1. Sync Steam Matches
        if (user.steamId && user.steamMatchAuthCode) {
            // Forward Sync: Check for new matches since the last one in our DB
            const newestMatch = await prisma.match.findFirst({
                where: { userId, source: 'Steam' },
                orderBy: { matchDate: 'desc' }
            });

            let stopAtCode = '';
            let startCode = '';

            if (newestMatch && user.steamLatestMatchCode) {
                stopAtCode = newestMatch.externalId || '';
                startCode = user.steamLatestMatchCode || '';
                console.log(`[QuickSync] Forward sync: starting from ${startCode}, stopping at known ${stopAtCode}`);
            } else if (user.steamLatestMatchCode) {
                startCode = user.steamLatestMatchCode || '';
                console.log(`[QuickSync] Initial sync: starting from user's latest code ${startCode}`);
            }

            const steamMatches = await getSteamMatchHistory(user.steamId, user.steamMatchAuthCode, startCode, 10, '', stopAtCode);
            console.log(`[QuickSync] Found ${steamMatches.length} new Steam matches`);

            for (const match of steamMatches) {
                if (match.id === 'sync-ready' || match.id === 'error-412') continue;

                let realDetails = null;
                const botUrl = process.env.BOT_API_URL;

                if (botUrl) {
                    try {
                        // Call local Bot API for real details
                        // @ts-ignore
                        const axios = require('axios');
                        const botRes = await axios.get(`${botUrl}/match/${match.externalId}`, { timeout: 2000 });
                        if (botRes.status === 200) {
                            realDetails = botRes.data;
                        }
                    } catch (e) {
                        // Silently continue if bot is not available
                    }
                }

                await prisma.match.upsert({
                    where: { externalId: match.externalId },
                    update: {},
                    create: {
                        userId,
                        source: 'Steam',
                        externalId: match.externalId,
                        gameMode: match.gameMode,
                        mapName: realDetails?.map_name || match.mapName,
                        kills: realDetails?.kills !== undefined && realDetails.kills !== null ? realDetails.kills : match.kills,
                        deaths: realDetails?.deaths !== undefined && realDetails.deaths !== null ? realDetails.deaths : match.deaths,
                        assists: realDetails?.assists !== undefined && realDetails.assists !== null ? realDetails.assists : match.assists,
                        score: realDetails?.score || match.score,
                        mvps: match.mvps || 0,
                        duration: match.duration,
                        adr: realDetails?.adr || match.adr,
                        hsPercentage: realDetails?.hsPercentage || match.hsPercentage,
                        result: realDetails?.result || match.result,
                        matchDate: realDetails?.raw_time ? new Date(realDetails.raw_time) : match.matchDate,
                        url: match.url,
                        metadata: { ... (realDetails ? { ...realDetails } : (match.metadata || {})), isMocked: !realDetails }
                    }
                });
                syncedCount++;
            }

            // Sync Leetify Profile Ratings
            if (steamMatches.length > 0) {
                try {
                    const ranks = await getLeetifyProfile(user.steamId);
                    if (ranks && ranks.premier) {
                        await prisma.user.update({
                            where: { id: userId },
                            data: { cs2Rank: ranks.premier.toString() }
                        });
                        console.log(`[QuickSync] Updated user Leetify Premier Rank to: ${ranks.premier}`);
                    }
                } catch (e: any) {
                    console.error("[QuickSync] Failed to update Leetify rank:", e.message);
                }
            }
        }

        // 2. Sync Faceit Matches
        if (user.faceitNickname) {
            const faceitPlayer = await getFaceitPlayer(user.faceitNickname);
            if (faceitPlayer) {
                const faceitMatches = await getFaceitMatches(faceitPlayer.player_id);
                // For the most recent 5 matches, fetch full scoreboard stats
                for (let i = 0; i < faceitMatches.length; i++) {
                    const match = faceitMatches[i];

                    // Fetch full stats for better reporting (only for the first few to avoid rate limits)
                    if (i < 10) {
                        const stats = await getFaceitMatchStats(match.externalId);
                        if (stats && stats.rounds && stats.rounds.length > 0) {
                            match.metadata.fullStats = stats;
                        }
                    }

                    await prisma.match.upsert({
                        where: { externalId: match.externalId },
                        update: {
                            metadata: match.metadata || {}
                        },
                        create: {
                            userId,
                            source: 'Faceit',
                            externalId: match.externalId,
                            gameMode: match.gameMode,
                            mapName: match.mapName,
                            kills: match.kills,
                            deaths: match.deaths,
                            assists: match.assists,
                            score: match.score,
                            mvps: match.mvps || 0,
                            duration: match.duration,
                            adr: match.adr,
                            hsPercentage: match.hsPercentage,
                            result: match.result,
                            matchDate: match.matchDate,
                            url: match.url,
                            metadata: match.metadata || {}
                        }
                    });
                    syncedCount++;
                }
            }
        }

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
