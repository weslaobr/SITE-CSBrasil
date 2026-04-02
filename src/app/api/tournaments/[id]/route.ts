import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

type Context = { params: { id: string } };

// GET /api/tournaments/[id]
export async function GET(_req: NextRequest, { params }: Context) {
    try {
        const tournament = await (prisma as any).tournament.findUnique({
            where: { id: params.id },
            include: {
                teams: true,
                matches: {
                    include: { teamA: true, teamB: true, winner: true },
                    orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
                },
            },
        });
        if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(tournament);
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao buscar torneio' }, { status: 500 });
    }
}

// PATCH /api/tournaments/[id] — atualizar placar de uma partida
export async function PATCH(req: NextRequest, { params }: Context) {
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { matchId, scoreA, scoreB, winnerId, status } = body;

        const updated = await (prisma as any).tournamentMatch.update({
            where: { id: matchId },
            data: {
                scoreA: scoreA ?? undefined,
                scoreB: scoreB ?? undefined,
                winnerId: winnerId ?? undefined,
                status: status ?? 'DONE',
            },
            include: { teamA: true, teamB: true, winner: true },
        });

        // Verificar se o torneio terminou (todas as partidas done)
        const allMatches = await (prisma as any).tournamentMatch.findMany({
            where: { tournamentId: params.id },
        });
        const allDone = allMatches.every((m: any) => m.status === 'DONE');
        if (allDone) {
            await (prisma as any).tournament.update({
                where: { id: params.id },
                data: { status: 'FINISHED' },
            });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('[TournamentsAPI] PATCH error:', error);
        return NextResponse.json({ error: 'Erro ao atualizar partida' }, { status: 500 });
    }
}

// DELETE /api/tournaments/[id]
export async function DELETE(req: NextRequest, { params }: Context) {
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await (prisma as any).tournament.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao deletar torneio' }, { status: 500 });
    }
}
