import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Timers (ms)
const RPS_COUNTDOWN_MS   = 10_000; // 10s before RPS starts
const RPS_TIMEOUT_MS     = 15_000; // 15s to choose in RPS
const VETO_TIMEOUT_MS    = 20_000; // 20s per map pick

const RPS_CHOICES = ['rock', 'paper', 'scissors'];

const sequences: Record<string, any[]> = {
  BO1: [
    { type: 'veto', by: 'p1' }, { type: 'veto', by: 'p2' },
    { type: 'veto', by: 'p1' }, { type: 'veto', by: 'p2' },
    { type: 'veto', by: 'p1' }, { type: 'veto', by: 'p2' },
    { type: 'auto_pick', by: 'system' }, { type: 'side_pick', by: 'p2' }
  ],
  BO3: [
    { type: 'veto', by: 'p1' }, { type: 'veto', by: 'p2' },
    { type: 'pick', by: 'p1' }, { type: 'side_pick', by: 'p2' },
    { type: 'pick', by: 'p2' }, { type: 'side_pick', by: 'p1' },
    { type: 'veto', by: 'p1' }, { type: 'veto', by: 'p2' },
    { type: 'auto_pick', by: 'system' }, { type: 'side_pick', by: 'p2' }
  ],
  BO5: [
    { type: 'veto', by: 'p1' }, { type: 'veto', by: 'p2' },
    { type: 'pick', by: 'p1' }, { type: 'side_pick', by: 'p2' },
    { type: 'pick', by: 'p2' }, { type: 'side_pick', by: 'p1' },
    { type: 'pick', by: 'p1' }, { type: 'side_pick', by: 'p2' },
    { type: 'pick', by: 'p2' }, { type: 'side_pick', by: 'p1' },
    { type: 'auto_pick', by: 'system' }, { type: 'side_pick', by: 'p2' }
  ]
};

function resolveRPS(cc: string, oc: string) {
  const winMap: Record<string, string> = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
  if (cc === oc) return 'TIE';
  return winMap[cc] === oc ? 'CREATOR' : 'OPPONENT';
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(getAuthOptions(req as any));
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, payload } = body;

    const user = await (prisma.user as any).findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const lobby = await (prisma as any).mapVetoLobby.findUnique({ where: { id } });
    if (!lobby) return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });

    const isCreator  = user.id === lobby.creatorId;
    const isOpponent = user.id === lobby.opponentId;

    // ─── JOIN ───────────────────────────────────────────────────────────────
    if (action === 'join' && lobby.status === 'WAITING') {
      if (isCreator) return NextResponse.json({ error: 'Creator cannot be opponent' }, { status: 400 });
      const updated = await (prisma as any).mapVetoLobby.update({
        where: { id },
        data: { opponentId: user.id, status: 'READY_CHECK' }
      });
      return NextResponse.json(updated);
    }

    if (!isCreator && !isOpponent) {
      return NextResponse.json({ error: 'Not in lobby' }, { status: 403 });
    }

    // ─── READY ──────────────────────────────────────────────────────────────
    if (action === 'ready' && lobby.status === 'READY_CHECK') {
      // Create a clean new rpsState object to avoid any Prisma JSON internal issues
      const rpsState: any = {};
      const oldRpsState = (lobby.rpsState as any) || {};
      
      // Copy existing values
      Object.assign(rpsState, oldRpsState);
      
      // Update our value
      if (isCreator)  rpsState.creatorReady  = true;
      if (isOpponent) rpsState.opponentReady = true;

      const bothReady = !!(rpsState.creatorReady && rpsState.opponentReady);
      
      const updateData: any = {
        rpsState: rpsState,
        status: bothReady ? 'RPS_COUNTDOWN' : 'READY_CHECK'
      };

      if (bothReady) {
        updateData.timerStart = new Date();
      }

      const updated = await (prisma as any).mapVetoLobby.update({
        where: { id },
        data: updateData
      });
      return NextResponse.json(updated);
    }

    // ─── RPS ────────────────────────────────────────────────────────────────
    if (action === 'rps' && lobby.status === 'RPS') {
      const choice = payload?.choice;
      if (!RPS_CHOICES.includes(choice)) return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });

      const rpsState = (lobby.rpsState as any) || {};
      if (isCreator && !rpsState.creatorRps)   rpsState.creatorRps  = choice;
      if (isOpponent && !rpsState.opponentRps) rpsState.opponentRps = choice;

      let updated: any;
      if (rpsState.creatorRps && rpsState.opponentRps) {
        const result = resolveRPS(rpsState.creatorRps, rpsState.opponentRps);
        if (result === 'TIE') {
          rpsState.creatorRps = null;
          rpsState.opponentRps = null;
          updated = await (prisma as any).mapVetoLobby.update({
            where: { id },
            data: { rpsState, timerStart: new Date() } // reset timer
          });
        } else {
          const winnerId = result === 'CREATOR' ? lobby.creatorId : lobby.opponentId;
          const loserId  = result === 'CREATOR' ? lobby.opponentId : lobby.creatorId;
          rpsState.winnerId = winnerId;
          rpsState.loserId  = loserId;
          updated = await (prisma as any).mapVetoLobby.update({
            where: { id },
            data: { rpsState, status: 'VETO', turn: winnerId, timerStart: new Date() }
          });
        }
      } else {
        updated = await (prisma as any).mapVetoLobby.update({ where: { id }, data: { rpsState } });
      }
      return NextResponse.json(updated);
    }

    // ─── MAP ACTION (veto / pick / side_pick) ───────────────────────────────
    if (action === 'action' && (lobby.status === 'VETO' || lobby.status === 'SIDE_PICK')) {
      if (lobby.turn !== user.id) return NextResponse.json({ error: 'Not your turn' }, { status: 403 });

      const vetoHistory: any[] = Array.isArray(lobby.vetoHistory) ? [...lobby.vetoHistory] : [];
      const formatSeq = sequences[lobby.format as string];
      const nextStep  = formatSeq[vetoHistory.length];
      if (!nextStep) return NextResponse.json({ error: 'Sequence done' }, { status: 400 });
      if (payload.type !== nextStep.type) return NextResponse.json({ error: 'Wrong action type' }, { status: 400 });

      vetoHistory.push({ type: payload.type, map: payload.map, side: payload.side, userId: user.id });

      const rpsState = (lobby.rpsState as any) || {};
      const p1Id = rpsState.winnerId;
      const p2Id = rpsState.loserId;

      const mapPool: string[] = Array.isArray(lobby.mapPool) ? lobby.mapPool : [];
      let checkNext = formatSeq[vetoHistory.length];
      if (checkNext?.type === 'auto_pick') {
        const used  = vetoHistory.map((h: any) => h.map).filter(Boolean);
        const auto  = mapPool.find(m => !used.includes(m)) ?? mapPool[0];
        vetoHistory.push({ type: 'auto_pick', map: auto, userId: 'system' });
        checkNext = formatSeq[vetoHistory.length];
      }

      let nextStatus = lobby.status as string;
      let nextTurn   = null as string | null;
      if (!checkNext) {
        nextStatus = 'FINISHED';
      } else {
        nextTurn   = checkNext.by === 'p1' ? p1Id : p2Id;
        nextStatus = checkNext.type === 'side_pick' ? 'SIDE_PICK' : 'VETO';
      }

      const updated = await (prisma as any).mapVetoLobby.update({
        where: { id },
        data: { vetoHistory, turn: nextTurn, status: nextStatus, timerStart: new Date() }
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json(lobby);
  } catch (error: any) {
    console.error('Map veto action error detailed:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
