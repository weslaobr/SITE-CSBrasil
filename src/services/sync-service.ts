import { prisma } from "@/lib/prisma";
import { getLeetifyPlayerData, getLeetifyMaxRating } from "@/services/leetify-tropacs";
import axios from "axios";

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY || '4549d73d-8a0d-40ff-9051-a3166c518dae';
const LEETIFY_BASE_URL = 'https://api-public.cs-prod.leetify.com';

export async function syncUserMatches(steamId: string) {
    const user = await prisma.user.findUnique({
        where: { steamId },
        select: {
            id: true,
            steamId: true,
            steamMatchAuthCode: true,
            steamLatestMatchCode: true
        }
    });

    if (!user || !user.steamId) {
        throw new Error("User not found or has no SteamID linked");
    }

    let syncedCount = 0;

    // Leetify Sync
    try {
        const leetifyData = await getLeetifyPlayerData(user.steamId);
        const recentMatches = leetifyData?.recentMatches || [];
        console.log(`[SyncService] Found ${recentMatches.length} Leetify recent matches for ${user.steamId}`);

        for (const m of recentMatches) {
            const externalId = `leetify-${m.id}`;
            const mapName = (m.map_name || 'Unknown').replace('de_', '');
            const scoreArr = Array.isArray(m.score) ? m.score : [0, 0];
            const scoreStr = `${scoreArr[0]}-${scoreArr[1]}`;
            const result = m.outcome === 'win' ? 'Win' : m.outcome === 'tie' ? 'Draw' : 'Loss';
            const matchDate = m.finished_at ? new Date(m.finished_at) : new Date();

            let hsPercentage: number | null = null;
            if (m.accuracy_head != null) {
                const raw = Number(m.accuracy_head);
                hsPercentage = raw > 1 ? Math.round(raw) : Math.round(raw * 100);
            }

            let kills = 0, deaths = 0, assists = 0, adr: number | null = null, kast: number | null = null;
            let matchMetaExtra: any = {};
            let demoUrl: string | null = null;
            try {
                const detailRes = await axios.get(`${LEETIFY_BASE_URL}/v2/matches/${m.id}`, {
                    headers: { '_leetify_key': LEETIFY_API_KEY },
                    timeout: 5000
                });
                const detail = detailRes.data;

                const playerStat = detail.stats?.find((p: any) =>
                    p.steam64_id === user.steamId ||
                    p.steamId === user.steamId ||
                    p.player_id === user.steamId
                );

                if (playerStat) {
                    kills = playerStat.total_kills ?? playerStat.kills ?? 0;
                    deaths = playerStat.total_deaths ?? playerStat.deaths ?? 0;
                    assists = playerStat.total_assists ?? playerStat.assists ?? 0;
                    adr = playerStat.dpr ?? playerStat.adr ?? playerStat.average_damage_per_round ?? null;
                    kast = m.kast ?? playerStat.kast ?? playerStat.kast_percent ?? playerStat.kast_percentage ?? playerStat.kastPercent ?? playerStat.kastPercentage ?? null;
                    
                    // Fallback to ratings if not in stats directly
                    if (kast == null && detail.ratings?.[playerStat.steam64_id || playerStat.player_id]?.kast) {
                        kast = detail.ratings[playerStat.steam64_id || playerStat.player_id].kast;
                    }

                    // Last resort: if still null but we have rating, estimate it for better UI
                    if (kast == null && (m.leetifyRating != null || playerStat.leetifyRating != null)) {
                        const r = m.leetifyRating ?? playerStat.leetifyRating ?? 0;
                        kast = 70 + (r * 10); // Simple heuristic: 0.0 -> 70%, 1.0 -> 80%
                    }

                    if (hsPercentage == null && playerStat.accuracy_head != null) {
                        const raw = Number(playerStat.accuracy_head);
                        hsPercentage = raw > 1 ? Math.round(raw) : Math.round(raw * 100);
                    }
                }

                demoUrl = detail.demo_url || detail.demoUrl || null;

                matchMetaExtra = {
                    leetify_ratings: detail.ratings,
                    teamA: detail.teamA,
                    teamB: detail.teamB,
                    demoUrl: detail.demo_url || detail.demoUrl || null,
                    sharingCode: detail.sharingCode || detail.matchSharingCode || null
                };

                // Global Match Cache
                const globalMatchData = {
                    source: 'Leetify',
                    mapName: mapName.charAt(0).toUpperCase() + mapName.slice(1),
                    duration: m.match_duration ? `${Math.round(m.match_duration / 60)} min` : '45 min',
                    matchDate: matchDate,
                    scoreA: scoreArr[0] || 0,
                    scoreB: scoreArr[1] || 0,
                    metadata: { ...matchMetaExtra }
                };

                await prisma.globalMatch.upsert({
                    where: { id: m.id },
                    update: globalMatchData,
                    create: { id: m.id, ...globalMatchData }
                });

                if (detail.stats && Array.isArray(detail.stats)) {
                    for (const p of detail.stats) {
                        const pSteamId = p.steam64_id || p.player_id || p.steamId;
                        if (!pSteamId) continue;
                        
                        const rawHs = Number(p.accuracy_head ?? p.hs_percentage ?? 0);
                        const registeredUser = await prisma.user.findUnique({
                            where: { steamId: pSteamId },
                            select: { id: true }
                        });

                        const pData = {
                            userId: registeredUser?.id || null,
                            team: String(p.initial_team_number || p.team_id || p.teamId || p.game_team || 'x'),
                            kills: p.total_kills ?? p.kills ?? 0,
                            deaths: p.total_deaths ?? p.deaths ?? 0,
                            assists: p.total_assists ?? p.assists ?? 0,
                            score: p.score ?? 0,
                            mvps: p.mvps ?? 0,
                            adr: p.dpr ?? p.adr ?? p.average_damage_per_round ?? 0,
                            hsPercentage: rawHs > 1 ? Math.round(rawHs) : Math.round(rawHs * 100),
                            matchResult: p.match_result ?? p.outcome ?? result,
                            metadata: p 
                        };

                        await prisma.globalMatchPlayer.upsert({
                            where: { globalMatchId_steamId: { globalMatchId: m.id, steamId: pSteamId } },
                            update: pData,
                            create: {
                                globalMatchId: m.id,
                                steamId: pSteamId,
                                ...pData
                            }
                        });
                    }
                }
            } catch (err) {
                console.warn(`[SyncService] Detail sync failed for ${m.id}`);
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
                metadata: { ...m, ...matchMetaExtra, kast, source_detail: 'leetify' }
            };

            await prisma.match.upsert({
                where: { externalId },
                update: sharedData,
                create: {
                    userId: user.id,
                    source: 'Leetify',
                    externalId,
                    gameMode: m.data_source || 'Matchmaking',
                    mapName: mapName.charAt(0).toUpperCase() + mapName.slice(1),
                    mvps: m.mvps ?? 0,
                    duration: m.match_duration ? `${Math.round(m.match_duration / 60)} min` : '45 min',
                    url: demoUrl || (m.id ? `https://leetify.com/app/match-details/${m.id}/scoreboard` : null),
                    ...sharedData
                }
            });
            syncedCount++;
        }
    } catch (e) {
        console.error("[SyncService] Leetify sync failed:", e);
    }

    return syncedCount;
}

export async function syncUserStats(steamId: string) {
    const player = await prisma.player.findUnique({
        where: { steamId },
        include: { Stats: true }
    });

    if (!player) return null;

    let currentStats = player.Stats;
    if (!currentStats) {
        currentStats = await (prisma as any).stats.create({
            data: { playerId: player.id }
        });
    }

    const { getCS2SpacePlayerInfo } = require("@/services/cs2space-service");
    const { getFaceitPlayerBySteamId } = require("@/services/faceit-service");

    const updateData: any = {};
    try {
        const cs2space = await getCS2SpacePlayerInfo(steamId);
        const leetifyData = await getLeetifyPlayerData(steamId);

        if (cs2space) {
            if (cs2space.ranks?.premier) {
                updateData.premierRating = cs2space.ranks.premier;
            }
            if (cs2space.faceit) {
                updateData.faceitLevel = cs2space.faceit.level || 0;
                updateData.faceitElo = cs2space.faceit.elo || 0;
            }
            // Leetify often has GC level in its ranks data via cs2space or direct
            if (cs2space.leetify?.gamersClubLevel) {
                updateData.gcLevel = cs2space.leetify.gamersClubLevel;
            }
        }

        // Leetify Fallback/Augmentation
        if (leetifyData) {
            if (!updateData.premierRating && leetifyData.ranks.premier) {
                updateData.premierRating = leetifyData.ranks.premier;
            }
            if (!updateData.faceitLevel && leetifyData.ranks.faceitLevel) {
                updateData.faceitLevel = leetifyData.ranks.faceitLevel;
                updateData.faceitElo = leetifyData.ranks.faceitElo || 0;
            }
            if (!updateData.gcLevel && leetifyData.ranks.gamersClubLevel) {
                updateData.gcLevel = leetifyData.ranks.gamersClubLevel;
            }
        }

        // Fallback: Leetify Max Rating
        if (!updateData.premierRating || updateData.premierRating === 0) {
            const leetifyMax = await getLeetifyMaxRating(steamId);
            if (leetifyMax > 0) {
                updateData.premierRating = leetifyMax;
            }
        }

        // Faceit direct fallback
        if (!updateData.faceitLevel) {
            const faceitData = await getFaceitPlayerBySteamId(steamId);
            const faceitGame = faceitData?.games?.cs2 || (faceitData?.games as any)?.csgo;
            if (faceitGame) {
                updateData.faceitLevel = faceitGame.skill_level || 0;
                updateData.faceitElo = faceitGame.faceit_elo || 0;
            }
        }

        // Peak Rating logic
        if (Object.keys(updateData).length > 0) {
            const finalUpdate: any = {};
            finalUpdate.premierRating = Math.max(currentStats.premierRating || 0, updateData.premierRating || 0);
            finalUpdate.faceitElo = Math.max(currentStats.faceitElo || 0, updateData.faceitElo || 0);
            finalUpdate.faceitLevel = Math.max(currentStats.faceitLevel || 0, updateData.faceitLevel || 0);
            finalUpdate.gcLevel = Math.max(currentStats.gcLevel || 0, updateData.gcLevel || 0);

            await (prisma as any).stats.update({
                where: { id: currentStats.id },
                data: finalUpdate
            });
            return finalUpdate;
        }
    } catch (e) {
        console.error(`[SyncService] Stats sync failed for ${steamId}:`, e);
    }
    return null;
}

