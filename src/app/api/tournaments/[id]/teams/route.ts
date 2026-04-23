import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

type Context = { params: { id: string } };

// POST /api/tournaments/[id]/teams - Adicionar novo time
export async function POST(req: NextRequest, { params }: Context) {
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, playerIds } = body;

        if (!name) {
            return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
        }

        const tournament = await (prisma as any).tournament.findUnique({
            where: { id: params.id },
            include: { teams: true },
        });

        if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Adicionar o time e gerar partidas contra todos os times existentes (Round Robin)
        const newTeam = await (prisma as any).$transaction(async (tx: any) => {
            const team = await tx.tournamentTeam.create({
                data: {
                    tournamentId: params.id,
                    name,
                    playerIds: playerIds || [],
                },
            });

            // Criar partidas contra todos os times existentes
            const matchups = tournament.teams.map((existingTeam: any) => ({
                tournamentId: params.id,
                teamAId: existingTeam.id,
                teamBId: team.id,
                round: 1, // Pode ser ajustado depois se for necessário
                status: 'PENDING',
            }));

            if (matchups.length > 0) {
                await tx.tournamentMatch.createMany({ data: matchups });
            }

            return team;
        });

        return NextResponse.json(newTeam);
    } catch (error) {
        console.error('[TournamentsAPI] POST /teams error:', error);
        return NextResponse.json({ error: 'Erro ao adicionar time' }, { status: 500 });
    }
}

// PATCH /api/tournaments/[id]/teams - Editar time existente
export async function PATCH(req: NextRequest, { params }: Context) {
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { teamId, name, playerIds } = body;

        if (!teamId || !name) {
            return NextResponse.json({ error: 'ID do time e nome são obrigatórios' }, { status: 400 });
        }

        const updated = await (prisma as any).tournamentTeam.update({
            where: { id: teamId },
            data: {
                name,
                playerIds: playerIds || [],
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('[TournamentsAPI] PATCH /teams error:', error);
        return NextResponse.json({ error: 'Erro ao atualizar time' }, { status: 500 });
    }
}
