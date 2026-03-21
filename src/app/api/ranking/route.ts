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

        // 2. Identificar players que precisam de atualização de perfil (sem nome ou avatar)
        // Ou que não foram atualizados há mais de 24 horas (opcional, vamos simplificar para "sem nome/avatar")
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
                
                // Atualizar o banco de dados em um loop (ou Promise.all)
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

                // Atualizar a lista local de players com os novos dados
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

        // 3. Buscar Users correspondentes (para quem já logou, o nome do site tem prioridade)
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
                adr: true
            }
        });

        const userMap = new Map(users.map(u => [u.steamId, u]));

        // 4. Mapear para o formato do frontend
        const rankedUsers = players.map(p => {
            const userData = userMap.get(p.steamId);
            const stats = p.Stats;
            const rating = stats?.premierRating || stats?.faceitElo || 0;

            return {
                steamId: p.steamId,
                // Prioridade: Nome do Site > Nome da Steam > Placeholder
                nickname: userData?.name || (p as any).steamName || p.faceitName || `Player #${p.steamId.slice(-4)}`,
                // Prioridade: Foto do Site > Foto da Steam > Placeholder
                avatar: userData?.image || (p as any).steamAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.steamId}`,
                rating: rating,
                winRate: userData?.winRate ? `${Math.round(userData.winRate)}%` : "N/A",
                adr: userData?.adr || 0,
                trend: 'neutral' as const,
                gcLevel: stats?.gcLevel || 0,
                faceitLevel: stats?.faceitLevel || 0
            };
        });

        // Ordenar por rating decrescente
        rankedUsers.sort((a, b) => b.rating - a.rating);

        const itemsWithRank = rankedUsers.map((user, index) => ({
            ...user,
            rank: index + 1
        }));

        return NextResponse.json(itemsWithRank);
    } catch (error) {
        console.error("[RankingAPI] Error:", error);
        return NextResponse.json({ error: "Erro ao buscar ranking" }, { status: 500 });
    }
}
