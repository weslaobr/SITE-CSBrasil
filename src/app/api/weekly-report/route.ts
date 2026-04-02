import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Esta rota gera e envia o relatório semanal da tropa no Discord.
// Pode ser chamada por um Vercel Cron Job toda segunda-feira às 09:00:
// No vercel.json: { "crons": [{ "path": "/api/weekly-report", "schedule": "0 12 * * 1" }] }

const DISCORD_WEBHOOK = process.env.DISCORD_WEEKLY_REPORT_WEBHOOK || '';

export async function POST(req: NextRequest) {
    // Verificar secret para evitar chamadas não autorizadas
    const secret = req.headers.get('x-cron-secret');
    if (secret && secret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!DISCORD_WEBHOOK) {
        return NextResponse.json({ error: 'DISCORD_WEEKLY_REPORT_WEBHOOK não configurado' }, { status: 400 });
    }

    try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        // Partidas da semana
        const weeklyPlays = await (prisma as any).globalMatchPlayer.findMany({
            where: { match: { matchDate: { gte: weekAgo } } },
            include: { match: true },
        });

        if (weeklyPlays.length === 0) {
            return NextResponse.json({ message: 'Nenhuma partida esta semana, relatório não enviado.' });
        }

        // Agregar stats por jogador
        const playerStats: Record<string, {
            steamId: string;
            matches: number;
            wins: number;
            totalKills: number;
            totalDeaths: number;
            totalAdr: number;
            adrCount: number;
        }> = {};

        for (const play of weeklyPlays) {
            if (!playerStats[play.steamId]) {
                playerStats[play.steamId] = {
                    steamId: play.steamId,
                    matches: 0,
                    wins: 0,
                    totalKills: 0,
                    totalDeaths: 0,
                    totalAdr: 0,
                    adrCount: 0,
                };
            }
            const ps = playerStats[play.steamId];
            ps.matches++;
            if (play.matchResult === 'win') ps.wins++;
            ps.totalKills += play.kills || 0;
            ps.totalDeaths += play.deaths || 0;
            if (play.adr != null) { ps.totalAdr += play.adr; ps.adrCount++; }
        }

        // Buscar nomes dos jogadores
        const steamIds = Object.keys(playerStats);
        const dbPlayers = await (prisma as any).player.findMany({
            where: { steamId: { in: steamIds } },
            select: { steamId: true, steamName: true },
        });
        const nameMap = new Map(dbPlayers.map((p: any) => [p.steamId, p.steamName || `Player ${p.steamId.slice(-4)}`]));

        // Calcular rankings
        const ranked = Object.values(playerStats).map(ps => ({
            ...ps,
            name: nameMap.get(ps.steamId) || `Player`,
            kdr: ps.totalDeaths > 0 ? ps.totalKills / ps.totalDeaths : ps.totalKills,
            avgAdr: ps.adrCount > 0 ? Math.round(ps.totalAdr / ps.adrCount) : 0,
            winRate: ps.matches > 0 ? Math.round((ps.wins / ps.matches) * 100) : 0,
        }));

        const mostMatches = [...ranked].sort((a, b) => b.matches - a.matches)[0];
        const bestKdr = [...ranked].sort((a, b) => b.kdr - a.kdr)[0];
        const bestAdr = [...ranked].sort((a, b) => b.avgAdr - a.avgAdr)[0];
        const bestWr = [...ranked].filter(p => p.matches >= 3).sort((a, b) => b.winRate - a.winRate)[0];

        // Mudancas de rating (quem subiu mais)
        let biggestRise: { name: string; change: number } | null = null;
        try {
            const snapshots = await (prisma as any).ratingSnapshot.findMany({
                where: { createdAt: { gte: weekAgo }, source: 'premier' },
                orderBy: { createdAt: 'asc' },
            });

            const riseMap: Record<string, { first: number; last: number }> = {};
            for (const s of snapshots) {
                if (!riseMap[s.steamId]) riseMap[s.steamId] = { first: s.rating, last: s.rating };
                else riseMap[s.steamId].last = s.rating;
            }
            const rises = Object.entries(riseMap)
                .map(([sid, { first, last }]) => ({ steamId: sid, change: last - first }))
                .filter(r => r.change > 0)
                .sort((a, b) => b.change - a.change);

            if (rises.length > 0) {
                biggestRise = {
                    name: nameMap.get(rises[0].steamId) as string || `Player`,
                    change: rises[0].change,
                };
            }
        } catch (_) {}

        // Top 5 partidas da semana
        const top5 = [...ranked].sort((a, b) => b.matches - a.matches).slice(0, 5);

        // Montar embed Discord
        const now = new Date();
        const embed = {
            title: '📊 Relatório Semanal da Tropa',
            color: 0xF5C518,
            description: `Semana de **${weekAgo.toLocaleDateString('pt-BR')}** a **${now.toLocaleDateString('pt-BR')}** • **${weeklyPlays.length}** partidas registradas`,
            fields: [
                ...(mostMatches ? [{
                    name: '🎮 Mais Ativo da Semana',
                    value: `**${mostMatches.name}** — ${mostMatches.matches} partidas`,
                    inline: true,
                }] : []),
                ...(bestKdr ? [{
                    name: '⚔️ Melhor KDR',
                    value: `**${bestKdr.name}** — ${bestKdr.kdr.toFixed(2)}`,
                    inline: true,
                }] : []),
                ...(bestAdr ? [{
                    name: '💥 Maior ADR',
                    value: `**${bestAdr.name}** — ${bestAdr.avgAdr}`,
                    inline: true,
                }] : []),
                ...(bestWr ? [{
                    name: '🏆 Melhor Win Rate',
                    value: `**${bestWr.name}** — ${bestWr.winRate}% (${bestWr.matches} jogos)`,
                    inline: true,
                }] : []),
                ...(biggestRise ? [{
                    name: '📈 Maior Subida de SR',
                    value: `**${biggestRise.name}** — +${biggestRise.change.toLocaleString()} SR`,
                    inline: true,
                }] : []),
                {
                    name: '📋 Ranking da Semana',
                    value: top5.map((p, i) =>
                        `**${i + 1}.** ${p.name} — ${p.matches}🎮 ${p.kdr.toFixed(2)}KDR ${p.winRate}%WR`
                    ).join('\n'),
                    inline: false,
                },
            ],
            footer: { text: 'TropaCS • Stats automáticas da semana' },
            timestamp: now.toISOString(),
        };

        const discordRes = await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed], username: 'TropaCS Stats', avatar_url: 'https://i.imgur.com/wSTFkRM.png' }),
        });

        if (!discordRes.ok) {
            throw new Error(`Discord webhook falhou: ${discordRes.status}`);
        }

        return NextResponse.json({ success: true, playerCount: ranked.length, matchCount: weeklyPlays.length });
    } catch (error: any) {
        console.error('[WeeklyReport] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET para confirmar que a rota existe (útil para Vercel Cron)
export async function GET() {
    return NextResponse.json({ message: 'Weekly Report API — use POST to trigger' });
}
