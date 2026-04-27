import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';
import { getFaceitPlayerBySteamId } from "@/services/faceit-service";
import { getCS2SpacePlayerInfo } from "@/services/cs2space-service";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STEAM_API_KEY = process.env.STEAM_API_KEY;

function detectPlatform(source: string, gameMode: string | null): 'mix' | 'premier' | 'faceit' | 'gc' | null {
    const src = source.toLowerCase();
    const mode = (gameMode || '').toLowerCase();
    
    if (src === 'mix') return 'mix';
    if (src === 'leetify') {
        if (mode.includes('faceit')) return 'faceit';
        if (mode.includes('gamersclub') || mode === 'gc') return 'gc';
        if (mode.includes('valve') || mode.includes('matchmaking') || mode.includes('premier')) return 'premier';
        return 'premier'; // default for leetify if unknown
    }
    if (src === 'faceit') return 'faceit';
    if (src === 'gamersclub' || src === 'gc') return 'gc';
    if (src === 'premier' || src === 'matchmaking') return 'premier';
    
    return null;
}

export async function GET() {
    try {
        // 1. Buscar Players com Stats
        const players = await prisma.player.findMany({
            include: {
                Stats: true,
            },
        });

        // 2. Identificar players que precisam de atualização de perfil
        const playersToUpdate = players.filter(p => !(p as any).steamName || !(p as any).steamAvatar);

        if (playersToUpdate.length > 0 && STEAM_API_KEY) {
            const steamIds = playersToUpdate.map(p => p.steamId).join(',');
            try {
                const response = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`, {
                    params: {
                        key: STEAM_API_KEY,
                        steamids: steamIds
                    }
                });

                const steamPlayers = response.data?.response?.players || [];
                
                await Promise.all(steamPlayers.map(async (sp: any) => {
                    return (prisma.player as any).update({
                        where: { steamId: sp.steamid },
                        data: {
                            steamName: sp.personaname,
                            steamAvatar: sp.avatarfull,
                            updatedAt: new Date()
                        }
                    });
                }));

                players.forEach(p => {
                    const sp = steamPlayers.find((s: any) => s.steamid === p.steamId);
                    if (sp) {
                        (p as any).steamName = sp.personaname;
                        (p as any).steamAvatar = sp.avatarfull;
                    }
                });
            } catch (steamError) {
                console.error("[RankingAPI] Steam API Error:", steamError);
            }
        }

        // NOVO: Consultar "na hora" dados de players que não têm stats (Faceit/Premier) para eles não sumirem do site
        const playersNeedingStats = players.filter(p => !p.Stats || (!p.Stats.faceitLevel && !p.Stats.premierRating));
        
        if (playersNeedingStats.length > 0) {
            // Limit to 5 to avoid blocking the API for too long on first load
            const toUpdate = playersNeedingStats.slice(0, 5);
            
            await Promise.all(toUpdate.map(async (player) => {
                let currentStats = player.Stats;
                if (!currentStats) {
                    currentStats = await (prisma as any).stats.create({
                        data: { playerId: player.id }
                    });
                    (player as any).Stats = currentStats;
                }
                
                const updateData: any = {};
                let faceitNeedsUpdate = !currentStats.faceitLevel || currentStats.faceitLevel === 0;
                let premierNeedsUpdate = !currentStats.premierRating || currentStats.premierRating === 0;

                try {
                    const cs2space = await getCS2SpacePlayerInfo(player.steamId);
                    if (cs2space) {
                        if (premierNeedsUpdate && cs2space.ranks?.premier) {
                            updateData.premierRating = cs2space.ranks.premier;
                        }
                        if (faceitNeedsUpdate && cs2space.faceit) {
                            updateData.faceitLevel = cs2space.faceit.level || 0;
                            updateData.faceitElo = cs2space.faceit.elo || 0;
                            faceitNeedsUpdate = false;
                        }
                    }

                    if (faceitNeedsUpdate) {
                        const faceitData = await getFaceitPlayerBySteamId(player.steamId);
                        const faceitGame = faceitData?.games?.cs2 || (faceitData?.games as any)?.csgo;
                        if (faceitGame) {
                            updateData.faceitLevel = faceitGame.skill_level || 0;
                            updateData.faceitElo = faceitGame.faceit_elo || 0;
                        }
                    }

                    if (Object.keys(updateData).length > 0) {
                        const finalUpdate: any = {};
                        
                        if (updateData.premierRating !== undefined) {
                            finalUpdate.premierRating = Math.max(currentStats.premierRating || 0, updateData.premierRating);
                        }
                        
                        if (updateData.faceitElo !== undefined) {
                            finalUpdate.faceitElo = Math.max(currentStats.faceitElo || 0, updateData.faceitElo);
                        }

                        if (updateData.faceitLevel !== undefined) {
                            finalUpdate.faceitLevel = Math.max(currentStats.faceitLevel || 0, updateData.faceitLevel);
                        }

                        if (updateData.gcLevel !== undefined) {
                            finalUpdate.gcLevel = Math.max(currentStats.gcLevel || 0, updateData.gcLevel);
                        }

                        if (Object.keys(finalUpdate).length > 0) {
                            const updatedStats = await (prisma as any).stats.update({
                                where: { id: currentStats.id },
                                data: finalUpdate
                            });
                            (player as any).Stats = updatedStats;
                        }
                    }
                } catch (e) {
                    console.error("[RankingAPI] Auto-sync error for", player.steamId, e);
                }
            }));
        }

        // 3. Buscar Users correspondentes
        const allSteamIds = players.map(p => p.steamId);
        const users = await prisma.user.findMany({
            where: {
                steamId: { in: allSteamIds }
            },
            select: {
                steamId: true,
                name: true,
                image: true,
                winRate: true,
                adr: true,
                hsPercentage: true,
                matchesPlayed: true,
                steamMatchAuthCode: true,
                steamLatestMatchCode: true,
            }
        });

        const userMap = new Map(users.map(u => [u.steamId, u]));

        // 4. Buscar todos os registros de GlobalMatchPlayer para agregar por plataforma
        const allMatchPlayers = await (prisma as any).globalMatchPlayer.findMany({
            where: { steamId: { in: allSteamIds } },
            include: { 
                match: { 
                    select: { source: true, gameMode: true } 
                } 
            }
        });

        // 5. Agregar stats por player e plataforma
        const playerPlatformStats = new Map<string, any>();

        allMatchPlayers.forEach((p: any) => {
            const sid = p.steamId;
            if (!playerPlatformStats.has(sid)) {
                const empty = () => ({ kills: 0, deaths: 0, assists: 0, adrSum: 0, hsSum: 0, count: 0, wins: 0 });
                playerPlatformStats.set(sid, {
                    all: empty(), mix: empty(), premier: empty(), faceit: empty(), gc: empty()
                });
            }

            const pStats = playerPlatformStats.get(sid);
            const platform = detectPlatform(p.match.source, p.match.gameMode);

            const update = (bucket: any) => {
                bucket.kills += p.kills || 0;
                bucket.deaths += p.deaths || 0;
                bucket.assists += p.assists || 0;
                bucket.adrSum += (p.adr || 0);
                bucket.hsSum += (p.hsPercentage || 0);
                bucket.count++;
                if (p.matchResult?.toLowerCase() === 'win') bucket.wins++;
            };

            update(pStats.all);
            if (platform && pStats[platform]) update(pStats[platform]);
        });

        // 6. Mapear para o formato do frontend
        const rankedUsers = players
            .map(p => {
                const userData = userMap.get(p.steamId);
                const stats = p.Stats;
                const pStats = playerPlatformStats.get(p.steamId);
                
                // Função helper para calcular KDR/ADR/HS de um bucket
                const calculate = (b: any) => {
                    const kdr = b.deaths > 0 ? Math.round((b.kills / b.deaths) * 100) / 100 : b.kills > 0 ? b.kills : 0;
                    const adr = b.count > 0 ? Math.round(b.adrSum / b.count) : 0;
                    const hs = b.count > 0 ? Math.round(b.hsSum / b.count) : 0;
                    const wr = b.count > 0 ? `${Math.round((b.wins / b.count) * 100)}%` : 'N/A';
                    return { kdr, adr, hsPercentage: hs, matchesPlayed: b.count, winRate: wr };
                };

                const statsBreakdown: any = {
                    all: pStats ? calculate(pStats.all) : { kdr: 0, adr: 0, hsPercentage: 0, matchesPlayed: 0, winRate: 'N/A' },
                    mix: pStats ? calculate(pStats.mix) : { kdr: 0, adr: 0, hsPercentage: 0, matchesPlayed: 0, winRate: 'N/A' },
                    faceit: pStats ? calculate(pStats.faceit) : { kdr: 0, adr: 0, hsPercentage: 0, matchesPlayed: 0, winRate: 'N/A' },
                    premier: pStats ? calculate(pStats.premier) : { kdr: 0, adr: 0, hsPercentage: 0, matchesPlayed: 0, winRate: 'N/A' },
                    gc: pStats ? calculate(pStats.gc) : { kdr: 0, adr: 0, hsPercentage: 0, matchesPlayed: 0, winRate: 'N/A' },
                };

                // Fallback para dados legados do User se não houver GlobalMatchPlayer
                if (statsBreakdown.all.matchesPlayed === 0 && userData) {
                    statsBreakdown.all = {
                        kdr: 0,
                        adr: Math.round(userData.adr || 0),
                        hsPercentage: Math.round(userData.hsPercentage || 0),
                        matchesPlayed: userData.matchesPlayed || 0,
                        winRate: userData.winRate ? `${Math.round(userData.winRate)}%` : 'N/A'
                    };
                }

                const rating = stats?.premierRating || stats?.faceitElo || 0;

                return {
                    steamId: p.steamId,
                    nickname: userData?.name || (p as any).steamName || p.faceitName || `Player #${p.steamId.slice(-4)}`,
                    avatar: userData?.image || (p as any).steamAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.steamId}`,
                    rating,
                    ...statsBreakdown.all, // Padrão
                    stats: statsBreakdown,
                    hasSync: !!userData?.steamMatchAuthCode && !!userData?.steamLatestMatchCode,
                    trend: 'neutral' as const,
                    gcLevel: stats?.gcLevel || 0,
                    faceitLevel: stats?.faceitLevel || 0,
                    faceitElo: stats?.faceitElo || 0,
                };
            })
            .filter(user => !user.steamId.endsWith('_temp'));

        // Ordenar por rating decrescente (ou o critério principal)
        rankedUsers.sort((a, b) => b.rating - a.rating);

        const itemsWithRank = rankedUsers.map((user, index) => ({
            ...user,
            rank: index + 1
        }));

        // Estatísticas globais
        const totalPlayers = itemsWithRank.length;
        const avgRating = totalPlayers > 0
            ? Math.round(itemsWithRank.reduce((s, u) => s + u.rating, 0) / totalPlayers)
            : 0;
        const topRating = itemsWithRank[0]?.rating || 0;
        const topPlayer = itemsWithRank[0]?.nickname || '';
        const mostActive = [...itemsWithRank].sort((a, b) => b.matchesPlayed - a.matchesPlayed)[0];

        return NextResponse.json({
            players: itemsWithRank,
            community: {
                totalPlayers,
                avgRating,
                topRating,
                topPlayer,
                mostActiveName: mostActive?.nickname || '',
                mostActiveMatches: mostActive?.matchesPlayed || 0,
            }
        });
    } catch (error) {
        console.error("[RankingAPI] Error:", error);
        return NextResponse.json({ error: "Erro ao buscar ranking" }, { status: 500 });
    }
}
