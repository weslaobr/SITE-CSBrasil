import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

// GET /api/tournaments — listar todos
export async function GET() {
    try {
        const tournaments = await (prisma as any).tournament.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                teams: true,
                matches: {
                    include: {
                        teamA: true,
                        teamB: true,
                        winner: true,
                    },
                    orderBy: { round: 'asc' },
                },
            },
        });
        return NextResponse.json(tournaments);
    } catch (error) {
        console.error('[TournamentsAPI] GET error:', error);
        return NextResponse.json({ error: 'Erro ao buscar torneios' }, { status: 500 });
    }
}

// POST /api/tournaments — criar novo torneio
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, description, format, teams } = body;

        if (!name || !teams || teams.length < 2) {
            return NextResponse.json({ error: 'Nome e pelo menos 2 times são obrigatórios' }, { status: 400 });
        }

        // Criar torneio e times em transação
        const tournament = await (prisma as any).$transaction(async (tx: any) => {
            const t = await tx.tournament.create({
                data: {
                    name,
                    description: description || null,
                    format: format || 'BO1',
                    status: 'OPEN',
                    creatorId: (session.user as any).id,
                },
            });

            // Criar os times
            const createdTeams = await Promise.all(
                teams.map((team: any) =>
                    tx.tournamentTeam.create({
                        data: {
                            tournamentId: t.id,
                            name: team.name,
                            playerIds: team.playerIds || [],
                        },
                    })
                )
            );

            // Gerar bracket Round Robin simplificado
            const matchups: any[] = [];
            for (let i = 0; i < createdTeams.length; i++) {
                for (let j = i + 1; j < createdTeams.length; j++) {
                    matchups.push({
                        tournamentId: t.id,
                        teamAId: createdTeams[i].id,
                        teamBId: createdTeams[j].id,
                        round: Math.floor(matchups.length / Math.floor(createdTeams.length / 2)) + 1,
                        status: 'PENDING',
                    });
                }
            }

            await tx.tournamentMatch.createMany({ data: matchups });

            return tx.tournament.findUnique({
                where: { id: t.id },
                include: {
                    teams: true,
                    matches: { include: { teamA: true, teamB: true } },
                },
            });
        });

        return NextResponse.json(tournament);
    } catch (error) {
        console.error('[TournamentsAPI] POST error:', error);
        return NextResponse.json({ error: 'Erro ao criar torneio' }, { status: 500 });
    }
}
