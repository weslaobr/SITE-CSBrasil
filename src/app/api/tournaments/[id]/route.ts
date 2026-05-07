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
                TournamentTeam: true,
                TournamentMatch: {
                    include: { 
                        TournamentTeam_TournamentMatch_teamAIdToTournamentTeam: true, 
                        TournamentTeam_TournamentMatch_teamBIdToTournamentTeam: true, 
                        TournamentTeam_TournamentMatch_winnerIdToTournamentTeam: true 
                    },
                    orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
                },
            },
        });
        if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        
        // Map back to expected names for frontend
        const formattedTournament = {
            ...tournament,
            teams: (tournament as any).TournamentTeam,
            matches: (tournament as any).TournamentMatch?.map((m: any) => ({
                ...m,
                teamA: m.TournamentTeam_TournamentMatch_teamAIdToTournamentTeam,
                teamB: m.TournamentTeam_TournamentMatch_teamBIdToTournamentTeam,
                winner: m.TournamentTeam_TournamentMatch_winnerIdToTournamentTeam
            }))
        };
        
        return NextResponse.json(formattedTournament);
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
            include: { 
                TournamentTeam_TournamentMatch_teamAIdToTournamentTeam: true, 
                TournamentTeam_TournamentMatch_teamBIdToTournamentTeam: true, 
                TournamentTeam_TournamentMatch_winnerIdToTournamentTeam: true 
            },
        });

        const formattedMatch = {
            ...updated,
            teamA: (updated as any).TournamentTeam_TournamentMatch_teamAIdToTournamentTeam,
            teamB: (updated as any).TournamentTeam_TournamentMatch_teamBIdToTournamentTeam,
            winner: (updated as any).TournamentTeam_TournamentMatch_winnerIdToTournamentTeam
        };

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

        return NextResponse.json(formattedMatch);
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
