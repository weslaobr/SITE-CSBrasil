import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Buscar as 30 partidas mais recentes de GlobalMatchPlayer
        const recentPlays = await (prisma as any).globalMatchPlayer.findMany({
            orderBy: { match: { matchDate: 'desc' } },
            take: 30,
            include: {
                match: { select: { mapName: true, matchDate: true } },
            }
        });

        // Buscar os players correspondentes para nomes e avatars
        const steamIds = [...new Set(recentPlays.map((p: any) => p.steamId))] as string[];

        const dbPlayers = await (prisma as any).player.findMany({
            where: { steamId: { in: steamIds } },
            select: { steamId: true, steamName: true, steamAvatar: true },
        });

        const users = await (prisma as any).user.findMany({
            where: { steamId: { in: steamIds } },
            select: { steamId: true, name: true, image: true },
        });

        const playerMap = new Map<string, { name: string; avatar: string }>();
        dbPlayers.forEach((p: any) => {
            playerMap.set(p.steamId, {
                name: p.steamName || `Player #${p.steamId.slice(-4)}`,
                avatar: p.steamAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.steamId}`,
            });
        });
        users.forEach((u: any) => {
            if (u.name || u.image) {
                playerMap.set(u.steamId, {
                    name: u.name || playerMap.get(u.steamId)?.name || 'Player',
                    avatar: u.image || playerMap.get(u.steamId)?.avatar || '',
                });
            }
        });

        // Montar eventos de atividade
        const events = recentPlays.map((play: any) => {
            const player = playerMap.get(play.steamId);
            const isWin = play.matchResult === 'win';
            const kda = `${play.kills}K/${play.deaths}D/${play.assists}A`;

            return {
                type: 'match' as const,
                steamId: play.steamId,
                playerName: player?.name || `Player`,
                playerAvatar: player?.avatar || '',
                mapName: play.match?.mapName || 'Unknown',
                result: play.matchResult,
                kda,
                adr: play.adr ? Math.round(play.adr) : null,
                date: play.match?.matchDate?.toISOString() || new Date().toISOString(),
                isWin,
            };
        });

        // Ordenar por data decrescente
        events.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({ events: events.slice(0, 20) });
    } catch (error) {
        console.error('[ActivityAPI] Error:', error);
        return NextResponse.json({ events: [] });
    }
}
