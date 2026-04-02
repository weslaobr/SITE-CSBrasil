import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const { id: steamId } = params;

    try {
        // Buscar snapshots dos últimos 90 dias
        const since = new Date();
        since.setDate(since.getDate() - 90);

        const snapshots = await (prisma as any).ratingSnapshot.findMany({
            where: { steamId, source: 'premier', createdAt: { gte: since } },
            orderBy: { createdAt: 'asc' },
            select: { rating: true, createdAt: true },
        });

        // Se não há snapshots, retornar o rating atual como ponto único
        if (snapshots.length === 0) {
            const player = await (prisma as any).player.findUnique({
                where: { steamId },
                select: { premierRating: true },
            });

            if (player?.premierRating) {
                return NextResponse.json({
                    history: [{ rating: player.premierRating, date: new Date().toISOString() }],
                    change: 0,
                });
            }
            return NextResponse.json({ history: [], change: 0 });
        }

        const history = snapshots.map((s: any) => ({
            rating: s.rating,
            date: s.createdAt.toISOString(),
        }));

        // Calcular variação total
        const change = history.length > 1
            ? history[history.length - 1].rating - history[0].rating
            : 0;

        return NextResponse.json({ history, change });
    } catch (error) {
        console.error('[RatingHistory] Error:', error);
        return NextResponse.json({ history: [], change: 0 });
    }
}
