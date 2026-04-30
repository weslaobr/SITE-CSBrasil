import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';
import { getFaceitPlayerBySteamId } from "@/services/faceit-service";
import { getCS2SpacePlayerInfo } from "@/services/cs2space-service";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STEAM_API_KEY = process.env.STEAM_API_KEY;

function detectPlatform(source: string, metadata: any): 'mix' | 'premier' | 'faceit' | 'gc' | null {
    try {
        const src = (source || '').toLowerCase();
        
        // Mix matches: local uploads, demo processor, or manually tagged
        if (['mix', 'demo', 'local'].some(s => src.includes(s))) return 'mix';
        
        if (src === 'leetify') {
            const mode = (metadata?.gameMode || metadata?.data_source || '').toLowerCase();
            if (mode.includes('faceit')) return 'faceit';
            if (mode.includes('gamersclub') || mode === 'gc') return 'gc';
            if (mode.includes('mix') || mode.includes('demo')) return 'mix';
            return 'premier';
        }
        
        if (src.includes('faceit')) return 'faceit';
        if (src.includes('gamersclub') || src === 'gc') return 'gc';
        if (src.includes('premier') || src === 'matchmaking' || src === 'steam') return 'premier';
    } catch (e) {
        console.error("[RankingAPI] Platform detection error:", e);
    }
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
                let faceitNeedsUpdate = !currentStats || !currentStats.faceitLevel || currentStats.faceitLevel === 0;
                let premierNeedsUpdate = !currentStats || !currentStats.premierRating || currentStats.premierRating === 0;

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
                            finalUpdate.premierRating = Math.max((currentStats as any).premierRating || 0, updateData.premierRating);
                        }
                        
                        if (updateData.faceitElo !== undefined) {
                            finalUpdate.faceitElo = Math.max((currentStats as any).faceitElo || 0, updateData.faceitElo);
                        }

                        if (updateData.faceitLevel !== undefined) {
                            finalUpdate.faceitLevel = Math.max((currentStats as any).faceitLevel || 0, updateData.faceitLevel);
                        }

                        if (updateData.gcLevel !== undefined) {
                            finalUpdate.gcLevel = Math.max((currentStats as any).gcLevel || 0, updateData.gcLevel);
                        }

                        if (Object.keys(finalUpdate).length > 0) {
                            const updatedStats = await (prisma as any).stats.update({
                                where: { id: (currentStats as any).id },
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
                rankingPoints: true,
                mixLevel: true,
                steamMatchAuthCode: true,
                steamLatestMatchCode: true,
                matches: {
                    select: {
                        source: true,
                        gameMode: true,
                        matchDate: true,
                        mapName: true,
                        result: true,
                        score: true,
                        kills: true,
                        deaths: true,
                        assists: true,
                        adr: true,
                        hsPercentage: true
                    }
                }
            } as any
        });

        const userMap = new Map<any, any>(users.map(u => [u.steamId, u]));

        // 4. Buscar todos os registros de GlobalMatchPlayer para agregar por plataforma
        const allMatchPlayers = await (prisma as any).globalMatchPlayer.findMany({
            where: { steamId: { in: allSteamIds } },
            include: { 
                match: { 
                    select: { 
                        source: true, 
                        metadata: true,
                        matchDate: true,
                        mapName: true
                    } 
                } 
            }
        });

        // 5. Agregar stats por player e plataforma com desduplicação
        const playerPlatformStats = new Map<string, any>();
        const processedMatches = new Set<string>(); // Key: steamId + map + time_bin

        // Função de utilidade para normalizar dados de ambas as tabelas
        const processMatchData = (sid: string, mData: any, pStats: any) => {
            const matchTime = new Date(mData.matchDate).getTime();
            const timeBin = Math.floor(matchTime / (15 * 60 * 1000));
            const mapNorm = (mData.mapName || '').toLowerCase().replace('de_', '').trim();
            const dedupeKey = `${sid}_${mapNorm}_${timeBin}`;
            
            if (processedMatches.has(dedupeKey)) return;
            processedMatches.add(dedupeKey);

            if (!playerPlatformStats.has(sid)) {
                const empty = () => ({ kills: 0, deaths: 0, assists: 0, adrSum: 0, hsSum: 0, ratingSum: 0, count: 0, wins: 0 });
                playerPlatformStats.set(sid, {
                    all: empty(), mix: empty(), premier: empty(), faceit: empty(), gc: empty()
                });
            }

            const pStatsBucket = playerPlatformStats.get(sid);
            const platform = detectPlatform(mData.source || mData.gameMode, mData.metadata || mData);

            const update = (bucket: any) => {
                // ADR robust extraction
                const adrVal = mData.adr ?? mData.dpr ?? mData.average_damage_per_round ?? mData.avg_adr ?? 0;
                bucket.adrSum += Number(adrVal);

                // Kills/Deaths/Assists
                bucket.kills += Number(mData.kills || 0);
                bucket.deaths += Number(mData.deaths || 0);
                bucket.assists += Number(mData.assists || 0);

                // HS robust extraction
                const hsVal = mData.hsPercentage ?? mData.hs_percentage ?? mData.headshot_percentage ?? mData.hs_pct ?? 0;
                bucket.hsSum += Number(hsVal);
                
                // Extrair rating da partida se disponível (escala 0.0-2.0)
                const matchRating = Number(mData.rating || mData.leetify_rating || mData.rating2 || 0);
                if (matchRating > 0) bucket.ratingSum += matchRating;

                bucket.count++;
                
                // Determinação de resultado consistente
                const resLower = (mData.matchResult || mData.result || '').toLowerCase();
                if (resLower === 'win') {
                    bucket.wins++;
                } else if (resLower === 'loss' || resLower === 'defeat') {
                    // Perda
                } else if (mData.scoreA != null && mData.scoreB != null) {
                    const isA = !mData.team || ['A', 'CT', '2'].includes(String(mData.team).toUpperCase());
                    if (isA ? mData.scoreA > mData.scoreB : mData.scoreB > mData.scoreA) bucket.wins++;
                }
            };

            update(pStatsBucket.all);
            if (platform && pStatsBucket[platform]) update(pStatsBucket[platform]);
        };

        // Processar GlobalMatchPlayer
        allMatchPlayers.forEach((p: any) => {
            if (!p.match) return;
            processMatchData(p.steamId, { ...p, ...p.match }, null);
        });

        // Processar Match (Tabela de usuários)
        users.forEach((u: any) => {
            if (!u.matches) return;
            u.matches.forEach((m: any) => {
                processMatchData(u.steamId, m, null);
            });
        });

        // 6. Mapear para o formato do frontend
        const rankedUsers = players
            .map(p => {
                const userData = userMap.get(p.steamId) as any;
                const stats = p.Stats;
                const pStats = playerPlatformStats.get(p.steamId);
                
                // Função helper para calcular KDR/ADR/HS de um bucket
                const calculate = (b: any, platformKey: string) => {
                    const kdr = b.deaths > 0 ? Math.round((b.kills / b.deaths) * 100) / 100 : b.kills > 0 ? b.kills : 0;
                    const adr = b.count > 0 ? Math.round(b.adrSum / b.count) : 0;
                    const hs = b.count > 0 ? Math.round(b.hsSum / b.count) : 0;
                    const wr = b.count > 0 ? `${Math.round((b.wins / b.count) * 100)}%` : 'N/A';
                    
                    // Pontos por plataforma:
                    // Prioridade 1: Dados sincronizados da tabela Stats (SR/ELO)
                    // Prioridade 2: Média de Rating das partidas (Leetify/Bot)
                    // Prioridade 3: ADR (como fallback final)
                    
                    let rating = stats?.premierRating || 0;
                    
                    return { kdr, adr, hsPercentage: hs, matchesPlayed: b.count, winRate: wr, rating };
                };

                const statsBreakdown: any = {
                    all: calculate(pStats?.all || { deaths: 0, kills: 0, assists: 0, adrSum: 0, hsSum: 0, ratingSum: 0, count: 0, wins: 0 }, 'all'),
                    mix: calculate(pStats?.mix || { deaths: 0, kills: 0, assists: 0, adrSum: 0, hsSum: 0, ratingSum: 0, count: 0, wins: 0 }, 'mix'),
                    faceit: calculate(pStats?.faceit || { deaths: 0, kills: 0, assists: 0, adrSum: 0, hsSum: 0, ratingSum: 0, count: 0, wins: 0 }, 'faceit'),
                    premier: calculate(pStats?.premier || { deaths: 0, kills: 0, assists: 0, adrSum: 0, hsSum: 0, ratingSum: 0, count: 0, wins: 0 }, 'premier'),
                    gc: calculate(pStats?.gc || { deaths: 0, kills: 0, assists: 0, adrSum: 0, hsSum: 0, ratingSum: 0, count: 0, wins: 0 }, 'gc'),
                };

                // Fallback para dados legados do User se não houver GlobalMatchPlayer
                if (statsBreakdown.all.matchesPlayed === 0 && userData) {
                    statsBreakdown.all = {
                        kdr: 0,
                        adr: Math.round(Number(userData.adr || 0)),
                        hsPercentage: Math.round(Number(userData.hsPercentage || 0)),
                        matchesPlayed: Number(userData.matchesPlayed || 0),
                        winRate: userData.winRate ? `${Math.round(Number(userData.winRate))}%` : 'N/A'
                    };
                }

                // Rating Global: Premier > Faceit > ADR
                let rating = stats?.premierRating || stats?.faceitElo || 0;
                if (rating === 0) rating = statsBreakdown.all.rating || statsBreakdown.all.adr || 0;

                return {
                    steamId: p.steamId,
                    nickname: userData?.name || (p as any).steamName || p.faceitName || `Player #${p.steamId.slice(-4)}`,
                    avatar: userData?.image || (p as any).steamAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.steamId}`,
                    rating: rating || 0,
                    ...statsBreakdown.all, // Padrão
                    stats: statsBreakdown,
                    hasSync: !!userData?.steamMatchAuthCode && !!userData?.steamLatestMatchCode,
                    trend: 'neutral' as const,
                    gcLevel: stats?.gcLevel || 0,
                    faceitLevel: stats?.faceitLevel || 0,
                    faceitElo: stats?.faceitElo || 0,
                    rankingPoints: (userData as any)?.rankingPoints ?? 500,
                    mixLevel: (userData as any)?.mixLevel ?? 5,
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
