import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MAP_IMAGES: Record<string, string> = {
    'Mirage': '/img/maps/Mirage.webp',
    'Inferno': '/img/maps/Inferno.webp',
    'Nuke': '/img/maps/Nuke.webp',
    'Overpass': '/img/maps/Overpass.webp',
    'Ancient': '/img/maps/Ancient.webp',
    'Anubis': '/img/maps/Anubis.webp',
    'Dust2': '/img/maps/Dust2.webp',
    'Cache': '/img/maps/Cache.png',
    'Train': '/img/maps/Train.webp',
    'Cobblestone': '/img/maps/Cobblestone.png',
    'de_mirage': '/img/maps/Mirage.webp',
    'de_inferno': '/img/maps/Inferno.webp',
    'de_nuke': '/img/maps/Nuke.webp',
    'de_overpass': '/img/maps/Overpass.webp',
    'de_ancient': '/img/maps/Ancient.webp',
    'de_anubis': '/img/maps/Anubis.webp',
    'de_dust2': '/img/maps/Dust2.webp',
    'de_cache': '/img/maps/Cache.png',
    'de_train': '/img/maps/Train.webp',
    'de_cbble': '/img/maps/Cobblestone.png',
};

function normalizeMapName(raw: string): string {
    const lower = raw.toLowerCase().replace('de_', '');
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function getMapImage(mapName: string): string {
    if (MAP_IMAGES[mapName]) return MAP_IMAGES[mapName];
    const normalized = normalizeMapName(mapName);
    return MAP_IMAGES[normalized] || `/img/maps/${normalized}.webp`;
}

export async function GET() {
    try {
        // Buscar todas as partidas globais usando any para compatibilidade
        const matches = await (prisma as any).globalMatch.findMany({
            include: {
                players: {
                    select: {
                        userId: true,
                        matchResult: true,
                        kills: true,
                        deaths: true,
                        assists: true,
                        adr: true,
                    }
                }
            },
            orderBy: { matchDate: 'desc' }
        });

        // Agregar por mapa
        const mapAgg: Record<string, {
            mapName: string;
            total: number;
            wins: number;
            totalKills: number;
            totalDeaths: number;
            totalAdr: number;
            adrCount: number;
            lastPlayed: string;
        }> = {};

        for (const match of matches) {
            const key = normalizeMapName(match.mapName);

            if (!mapAgg[key]) {
                mapAgg[key] = {
                    mapName: key,
                    total: 0,
                    wins: 0,
                    totalKills: 0,
                    totalDeaths: 0,
                    totalAdr: 0,
                    adrCount: 0,
                    lastPlayed: match.matchDate?.toISOString() || '',
                };
            }

            const agg = mapAgg[key];
            agg.total += 1;

            // Determinar vitória da tropa: 
            // 1. Se houver membros registrados (userId != null), basta um deles ter ganho
            // 2. Fallback para dados legados ou se não houver userId: checa se alguém ganhou (menos preciso)
            const members = match.players.filter((p: any) => p.userId !== null);
            let isWin = false;

            if (members.length > 0) {
                isWin = members.some((p: any) => p.matchResult?.toLowerCase() === 'win');
            } else {
                // Se não há userId populado (dados antigos), checamos se houve vitória.
                // Num 5v5 completo, sempre há 5 vitórias, então isso daria 100% WR.
                // Para evitar isso, vamos ser mais rigorosos no fallback:
                const winCount = match.players.filter((p: any) => p.matchResult?.toLowerCase() === 'win').length;
                const lossCount = match.players.filter((p: any) => p.matchResult?.toLowerCase() === 'loss').length;
                isWin = winCount > lossCount; // Isso geralmente falha (5 v 5), o que é seguro
            }

            if (isWin) agg.wins += 1;

            for (const p of match.players) {
                agg.totalKills += p.kills || 0;
                agg.totalDeaths += p.deaths || 0;
                if (p.adr != null) {
                    agg.totalAdr += p.adr;
                    agg.adrCount += 1;
                }
            }

            // Manter a partida mais recente
            if (match.matchDate && match.matchDate.toISOString() > agg.lastPlayed) {
                agg.lastPlayed = match.matchDate.toISOString();
            }
        }

        // Montar resposta
        const mapStats = Object.values(mapAgg).map(agg => ({
            mapName: agg.mapName,
            image: getMapImage(agg.mapName),
            total: agg.total,
            wins: agg.wins,
            losses: agg.total - agg.wins,
            winRate: agg.total > 0 ? Math.round((agg.wins / agg.total) * 100) : 0,
            avgKills: agg.total > 0 ? Math.round((agg.totalKills / agg.total / 10) * 10) / 10 : 0,
            avgAdr: agg.adrCount > 0 ? Math.round(agg.totalAdr / agg.adrCount) : 0,
            kdr: agg.totalDeaths > 0 ? Math.round((agg.totalKills / agg.totalDeaths) * 100) / 100 : 0,
            lastPlayed: agg.lastPlayed,
        })).sort((a, b) => b.total - a.total);

        const totalMatches = mapStats.reduce((s, m) => s + m.total, 0);

        return NextResponse.json({ maps: mapStats, totalMatches });
    } catch (error) {
        console.error('[MapsAPI] Error:', error);
        return NextResponse.json({ error: 'Erro ao buscar stats de mapas' }, { status: 500 });
    }
}
