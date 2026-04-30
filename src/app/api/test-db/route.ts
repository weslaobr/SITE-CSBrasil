import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const users = await prisma.user.findMany({
        where: { steamId: { not: null } },
        select: { id: true, steamId: true, rankingPoints: true }
    });
    
    const gmps = await prisma.globalMatchPlayer.findMany({
        take: 10,
        select: { globalMatchId: true, steamId: true, eloChange: true, matchResult: true }
    });

    return NextResponse.json({ users, gmps });
}
