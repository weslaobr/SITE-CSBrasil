"use client"

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Loader2, Link as LinkIcon, Hand, ShieldHalf, Scissors, CheckCircle2, Clock, Sword, Swords, Trophy } from 'lucide-react';

const MAP_IMAGES: Record<string, string> = {
  Mirage:  "/img/maps/Mirage.webp",
  Inferno: "/img/maps/Inferno.webp",
  Nuke:    "/img/maps/Nuke.webp",
  Vertigo: "https://map-veto.com/images/maps/vertigo.jpg",
  Ancient: "/img/maps/Ancient.webp",
  Anubis:  "/img/maps/Anubis.webp",
  Dust2:   "/img/maps/Dust2.webp",
  Overpass: "/img/maps/Overpass.webp",
};

const MAP_COLORS: Record<string, string> = {
  Mirage:  "from-[#d4a373]/10 to-[#bc6c25]/20",
  Inferno: "from-[#e63946]/10 to-[#a8dadc]/5",
  Nuke:    "from-[#457b9d]/10 to-[#1d3557]/20",
  Overpass: "from-[#606c38]/10 to-[#283618]/20",
  Ancient: "from-[#2d6a4f]/10 to-[#1b4332]/20",
  Anubis:  "from-[#ffb703]/10 to-[#fb8500]/20",
  Dust2:   "from-[#f4a261]/10 to-[#e76f51]/20",
};

const RPS_ICONS: Record<string, React.ReactNode> = {
  rock:     <Hand size={36} className="rotate-90" />,
  paper:    <ShieldHalf size={36} />,
  scissors: <Scissors size={36} />,
};
const RPS_LABELS: Record<string, string> = { rock: 'Pedra', paper: 'Papel', scissors: 'Tesoura' };

function useCountdown(targetTime: number | null) {
  const [remaining, setRemaining] = useState<number>(0);
  useEffect(() => {
    if (!targetTime) { setRemaining(0); return; }
    const update = () => {
      const diff = Math.max(0, targetTime - Date.now());
      setRemaining(Math.ceil(diff / 1000));
    };
    update();
    const t = setInterval(update, 250);
    return () => clearInterval(t);
  }, [targetTime]);
  return remaining;
}

export default function MapVetoRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [lobby, setLobby]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const idRef = useRef(id);

  const fetchLobby = useCallback(async () => {
    try {
      const res = await fetch(`/api/map-veto/${idRef.current}`);
      if (res.ok) setLobby(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchLobby();
    const t = setInterval(fetchLobby, 2000);
    return () => clearInterval(t);
  }, [fetchLobby]);

  const doAction = async (action: string, payload: any = {}) => {
    await fetch(`/api/map-veto/${idRef.current}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload })
    });
    fetchLobby();
  };

  const copyLink = () => {
    const url = `${window.location.origin}/map-veto/${idRef.current}`;
    navigator.clipboard.writeText(url);
  };

  // All hooks must be called before any early returns (Rules of Hooks)
  const timerMs = lobby?.timerStart ? new Date(lobby.timerStart).getTime() : null;
  const rpsCountdownTarget = lobby?.status === 'RPS_COUNTDOWN' && timerMs ? timerMs + 10_000 : null;
  const rpsTarget          = lobby?.status === 'RPS'           && timerMs ? timerMs + 15_000 : null;
  const vetoTarget         = (lobby?.status === 'VETO' || lobby?.status === 'SIDE_PICK') && timerMs ? timerMs + (lobby.status === 'SIDE_PICK' ? 30_000 : 60_000) : null;
  const rpsCountdown       = useCountdown(rpsCountdownTarget);
  const rpsTimer           = useCountdown(rpsTarget);
  const vetoTimer          = useCountdown(vetoTarget);

  if (loading || !lobby) return (
    <div className="min-h-screen bg-[#0a0f16] flex items-center justify-center">
      <Loader2 className="animate-spin text-yellow-500" size={48} />
    </div>
  );

  const sessionUserId = (session?.user as any)?.id ?? null;
  const userId     = sessionUserId;
  const isCreator  = userId === lobby.creatorId;
  const isOpponent = userId === lobby.opponentId;

  console.log('Frontend Map Veto Debug:', {
    sessionUserId,
    lobbyCreatorId: lobby.creatorId,
    lobbyOpponentId: lobby.opponentId,
    isCreator,
    isOpponent,
    status: lobby.status
  });

  const rpsState   = (lobby.rpsState as any) || {};
  const myReady    = isCreator ? rpsState.creatorReady : rpsState.opponentReady;
  const oppReady   = isCreator ? rpsState.opponentReady : rpsState.creatorReady;
  const myRpsChoice = isCreator ? rpsState.creatorRps : rpsState.opponentRps;
  const isMyTurn = !!(userId && lobby.turn === userId);

  const getMapStatus = (m: string) => (lobby.vetoHistory || []).find((h: any) => h.map === m)?.type ?? 'available';
  const getMapSide = (m: string) => {
    const h = (lobby.vetoHistory || []).find((h: any) => h.map === m && h.type === 'side_pick');
    if (!h) return null;
    if (!userId || (userId !== lobby.creatorId && userId !== lobby.opponentId)) return h.side;
    
    // If the guy who picked the side is NOT me, I am the opposite side
    if (h.userId !== userId) {
      return h.side === 'CT' ? 'TR' : 'CT';
    }
    return h.side;
  };

  const getNextActionType = () => {
    const seqs: Record<string, any[]> = {
      BO1: [{type:'veto'},{type:'veto'},{type:'veto'},{type:'veto'},{type:'veto'},{type:'veto'}],
      BO3: [{type:'veto'},{type:'veto'},{type:'pick'},{type:'side_pick'},{type:'pick'},{type:'side_pick'},{type:'veto'},{type:'veto'}],
      BO5: [{type:'veto'},{type:'veto'},{type:'pick'},{type:'side_pick'},{type:'pick'},{type:'side_pick'},{type:'pick'},{type:'side_pick'},{type:'pick'},{type:'side_pick'}],
    };
    const h = (lobby.vetoHistory || []).length;
    return seqs[lobby.format]?.[h]?.type ?? null;
  };

  const nextAction = getNextActionType();

  const handleMapClick = (mapName: string) => {
    if (!isMyTurn || lobby.status === 'SIDE_PICK') return;
    const s = getMapStatus(mapName);
    if (s !== 'available') return;
    if (nextAction) doAction('action', { type: nextAction, map: mapName });
  };

  const handleSidePick = (side: string) => {
    if (!isMyTurn) return;
    const lastPick = [...(lobby.vetoHistory || [])].reverse().find((h: any) => ['pick', 'auto_pick'].includes(h.type));
    if (lastPick) doAction('action', { type: 'side_pick', map: lastPick.map, side });
  };

  const TimerBar = ({ seconds, max }: { seconds: number; max: number }) => (
    <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${seconds <= 5 ? 'bg-red-500' : 'bg-yellow-500'}`}
        style={{ width: `${(seconds / max) * 100}%` }}
        transition={{ duration: 0.25 }}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f16] text-white py-10 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-[#111823] p-5 rounded-2xl border border-gray-800 flex justify-between items-center mb-6">
          <div className="flex items-center gap-4 w-1/3">
            <img src={lobby.creator?.image || '/img/default-avatar.png'} className="w-14 h-14 rounded-full border-2 border-yellow-500" />
            <div>
              <div className="font-bold text-lg">{lobby.creator?.name || 'Líder 1'}</div>
              <div className="text-yellow-500 text-xs uppercase font-bold tracking-widest flex items-center gap-1">
                Criador
                {lobby.status === 'READY_CHECK' && (rpsState.creatorReady ? <CheckCircle2 size={12} className="text-green-400" /> : <Clock size={12} />)}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center w-1/3">
            <div className="text-3xl font-black italic text-yellow-500">VS</div>
            <div className="flex gap-2">
              <div className="text-xs font-bold bg-gray-900 px-3 py-1 rounded-full border border-gray-800 tracking-widest">{lobby.format}</div>
              {lobby.knifeRound && <div className="text-xs font-bold bg-gray-900 px-3 py-1 rounded-full border border-yellow-500/30 text-yellow-500 tracking-widest">Faca</div>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 w-1/3">
            <div className="text-right">
              <div className="font-bold text-lg">{lobby.opponent?.name || 'Aguardando...'}</div>
              <div className="text-gray-400 text-xs uppercase font-bold tracking-widest flex items-center justify-end gap-1">
                Oponente
                {lobby.status === 'READY_CHECK' && (rpsState.opponentReady ? <CheckCircle2 size={12} className="text-green-400" /> : <Clock size={12} />)}
              </div>
            </div>
            {lobby.opponent
              ? <img src={lobby.opponent?.image || '/img/default-avatar.png'} className="w-14 h-14 rounded-full border-2 border-gray-600" />
              : <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
            }
          </div>
        </div>

        {/* ─── WAITING ─── */}
        {lobby.status === 'WAITING' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
            <h2 className="text-3xl font-black mb-4">AGUARDANDO OPONENTE</h2>
            <button onClick={copyLink} className="flex items-center gap-3 mx-auto bg-gray-900 border border-gray-700 hover:border-yellow-500 transition px-6 py-4 rounded-xl text-base mb-4">
              <LinkIcon size={18} /> Copiar link do lobby <Copy size={18} className="text-yellow-500" />
            </button>
            {!isCreator && !isOpponent && session?.user && (
              <button onClick={() => doAction('join')} className="bg-yellow-500 text-black px-10 py-4 rounded-xl font-black text-xl hover:bg-yellow-400 mt-4">
                ENTRAR COMO OPONENTE
              </button>
            )}
          </motion.div>
        )}

        {/* ─── READY CHECK ─── */}
        {lobby.status === 'READY_CHECK' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#111823] border border-gray-800 rounded-2xl p-10 text-center max-w-lg mx-auto">
            <Swords size={40} className="text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black mb-2">CONFIRMAR PRESENÇA</h2>
            <p className="text-gray-400 mb-8 text-sm">Ambos os líderes precisam confirmar antes de começar o Pedra, Papel e Tesoura.</p>
            <div className="flex gap-4 justify-center mb-6 text-sm">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${rpsState.creatorReady ? 'border-green-500 text-green-400' : 'border-gray-700 text-gray-500'}`}>
                {rpsState.creatorReady ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                {lobby.creator?.name}
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${rpsState.opponentReady ? 'border-green-500 text-green-400' : 'border-gray-700 text-gray-500'}`}>
                {rpsState.opponentReady ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                {lobby.opponent?.name}
              </div>
            </div>
            {(isCreator || isOpponent) && !myReady && (
              <button onClick={() => doAction('ready')} className="bg-yellow-500 text-black font-black px-10 py-4 rounded-xl hover:bg-yellow-400 transition text-lg">
                ✅ ESTOU PRONTO
              </button>
            )}
            {myReady && !oppReady && (
              <div className="text-gray-400 flex justify-center items-center gap-2"><Loader2 size={18} className="animate-spin" /> Aguardando o outro...</div>
            )}
          </motion.div>
        )}

        {/* ─── RPS COUNTDOWN ─── */}
        {lobby.status === 'RPS_COUNTDOWN' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#111823] border border-yellow-500/30 rounded-2xl p-12 text-center max-w-lg mx-auto">
            <div className="text-8xl font-black text-yellow-500 mb-4 tabular-nums">{rpsCountdown}</div>
            <p className="text-gray-400 text-lg">Pedra, Papel e Tesoura começa em...</p>
          </motion.div>
        )}

        {/* ─── RPS PHASE ─── */}
        {lobby.status === 'RPS' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#111823] border border-gray-800 rounded-2xl p-10 text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-black mb-1 text-yellow-500">FAÇA SUA ESCOLHA</h2>
            <p className="text-gray-400 mb-2 text-sm">Pedra, Papel ou Tesoura — o vencedor inicia o veto!</p>
            <div className="mb-4 mt-4 flex items-center gap-2">
              <Clock size={14} className={rpsTimer <= 5 ? 'text-red-500' : 'text-yellow-500'} />
              <span className={`font-bold tabular-nums ${rpsTimer <= 5 ? 'text-red-500' : 'text-white'}`}>{rpsTimer}s</span>
              <div className="flex-1"><TimerBar seconds={rpsTimer} max={15} /></div>
            </div>

            {(isCreator || isOpponent) ? (
              <div className="flex justify-center gap-4 mt-6">
                {['rock', 'paper', 'scissors'].map(c => (
                  <button key={c} onClick={() => doAction('rps', { choice: c })} disabled={!!myRpsChoice}
                    className={`w-28 h-28 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${
                      myRpsChoice === c ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500 scale-105'
                      : myRpsChoice ? 'border-gray-800 text-gray-700 opacity-40'
                      : 'border-gray-700 hover:border-yellow-500 hover:text-yellow-500'
                    }`}
                  >
                    {RPS_ICONS[c]}
                    <span className="font-bold text-sm">{RPS_LABELS[c]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center gap-2 mt-6 text-gray-400"><Loader2 className="animate-spin" size={18} /> Aguardando...</div>
            )}

            <div className="flex justify-center gap-6 mt-8 text-sm text-gray-600">
              <span className={rpsState.creatorRps ? 'text-green-400' : ''}>{lobby.creator?.name}: {rpsState.creatorRps ? '✔ Escolheu' : '⌛ Aguardando'}</span>
              <span className={rpsState.opponentRps ? 'text-green-400' : ''}>{lobby.opponent?.name}: {rpsState.opponentRps ? '✔ Escolheu' : '⌛ Aguardando'}</span>
            </div>
          </motion.div>
        )}

        {/* ─── VETO / PICK / SIDE_PICK / FINISHED ─── */}
        {['VETO', 'SIDE_PICK', 'FINISHED'].includes(lobby.status) && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              {/* Timer bar */}
              {(lobby.status === 'VETO' || lobby.status === 'SIDE_PICK') && (
                <div className="mb-4 bg-[#111823] border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                  <Clock size={16} className={vetoTimer <= 5 ? 'text-red-500' : 'text-yellow-500'} />
                  <span className={`font-bold tabular-nums ${vetoTimer <= 5 ? 'text-red-500' : 'text-white'}`}>{vetoTimer}s</span>
                  <div className="flex-1"><TimerBar seconds={vetoTimer} max={lobby.status === 'SIDE_PICK' ? 30 : 60} /></div>
                  <span className="text-gray-500 text-sm">
                    {isMyTurn
                      ? lobby.status === 'SIDE_PICK' ? 'Escolha o lado' : (nextAction === 'veto' ? '⬛ Bane um mapa' : '✅ Escolha um mapa')
                      : 'Aguardando oponente...'}
                  </span>
                </div>
              )}

              {/* Side pick action */}
              {lobby.status === 'SIDE_PICK' && isMyTurn && (
                <div className="mb-4 bg-[#111823] border border-yellow-500/30 rounded-xl p-5 text-center">
                  <p className="text-sm font-bold uppercase tracking-widest text-yellow-500 mb-4">Escolha o lado inicial</p>
                  <div className="flex gap-4 justify-center">
                    <button onClick={() => handleSidePick('CT')} className="flex-1 max-w-[140px] bg-[#1e2d3d] hover:bg-[#263b52] text-[#6ba3c6] border border-[#6ba3c6]/30 font-black py-4 rounded-xl transition-all hover:scale-105">
                      🛡 CT
                    </button>
                    <button onClick={() => handleSidePick('TR')} className="flex-1 max-w-[140px] bg-[#3d2a1e] hover:bg-[#523820] text-[#c69a6b] border border-[#c69a6b]/30 font-black py-4 rounded-xl transition-all hover:scale-105">
                      💣 TR
                    </button>
                  </div>
                </div>
              )}

              {/* Map Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(lobby.mapPool || []).map((mapName: string) => {
                  const status = getMapStatus(mapName);
                  const isBanned = status === 'veto';
                  const isPicked = status === 'pick' || status === 'auto_pick';
                  const isMyPick = (lobby.vetoHistory || []).find(h => h.map === mapName && h.type === 'pick')?.userId === userId;
                  const side = getMapSide(mapName);
                  const canClick = isMyTurn && !isBanned && !isPicked && lobby.status !== 'SIDE_PICK' && lobby.status !== 'FINISHED';

                  return (
                    <motion.div
                      key={mapName}
                      onClick={() => handleMapClick(mapName)}
                      whileHover={canClick ? { scale: 1.03 } : {}}
                      className={`relative h-36 rounded-xl overflow-hidden border-2 transition-all bg-gray-900 bg-gradient-to-br ${MAP_COLORS[mapName] || 'from-gray-800 to-gray-900'} ${
                        isBanned ? 'border-red-900/40 cursor-not-allowed opacity-40 grayscale'
                        : isPicked ? 'border-green-500 shadow-lg shadow-green-500/20'
                        : canClick ? 'border-gray-700 hover:border-yellow-500 cursor-pointer'
                        : 'border-gray-800 cursor-default'
                      }`}
                    >
                      <img src={MAP_IMAGES[mapName]} alt={mapName}
                        className="absolute inset-0 w-full h-full object-cover" 
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      
                      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
                        <span className="text-5xl font-black uppercase tracking-tighter">{mapName}</span>
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3">
                        <span className="font-bold text-lg drop-shadow-md">{mapName}</span>
                        {side && <span className="text-xs font-bold text-blue-400">{side === 'CT' ? '🛡 CT' : '💣 TR'}</span>}
                      </div>

                      {isBanned && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-red-500 text-3xl font-black border-4 border-red-500 px-3 py-0.5 rounded rotate-[-12deg]">BAN</div>
                        </div>
                      )}
                      {status === 'pick' && (
                        <div className={`absolute top-2 right-2 ${
                          isMyPick ? 'bg-yellow-500' : 'bg-blue-500'
                        } text-black text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter shadow-xl flex items-center gap-1`}>
                          {isMyPick ? 'SEU PICK' : 'PICK OPONENTE'}
                        </div>
                      )}
                      {status === 'auto_pick' && (
                        <div className="absolute top-2 right-2 bg-gray-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter shadow-xl">
                          SISTEMA
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {lobby.status === 'FINISHED' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-[#111823] border border-yellow-500/30 rounded-2xl p-8 text-center">
                  <Trophy size={40} className="text-yellow-500 mx-auto mb-3" />
                  <h2 className="text-2xl font-black text-yellow-500">VETO CONCLUÍDO!</h2>
                  <p className="text-gray-400 mt-2 text-sm">Os mapas e lados foram definidos. Boa sorte!</p>
                </motion.div>
              )}
            </div>

            {/* Sidebar history */}
            <div className="w-full lg:w-72 bg-[#111823] border border-gray-800 rounded-2xl p-5 flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b border-gray-800 pb-3 mb-3">Histórico</h3>
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[50vh] pr-1">
                {(lobby.vetoHistory || []).map((h: any, i: number) => {
                  const isTimeout = h.userId === 'system_timeout';
                  const isMe = h.userId === userId;
                  const name = h.userId === 'system' || isTimeout ? (isTimeout ? 'Auto (timeout)' : 'Sistema')
                    : isMe ? 'Você' : (h.userId === lobby.creatorId ? lobby.creator?.name : lobby.opponent?.name);
                  const colors: Record<string, string> = {
                    veto: 'text-red-400', pick: 'text-green-400', auto_pick: 'text-blue-400', side_pick: 'text-purple-400'
                  };
                  const labels: Record<string, string> = {
                    veto: 'baniu', pick: 'escolheu', auto_pick: 'auto-pick', side_pick: 'escolheu lado'
                  };
                  return (
                    <div key={i} className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3 text-sm">
                      <span className={`font-bold ${isTimeout ? 'text-orange-400' : 'text-gray-300'}`}>{name}</span>{' '}
                      <span className={colors[h.type]}>{labels[h.type]}</span>{' '}
                      {h.type === 'side_pick'
                        ? <><span className="font-bold text-white">{h.side}</span>{' em '}<span className="font-bold text-white">{h.map}</span></>
                        : <span className="font-bold text-white uppercase">{h.map}</span>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
