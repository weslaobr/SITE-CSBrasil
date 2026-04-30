import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

/**
 * POST /api/admin/recalculate-match-elo
 * Body: { matchId: string }
 *
 * Reverte o eloChange anterior de todos os jogadores da partida,
 * recalcula com a lógica atual e reaplicar, atualizando também
 * o rankingPoints e mixLevel de cada User cadastrado.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(getAuthOptions());
    if (!(session?.user as any)?.isAdmin) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { matchId } = await req.json();
    if (!matchId) {
        return NextResponse.json({ error: 'matchId obrigatório' }, { status: 400 });
    }

    // 1. Verificar se é partida MIX
    const match = await prisma.globalMatch.findUnique({
        where: { id: matchId },
        include: { players: true }
    });

    if (!match) {
        return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 });
    }

    if ((match.source || '').toLowerCase() !== 'mix') {
        return NextResponse.json({ error: 'Tropoints só são calculados para partidas MIX.' }, { status: 400 });
    }

    const players = match.players;
    let updated = 0;

    for (const p of players) {
        const kills   = p.kills   ?? 0;
        const deaths  = p.deaths  ?? 0;
        const adr     = Number(p.adr   ?? 0);
        const mvps    = p.mvps    ?? 0;
        const result  = (p.matchResult ?? '').toLowerCase();

        // ── Novo cálculo (mesmo critério do db_connector.py) ────────────────
        let newEloChange = 0;
        if (result === 'win')  newEloChange = 15;
        if (result === 'loss') newEloChange = -10;

        if (result === 'win' || result === 'loss') {
            if (kills > deaths)          newEloChange += 2;
            else if (deaths > kills + 3) newEloChange -= 2;
            if (adr > 90)                newEloChange += 3;
            else if (adr < 50)           newEloChange -= 2;
            newEloChange += mvps * 1;
        }

        // ── Atualizar o registro do jogador na partida ───────────────────────
        const oldEloChange = p.eloChange ?? 0;
        await prisma.globalMatchPlayer.update({
            where: { id: p.id },
            data: { eloChange: newEloChange }
        });

        // ── Se tem userId, ajustar rankingPoints do usuário ──────────────────
        if (p.userId) {
            const diff = newEloChange - oldEloChange;

            // Buscar saldo atual
            const user = await prisma.user.findUnique({ where: { id: p.userId } });
            if (user) {
                const newPoints = Math.max(0, (user.rankingPoints ?? 500) + diff);

                // Calcular nível correto
                const newLevel = getLevel(newPoints);

                await prisma.user.update({
                    where: { id: p.userId },
                    data: { rankingPoints: newPoints, mixLevel: newLevel }
                });
            }
            updated++;
        }
    }

    return NextResponse.json({
        success: true,
        message: `Tropoints recalculados para ${players.length} jogadores (${updated} usuário(s) cadastrado(s) atualizado(s)).`,
        matchId,
        playersCount: players.length,
        usersUpdated: updated
    });
}

// Tabela de níveis — idêntica ao mix-level.ts
function getLevel(pts: number): number {
    const table = [
        [1, 0, 299], [2, 300, 499], [3, 500, 699], [4, 700, 899],
        [5, 900, 1099], [6, 1100, 1349], [7, 1350, 1599], [8, 1600, 1899],
        [9, 1900, 2199], [10, 2200, 2549], [11, 2550, 2899], [12, 2900, 3299],
        [13, 3300, 3749], [14, 3750, 4249], [15, 4250, 4799], [16, 4800, 5399],
        [17, 5400, 5999], [18, 6000, 6699], [19, 6700, 7499], [20, 7500, 999999]
    ];
    for (const [lv, mn, mx] of table) {
        if (pts >= mn && pts <= mx) return lv;
    }
    return 1;
}
