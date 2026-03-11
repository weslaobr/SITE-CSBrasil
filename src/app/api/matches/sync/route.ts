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

        // 1. Faceit Deep Sync
        if (user.faceitNickname) {
            try {
                const faceitPlayer = await getFaceitPlayer(user.faceitNickname);
                if (faceitPlayer) {
                    const faceitMatches = await getFaceitMatches(faceitPlayer.player_id);
                    for (const m of faceitMatches) {
                        await prisma.match.upsert({
                            where: { externalId: m.externalId },
                            update: {},
                            create: { ...m, userId }
                        });
                        results.faceit++;
                    }
                }
            } catch (e) { console.error("Deep sync Faceit error:", e); }
        }

        // 2. Steam Deep Sync
        const { steamStartCode } = await req.json().catch(() => ({}));

        if (user.steamId && user.steamMatchAuthCode) {
            try {
                // Determine if we are syncing FORWARD (new matches) or BACKWARD (deep history)
                let baseDate = '';
                let stopAtCode = '';
                let startCode = steamStartCode || '';

                if (!steamStartCode) {
                    // Start of a sync: prioritize NEW matches
                    // To get new matches, we MUST start from the user's provided latest code 
                    // and go backwards until we hit the newest match we already have.
                    const newestMatch = await prisma.match.findFirst({
                        where: { userId, source: 'Steam' },
                        orderBy: { matchDate: 'desc' }
                    });

                    if (newestMatch && user.steamLatestMatchCode) {
                        stopAtCode = newestMatch.externalId || '';
                        startCode = user.steamLatestMatchCode || '';
                        console.log(`[DEBUG] Forward sync: starting from ${startCode}, stopping at known ${stopAtCode}`);
                    } else if (user.steamLatestMatchCode) {
                        startCode = user.steamLatestMatchCode || '';
                        console.log(`[DEBUG] Initial sync: starting from user's latest code ${startCode}`);
                    }
                } else {
                    // Continuation of a sync: go BACKWARD from history
                    const oldestMatch = await prisma.match.findFirst({
                        where: { userId, source: 'Steam' },
                        orderBy: { matchDate: 'asc' }
                    });
                    baseDate = oldestMatch ? oldestMatch.matchDate.toISOString() : '';
                    console.log(`[DEBUG] Backward sync: continuing from ${steamStartCode}, baseDate=${baseDate}`);
                }

                // Fetch in smaller chunks (20)
                const steamMatches = await getSteamMatchHistory(user.steamId, user.steamMatchAuthCode, startCode, 20, baseDate, stopAtCode);

                console.log(`[DEBUG] Syncing ${steamMatches.length} Steam matches. Results so far:`, results);

                for (const m of steamMatches) {
                    if (m.id === 'sync-ready' || m.id === 'error-412') continue;

                    let realDetails = null;
                    try {
                        // Call local Bot API for real details
                        const botRes = await axios.get(`http://localhost:3005/match/${m.externalId}`, { timeout: 2000 }); // Faster timeout for bulk sync
                        if (botRes.status === 200) {
                            realDetails = botRes.data;
                        }
                    } catch (e) {
                        // Silently continue if bot is not available
                    }

                    const matchData: any = {
                        ...m,
                        userId,
                        // Update with real data if bot responded
                        mapName: realDetails?.map_name || m.mapName,
                        kills: realDetails?.kills !== undefined && realDetails.kills !== null ? realDetails.kills : m.kills,
                        deaths: realDetails?.deaths !== undefined && realDetails.deaths !== null ? realDetails.deaths : m.deaths,
                        assists: realDetails?.assists !== undefined && realDetails.assists !== null ? realDetails.assists : m.assists,
                        score: realDetails?.score || m.score,
                        result: realDetails?.result || m.result,
                        adr: realDetails?.adr || m.adr,
                        hsPercentage: realDetails?.hsPercentage || m.hsPercentage,
                        matchDate: realDetails?.raw_time ? new Date(realDetails.raw_time) : m.matchDate,
                        metadata: {
                            ...(realDetails ? { ...realDetails } : {}),
                            isMocked: !realDetails && m.isMocked
                        }
                    };

                    await prisma.match.upsert({
                        where: { externalId: m.externalId },
                        update: matchData,
                        create: matchData
                    });
                    results.steam++;
                }

                // Fetch and update Leetify rank
                if (steamMatches.length > 0) {
                    try {
                        const ranks = await getLeetifyProfile(user.steamId);
                        if (ranks && ranks.premier) {
                            await prisma.user.update({
                                where: { id: userId },
                                data: { cs2Rank: ranks.premier.toString() }
                            });
                            console.log(`[DEBUG] Updated user Leetify Premier Rank to: ${ranks.premier}`);
                        }
                    } catch (e: any) {
                        console.error("Failed to update Leetify rank:", e.message);
                    }
                }

                // Get the last code to continue from
                const lastCode = steamMatches.length > 0 ? steamMatches[steamMatches.length - 1].externalId : null;
                console.log(`[DEBUG] Finalizing page: lastCode=${lastCode}, hasMore=${steamMatches.length === 20}`);

                return NextResponse.json({
                    success: true,
                    results,
                    nextSteamCode: lastCode,
                    hasMore: steamMatches.length === 20
                });
            } catch (e) {
                console.error("Deep sync Steam error:", e);
            }
        }

        return NextResponse.json({ success: true, results, hasMore: false });
    } catch (error) {
        console.error("Deep Sync Error:", error);
        return NextResponse.json({ error: "Failed to perform deep sync" }, { status: 500 });
    }
}
