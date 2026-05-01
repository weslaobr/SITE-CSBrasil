import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { getMixLevelFromPoints } from '@/lib/mix-level';


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

                // Calcular nível correto usando o utilitário padrão
                const newLevel = getMixLevelFromPoints(newPoints).level;


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


