import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const RPS_COUNTDOWN_MS = 10_000;
const RPS_TIMEOUT_MS   = 15_000;
const VETO_TIMEOUT_MS  = 60_000; // 60s for veto/pick
const SIDE_TIMEOUT_MS  = 30_000; // 30s for side pick
const RPS_CHOICES      = ['rock', 'paper', 'scissors'];

const sequences: Record<string, any[]> = {
  BO1: [
    { type: 'veto', by: 'p1' }, { type: 'veto', by: 'p2' },
    { type: 'veto', by: 'p1' }, { type: 'veto', by: 'p2' },
    { type: 'veto', by: 'p1' }, { type: 'veto', by: 'p2' },
    { type: 'auto_pick', by: 'system' }
  ],
  BO3: [
    { type: 'veto', by: 'p1' }, { type: 'veto', by: 'p2' },
    { type: 'pick', by: 'p1' }, { type: 'side_pick', by: 'p2' },
    { type: 'pick', by: 'p2' }, { type: 'side_pick', by: 'p1' },
    { type: 'veto', by: 'p1' }, { type: 'veto', by: 'p2' },
    { type: 'auto_pick', by: 'system' }
  ],
  BO5: [
    { type: 'veto', by: 'p1' }, { type: 'veto', by: 'p2' },
    { type: 'pick', by: 'p1' }, { type: 'side_pick', by: 'p2' },
    { type: 'pick', by: 'p2' }, { type: 'side_pick', by: 'p1' },
    { type: 'pick', by: 'p1' }, { type: 'side_pick', by: 'p2' },
    { type: 'pick', by: 'p2' }, { type: 'side_pick', by: 'p1' },
    { type: 'auto_pick', by: 'system' }
  ]
};

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

async function autoAdvance(lobby: any): Promise<any> {
  const now = Date.now();
  const timerStart: number = lobby.timerStart ? new Date(lobby.timerStart).getTime() : now;

  // RPS_COUNTDOWN → RPS after 10s
  if (lobby.status === 'RPS_COUNTDOWN' && now - timerStart >= RPS_COUNTDOWN_MS) {
    return (prisma as any).mapVetoLobby.update({
      where: { id: lobby.id },
      data: { status: 'RPS', timerStart: new Date() }
    });
  }

  // RPS timeout → auto-pick random choice for anyone who hasn't picked
  if (lobby.status === 'RPS' && now - timerStart >= RPS_TIMEOUT_MS) {
    const rpsState = (lobby.rpsState as any) || {};
    if (!rpsState.creatorRps)  rpsState.creatorRps  = rand(RPS_CHOICES);
    if (!rpsState.opponentRps) rpsState.opponentRps = rand(RPS_CHOICES);

    const winMap: Record<string, string> = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
    let winnerId: string, loserId: string;
    if (rpsState.creatorRps === rpsState.opponentRps) {
      // still a tie after timeout - pick randomly
      winnerId = Math.random() > 0.5 ? lobby.creatorId : lobby.opponentId;
      loserId  = winnerId === lobby.creatorId ? lobby.opponentId : lobby.creatorId;
    } else if (winMap[rpsState.creatorRps] === rpsState.opponentRps) {
      winnerId = lobby.creatorId; loserId = lobby.opponentId;
    } else {
      winnerId = lobby.opponentId; loserId = lobby.creatorId;
    }
    rpsState.winnerId = winnerId;
    rpsState.loserId  = loserId;

    return (prisma as any).mapVetoLobby.update({
      where: { id: lobby.id },
      data: { rpsState, status: 'VETO', turn: winnerId, timerStart: new Date() }
    });
  }

  // VETO / SIDE_PICK timeout → auto-pick
  const timeout = lobby.status === 'SIDE_PICK' ? SIDE_TIMEOUT_MS : VETO_TIMEOUT_MS;
  if ((lobby.status === 'VETO' || lobby.status === 'SIDE_PICK') && now - timerStart >= timeout) {
    const vetoHistory: any[] = Array.isArray(lobby.vetoHistory) ? [...lobby.vetoHistory] : [];
    const formatSeq  = sequences[lobby.format as string];
    const effectiveSeq = lobby.knifeRound ? formatSeq.filter(s => s.type !== 'side_pick') : formatSeq;
    const nextStep   = effectiveSeq[vetoHistory.length];
    if (!nextStep) return lobby;

    const rpsState = (lobby.rpsState as any) || {};
    const p1Id = rpsState.winnerId;
    const p2Id = rpsState.loserId;
    const mapPool: string[] = Array.isArray(lobby.mapPool) ? lobby.mapPool : [];
    const usedMaps = vetoHistory.map((h: any) => h.map).filter(Boolean);

    if (nextStep.type === 'veto') {
      // auto-ban a random available map
      const available = mapPool.filter(m => !usedMaps.includes(m));
      const map = rand(available) ?? mapPool[0];
      vetoHistory.push({ type: 'veto', map, userId: 'system_timeout' });
    } else if (nextStep.type === 'pick') {
      const available = mapPool.filter(m => !usedMaps.includes(m));
      const map = rand(available) ?? mapPool[0];
      vetoHistory.push({ type: 'pick', map, userId: 'system_timeout' });
    } else if (nextStep.type === 'side_pick') {
      const lastPick = [...vetoHistory].reverse().find(h => h.type === 'pick' || h.type === 'auto_pick');
      vetoHistory.push({ type: 'side_pick', map: lastPick?.map, side: 'CT', userId: 'system_timeout' });
    }

    let checkNext = effectiveSeq[vetoHistory.length];
    if (checkNext?.type === 'auto_pick') {
      const used2 = vetoHistory.map((h: any) => h.map).filter(Boolean);
      const auto  = mapPool.find(m => !used2.includes(m)) ?? mapPool[0];
      vetoHistory.push({ type: 'auto_pick', map: auto, userId: 'system' });
      checkNext = effectiveSeq[vetoHistory.length];
    }

    let nextStatus = lobby.status as string;
    let nextTurn   = null as string | null;
    if (!checkNext) {
      nextStatus = 'FINISHED';
    } else {
      nextTurn   = checkNext.by === 'p1' ? p1Id : p2Id;
      nextStatus = checkNext.type === 'side_pick' ? 'SIDE_PICK' : 'VETO';
    }

    return (prisma as any).mapVetoLobby.update({
      where: { id: lobby.id },
      data: { vetoHistory, turn: nextTurn, status: nextStatus, timerStart: new Date() }
    });
  }

  return lobby;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    let lobby = await (prisma as any).mapVetoLobby.findUnique({
      where: { id },
      include: {
        creator:  { select: { id: true, name: true, steamId: true, image: true } },
        opponent: { select: { id: true, name: true, steamId: true, image: true } },
      }
    });

    if (!lobby) return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });

    const rawK = await prisma.$queryRawUnsafe(`SELECT "knifeRound" FROM public."MapVetoLobby" WHERE id = $1`, id);
    if ((rawK as any)?.[0]) {
      (lobby as any).knifeRound = (rawK as any)[0].knifeRound;
    }

    // Auto-advance based on timers
    const needsAutoAdvance = ['RPS_COUNTDOWN', 'RPS', 'VETO', 'SIDE_PICK'].includes(lobby.status);
    if (needsAutoAdvance) {
      const advanced = await autoAdvance(lobby);
      if (advanced !== lobby) {
        // Re-fetch with includes after update
        lobby = await (prisma as any).mapVetoLobby.findUnique({
          where: { id },
          include: {
            creator:  { select: { id: true, name: true, steamId: true, image: true } },
            opponent: { select: { id: true, name: true, steamId: true, image: true } },
          }
        });
      }
    }

    return NextResponse.json(lobby);
  } catch (error) {
    console.error('Error fetching map veto lobby:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
