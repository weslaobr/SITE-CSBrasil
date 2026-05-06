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

    try {
        const { calculateMatchTropoints } = await import('@/services/ranking-service');
        const result = await calculateMatchTropoints(matchId);

        return NextResponse.json({
            success: true,
            message: `Tropoints recalculados com sucesso para ${result.updatedPlayers} jogadores.`,
            ...result
        });
    } catch (error: any) {
        console.error('[Recalculate Elo Error]', error);
        return NextResponse.json({ 
            error: error.message || 'Falha ao recalcular elo' 
        }, { status: 500 });
    }
}


