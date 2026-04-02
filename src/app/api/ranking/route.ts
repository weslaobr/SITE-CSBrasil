import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

const STEAM_API_KEY = process.env.STEAM_API_KEY;

export async function GET() {
    try {
        // 1. Buscar Players com Stats
        const players = await prisma.player.findMany({
            include: {
                Stats: true,
            },
            take: 100,
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
            }
        });

        const userMap = new Map(users.map(u => [u.steamId, u]));

        // 4. Buscar stats agregados de GlobalMatchPlayer por steamId
        const matchStats = await (prisma as any).globalMatchPlayer.groupBy({
            by: ['steamId'],
            where: {
                steamId: { in: allSteamIds }
            },
            _count: { id: true },
            _avg: {
                adr: true,
                hsPercentage: true,
            },
            _sum: {
                kills: true,
                deaths: true,
                assists: true,
            },
        });

        // Calcular win rate por steamId a partir de partidas
        const winData = await (prisma as any).globalMatchPlayer.groupBy({
            by: ['steamId', 'matchResult'],
            where: {
                steamId: { in: allSteamIds }
            },
            _count: { id: true },
        });

        type WinEntry = { steamId: string; matchResult: string; _count: { id: number } };
        const winMap = new Map<string, { wins: number; total: number }>();
        (winData as WinEntry[]).forEach((entry) => {
            if (!winMap.has(entry.steamId)) {
                winMap.set(entry.steamId, { wins: 0, total: 0 });
            }
            const curr = winMap.get(entry.steamId)!;
            curr.total += entry._count.id;
            if (entry.matchResult === 'win') curr.wins += entry._count.id;
        });

        type MatchStatEntry = {
            steamId: string;
            _count: { id: number };
            _avg: { adr: number | null; hsPercentage: number | null };
            _sum: { kills: number | null; deaths: number | null; assists: number | null };
        };
        const matchStatsMap = new Map<string, MatchStatEntry>(
            (matchStats as MatchStatEntry[]).map(s => [s.steamId, s])
        );

        // 5. Mapear para o formato do frontend
        const rankedUsers = players
            .map(p => {
                const userData = userMap.get(p.steamId);
                const stats = p.Stats;
                const rating = stats?.premierRating || stats?.faceitElo || 0;
                const mStat = matchStatsMap.get(p.steamId);
                const wData = winMap.get(p.steamId);

                // Partidas
                const matchesPlayed = mStat?._count?.id || userData?.matchesPlayed || 0;

                // KDR
                const totalKills = mStat?._sum?.kills || 0;
                const totalDeaths = mStat?._sum?.deaths || 0;
                const kdr = totalDeaths > 0 ? Math.round((totalKills / totalDeaths) * 100) / 100 : totalKills > 0 ? totalKills : 0;

                // ADR
                const adr = mStat?._avg?.adr
                    ? Math.round(mStat._avg.adr)
                    : userData?.adr
                    ? Math.round(userData.adr)
                    : 0;

                // HS%
                const hsPercentage = mStat?._avg?.hsPercentage
                    ? Math.round(mStat._avg.hsPercentage)
                    : userData?.hsPercentage
                    ? Math.round(userData.hsPercentage)
                    : 0;

                // Win Rate
                let winRate = 'N/A';
                if (wData && wData.total > 0) {
                    winRate = `${Math.round((wData.wins / wData.total) * 100)}%`;
                } else if (userData?.winRate) {
                    winRate = `${Math.round(userData.winRate)}%`;
                }

                return {
                    steamId: p.steamId,
                    nickname: userData?.name || (p as any).steamName || p.faceitName || `Player #${p.steamId.slice(-4)}`,
                    avatar: userData?.image || (p as any).steamAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.steamId}`,
                    rating,
                    winRate,
                    adr,
                    hsPercentage,
                    kdr,
                    matchesPlayed,
                    trend: 'neutral' as const,
                    gcLevel: stats?.gcLevel || 0,
                    faceitLevel: stats?.faceitLevel || 0,
                    faceitElo: stats?.faceitElo || 0,
                };
            })
            .filter(user => !user.steamId.endsWith('_temp') && user.rating > 0);

        // Ordenar por rating decrescente
        rankedUsers.sort((a, b) => b.rating - a.rating);

        const itemsWithRank = rankedUsers.map((user, index) => ({
            ...user,
            rank: index + 1
        }));

        // 6. Estatísticas globais da comunidade
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
