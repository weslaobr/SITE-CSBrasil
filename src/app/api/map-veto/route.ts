import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(getAuthOptions(req as any));
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { format, knifeRound } = await req.json();

    if (!['BO1', 'BO3', 'BO5'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    const defaultMapPool = ["Mirage", "Inferno", "Nuke", "Overpass", "Ancient", "Anubis", "Dust2"];

    const lobby = await (prisma as any).mapVetoLobby.create({
      data: {
        creatorId: user.id,
        format,
        status: 'WAITING',
        mapPool: defaultMapPool,
        rpsState: {},
        vetoHistory: [],
      },
      include: {
        creator: true,
      }
    });

    if (knifeRound) {
      await prisma.$executeRawUnsafe(
        `UPDATE public."MapVetoLobby" SET "knifeRound" = true WHERE id = $1`, 
        lobby.id
      );
      (lobby as any).knifeRound = true;
    }

    return NextResponse.json(lobby);
  } catch (error) {
    console.error('Error creating map veto lobby:', error);
    return NextResponse.json({ error: (error as any).message || 'Internal Server Error' }, { status: 500 });
  }
}
