"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, Shield, Sword, Share2, LogOut, CheckCircle2,
    Crown, Zap, Copy, Trash2, Play, Star
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────
interface LobbyUser {
    id: string; name: string | null; image: string | null;
    steamId?: string | null; cs2Rank?: string | null; gcLevel?: number | null;
    adr?: number | null; hsPercentage?: number | null; winRate?: number | null;
    faceitNickname?: string | null;
}
interface LobbyPlayer { id: string; userId: string; team: string; isLeader: boolean; user: LobbyUser; }
interface Lobby {
    id: string; name: string; status: string; creatorId: string;
    leaderAId: string | null; leaderBId: string | null; turn: string;
    rpsEnabled: boolean; rpsState: string | null; password: string | null;
    players: LobbyPlayer[]; creator: LobbyUser;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const RPS_EMOJI: Record<string, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };
const RPS_LABELS: Record<string, string> = { rock: "Pedra", paper: "Papel", scissors: "Tesoura" };

function getRankBadge(p: LobbyUser) {
    if (p.cs2Rank && !isNaN(Number(p.cs2Rank)) && Number(p.cs2Rank) > 1000)
        return { label: Number(p.cs2Rank).toLocaleString(), color: "text-purple-400", icon: "⭐" };
    if (p.gcLevel) return { label: `GC ${p.gcLevel}`, color: "text-yellow-400", icon: "🛡" };
    if (p.cs2Rank) return { label: p.cs2Rank, color: "text-zinc-400", icon: "🎖" };
    return null;
}

// ── Player Card ───────────────────────────────────────────────────────────────
function PlayerCard({
    player, isLeader, isOwner, side, lobby, onAction, compact = false
}: {
    player: LobbyPlayer; isLeader?: boolean; isOwner: boolean;
    side: "pool" | "A" | "B"; lobby: Lobby;
    onAction: (action: string, targetUserId?: string, extra?: any) => void;
    compact?: boolean;
}) {
    const u = player.user;
    const rank = getRankBadge(u);
    const profileHref = u.steamId ? `/player/${u.steamId}` : null;
    const noLeaderA = !lobby.leaderAId;
    const noLeaderB = !lobby.leaderBId;
    const isAlreadyLeader = lobby.leaderAId === u.id || lobby.leaderBId === u.id;
    const borderColor = side === "A" ? "border-yellow-500/20" : side === "B" ? "border-red-500/20" : "border-white/5";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-center gap-3 p-3 rounded-2xl border bg-white/[0.03] hover:bg-white/[0.06] transition-all ${borderColor}`}
        >
            {/* Avatar */}
            <div className="relative shrink-0">
                {u.image ? (
                    <img src={u.image} alt="" className={`rounded-xl object-cover border border-white/10 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`} />
                ) : (
                    <div className={`rounded-xl bg-zinc-800 flex items-center justify-center text-sm font-black text-zinc-500 border border-white/10 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}>
                        {(u.name || "?").charAt(0).toUpperCase()}
                    </div>
                )}
                {isLeader && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Crown size={8} className="text-black" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                {profileHref ? (
                    <Link href={profileHref} className="text-xs font-bold truncate block hover:text-yellow-400 transition-colors">
                        {u.name || "Jogador"}
                    </Link>
                ) : (
                    <p className="text-xs font-bold truncate">{u.name || "Jogador"}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                    {rank && <span className={`text-[9px] font-black uppercase ${rank.color}`}>{rank.icon} {rank.label}</span>}
                    {u.adr && u.adr > 0 && <span className="text-[9px] text-zinc-600 font-bold">ADR {Math.round(u.adr)}</span>}
                    {u.winRate && u.winRate > 0 && <span className="text-[9px] text-zinc-600 font-bold">{Math.round(u.winRate)}%W</span>}
                </div>
            </div>

            {/* Actions */}
            {side === "pool" && isOwner && lobby.status === "waiting" && !isAlreadyLeader && (
                <div className="flex gap-1 shrink-0">
                    {noLeaderA && (
                        <button onClick={() => onAction("setLeaderA", u.id)} title="Capitão Time A"
                            className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all text-[9px] font-black">
                            A
                        </button>
                    )}
                    {!noLeaderA && noLeaderB && (
                        <button onClick={() => onAction("setLeaderB", u.id)} title="Capitão Time B"
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[9px] font-black">
                            B
                        </button>
                    )}
                </div>
            )}
        </motion.div>
    );
}

// ── Team Column ───────────────────────────────────────────────────────────────
function TeamColumn({
    title, players, leaderId, turn, status, myTurn, onPick, onAction, isOwner,
    accentColor, lobby
}: {
    title: string; players: LobbyPlayer[]; leaderId: string | null;
    turn: string; status: string; myTurn: boolean; onPick?: (uid: string) => void;
    onAction: (action: string, targetUserId?: string, extra?: any) => void;
    isOwner: boolean; accentColor: "yellow" | "red"; lobby: Lobby;
}) {
    const side = accentColor === "yellow" ? "A" : "B";
    const isActive = turn === side && status === "picking";
    const borderCls = accentColor === "yellow"
        ? (isActive ? "border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.12)]" : "border-yellow-500/10")
        : (isActive ? "border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.12)]" : "border-red-500/10");
    const accentCls = accentColor === "yellow" ? "bg-yellow-500" : "bg-red-500";
    const textCls = accentColor === "yellow" ? "text-yellow-400" : "text-red-400";

    return (
        <div className={`bg-zinc-900/40 border ${borderCls} rounded-3xl p-5 flex flex-col gap-3 min-h-[340px] transition-all duration-500 relative overflow-hidden`}>
            {isActive && <div className={`absolute top-0 left-0 w-full h-1 ${accentCls} animate-pulse`} />}

            <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
                    <div className={`w-1.5 h-5 ${accentCls} rounded-sm`} />
                    <span className={textCls}>{title}</span>
                </h2>
                <span className={`text-xs font-black ${textCls}`}>{players.length}/5</span>
            </div>

            <div className="flex flex-col gap-2 flex-1">
                <AnimatePresence>
                    {players.map(p => (
                        <PlayerCard key={p.id} player={p} isLeader={leaderId === p.userId}
                            isOwner={isOwner} side={side as "A" | "B"} lobby={lobby}
                            onAction={onAction} compact />
                    ))}
                </AnimatePresence>
                {Array.from({ length: Math.max(0, 5 - players.length) }).map((_, i) => (
                    <div key={i} className="h-12 border border-dashed border-white/5 rounded-xl flex items-center justify-center">
                        <span className="text-[9px] text-zinc-700 font-bold uppercase">Slot livre</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── RPS Screen ────────────────────────────────────────────────────────────────
function RpsScreen({ lobby, userId, onAction }: { lobby: Lobby; userId: string; onAction: (action: string, targetUserId?: string, extra?: any) => void }) {
    const state = lobby.rpsState ? JSON.parse(lobby.rpsState) : { A: null, B: null, result: null };
    const isLeaderA = lobby.leaderAId === userId;
    const isLeaderB = lobby.leaderBId === userId;
    const myChoice = isLeaderA ? state.A : isLeaderB ? state.B : null;
    const opponentChose = isLeaderA ? !!state.B : isLeaderB ? !!state.A : false;
    const choices = ["rock", "paper", "scissors"] as const;

    return (
        <div className="flex flex-col items-center justify-center gap-6 py-12">
            <div className="text-center space-y-1">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Pedra · Papel · Tesoura</h2>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Quem ganhar começa a escolher os jogadores</p>
            </div>

            {state.result === "draw" && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-zinc-800 border border-white/10 rounded-2xl px-6 py-3 text-center">
                    <p className="text-yellow-400 font-black text-sm uppercase">Empate! Jogue novamente</p>
                </motion.div>
            )}

            {(isLeaderA || isLeaderB) ? (
                <div className="text-center space-y-4">
                    {!myChoice ? (
                        <>
                            <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest">Sua escolha (secreta)</p>
                            <div className="flex gap-4">
                                {choices.map(c => (
                                    <motion.button key={c} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                                        onClick={() => onAction("rpsChoice", undefined, { choice: c })}
                                        className="w-24 h-24 bg-zinc-900 border border-white/10 hover:border-yellow-500/50 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all">
                                        <span className="text-3xl">{RPS_EMOJI[c]}</span>
                                        <span className="text-[9px] font-black uppercase text-zinc-500">{RPS_LABELS[c]}</span>
                                    </motion.button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center space-y-2">
                            <p className="text-zinc-500 text-[11px] font-bold uppercase">Você escolheu</p>
                            <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/30 rounded-3xl flex items-center justify-center mx-auto">
                                <span className="text-4xl">{RPS_EMOJI[myChoice]}</span>
                            </div>
                            <p className="text-xs font-black text-yellow-400">{RPS_LABELS[myChoice]}</p>
                            {!opponentChose && (
                                <p className="text-zinc-600 text-[10px] font-bold uppercase animate-pulse">Aguardando adversário...</p>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center space-y-3">
                    <div className="flex gap-6 items-center">
                        <div className="text-center space-y-1">
                            <p className="text-[10px] text-yellow-400 font-black uppercase">Capitão A</p>
                            <div className="w-16 h-16 bg-zinc-900 border border-yellow-500/20 rounded-2xl flex items-center justify-center">
                                {state.A ? <span className="text-3xl">✓</span> : <span className="text-zinc-700 text-2xl">?</span>}
                            </div>
                        </div>
                        <span className="text-zinc-700 font-black text-2xl italic">VS</span>
                        <div className="text-center space-y-1">
                            <p className="text-[10px] text-red-400 font-black uppercase">Capitão B</p>
                            <div className="w-16 h-16 bg-zinc-900 border border-red-500/20 rounded-2xl flex items-center justify-center">
                                {state.B ? <span className="text-3xl">✓</span> : <span className="text-zinc-700 text-2xl">?</span>}
                            </div>
                        </div>
                    </div>
                    <p className="text-zinc-600 text-[10px] font-bold uppercase animate-pulse">Aguardando capitães escolherem...</p>
                </div>
            )}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LobbyRoom() {
    const params = useParams();
    const router = useRouter();
    const lobbyId = params.id as string;
    const { data: session } = useSession();

    const [lobby, setLobby] = useState<Lobby | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const fetchLobby = useCallback(async () => {
        try {
            const res = await fetch(`/api/lobby/${lobbyId}`);
            const data = await res.json();
            if (data.error) setError(data.error);
            else setLobby(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [lobbyId]);

    useEffect(() => {
        fetchLobby();
        const iv = setInterval(fetchLobby, 3000);
        return () => clearInterval(iv);
    }, [fetchLobby]);

    const handleAction = async (action: string, targetUserId?: string, extra?: any) => {
        try {
            const res = await fetch(`/api/lobby/${lobbyId}`, {
                method: "POST",
                body: JSON.stringify({ action, targetUserId, ...extra }),
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();
            if (data.error) alert(data.error);
            else await fetchLobby();
        } catch (e) { console.error(e); }
    };

    const handleDelete = async () => {
        if (!confirm("Excluir esta sala?")) return;
        await fetch(`/api/lobby/${lobbyId}`, { method: "DELETE" });
        router.push("/lobby");
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="relative w-14 h-14">
                <div className="absolute inset-0 border-4 border-yellow-500/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-yellow-500 rounded-full animate-spin" />
            </div>
        </div>
    );
    if (error) return (
        <div className="min-h-screen flex items-center justify-center text-red-400 font-black uppercase tracking-widest">{error}</div>
    );
    if (!lobby) return null;

    const currentUserId = (session?.user as any)?.id;
    const isOwner = lobby.creatorId === currentUserId;
    const isLeaderA = lobby.leaderAId === currentUserId;
    const isLeaderB = lobby.leaderBId === currentUserId;
    const myTurnA = lobby.turn === "A" && isLeaderA && lobby.status === "picking";
    const myTurnB = lobby.turn === "B" && isLeaderB && lobby.status === "picking";
    const myTurn = myTurnA || myTurnB;
    const iAmIn = lobby.players.some(p => p.userId === currentUserId);

    const playersInPool = lobby.players.filter(p => p.team === "none");
    const teamA = lobby.players.filter(p => p.team === "A");
    const teamB = lobby.players.filter(p => p.team === "B");

    const statusLabel: Record<string, { label: string; cls: string }> = {
        waiting: { label: "Aguardando", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
        rps: { label: "🪨 RPS", cls: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
        picking: { label: "Escolhendo", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
        finished: { label: "Finalizado", cls: "bg-green-500/10 text-green-400 border-green-500/20" },
    };
    const st = statusLabel[lobby.status] || statusLabel.waiting;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Mix 5x5</span>
                        <h1 className="text-2xl font-black italic tracking-tighter uppercase">{lobby.name}</h1>
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                        <Users size={11} /> {lobby.players.length}/10 jogadores
                        {lobby.rpsEnabled && <span className="text-purple-500 flex items-center gap-1"><Star size={9} /> RPS ativo</span>}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* RPS Toggle (owner, waiting) */}
                    {isOwner && lobby.status === "waiting" && (
                        <button onClick={() => handleAction("setRpsEnabled", undefined, { choice: !lobby.rpsEnabled })}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${lobby.rpsEnabled ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-white/5 text-zinc-500 border-white/10 hover:border-purple-500/30'}`}>
                            🪨 RPS {lobby.rpsEnabled ? "Ativo" : "Desativo"}
                        </button>
                    )}

                    {/* Start */}
                    {isOwner && lobby.status === "waiting" && lobby.leaderAId && lobby.leaderBId && (
                        <button onClick={() => handleAction("start")}
                            className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-2 transition-all active:scale-95">
                            <Play size={13} /> Iniciar
                        </button>
                    )}
                    {/* Finish */}
                    {isOwner && lobby.status === "picking" && (
                        <button onClick={() => handleAction("finish")}
                            className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-2 transition-all active:scale-95">
                            <CheckCircle2 size={13} /> Finalizar
                        </button>
                    )}

                    {/* Join */}
                    {!iAmIn && lobby.status === "waiting" && (
                        <button onClick={() => handleAction("join")}
                            className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-black uppercase text-[10px] transition-all active:scale-95 shadow-lg shadow-yellow-500/10">
                            Entrar na Sala
                        </button>
                    )}

                    {/* Copy link */}
                    <button onClick={copyLink}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-zinc-400">
                        {copied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>

                    {/* Leave */}
                    {iAmIn && (
                        <button onClick={() => handleAction("leave")}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all">
                            <LogOut size={16} />
                        </button>
                    )}

                    {/* Delete */}
                    {isOwner && (
                        <button onClick={handleDelete}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── MY TURN BANNER ── */}
            {myTurn && (
                <motion.div animate={{ scale: [1, 1.01, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                    className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-6 py-3 flex items-center gap-3">
                    <Zap size={16} className="text-yellow-500" />
                    <span className="text-yellow-400 font-black uppercase text-sm tracking-widest">É sua vez de escolher um jogador!</span>
                </motion.div>
            )}

            {/* ── RPS PHASE ── */}
            {lobby.status === "rps" && (
                <div className="bg-zinc-900/50 border border-purple-500/20 rounded-3xl p-6">
                    <RpsScreen lobby={lobby} userId={currentUserId} onAction={handleAction} />
                </div>
            )}

            {/* ── MAIN LAYOUT: 3 columns ── */}
            {lobby.status !== "rps" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Team A */}
                    <div className="lg:col-span-4">
                        <TeamColumn title="Time A" players={teamA} leaderId={lobby.leaderAId}
                            turn={lobby.turn} status={lobby.status} myTurn={myTurnA}
                            onPick={uid => handleAction("pick", uid)} onAction={handleAction}
                            isOwner={isOwner} accentColor="yellow" lobby={lobby} />
                    </div>

                    {/* Center: pool / finished */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        {lobby.status === "finished" ? (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                className="bg-green-500/5 border border-green-500/20 rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
                                <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                                    <CheckCircle2 size={28} className="text-black" />
                                </div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-green-400">Mix Pronto!</h2>
                                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Times definidos. Boa partida!</p>
                                <div className="flex gap-8 mt-2">
                                    <div className="text-center">
                                        <p className="text-3xl font-black italic text-yellow-400">{teamA.length}</p>
                                        <p className="text-[9px] text-zinc-600 uppercase font-bold">Time A</p>
                                    </div>
                                    <div className="text-zinc-700 font-black text-2xl italic self-center">VS</div>
                                    <div className="text-center">
                                        <p className="text-3xl font-black italic text-red-400">{teamB.length}</p>
                                        <p className="text-[9px] text-zinc-600 uppercase font-bold">Time B</p>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-5 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                        <Users size={13} /> Pool — {playersInPool.length} disponíveis
                                    </h2>
                                </div>

                                {playersInPool.length === 0 ? (
                                    <div className="py-10 flex flex-col items-center gap-2 text-zinc-700">
                                        <Users size={28} />
                                        <p className="text-[10px] font-bold uppercase">Nenhum jogador no pool</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <AnimatePresence>
                                            {playersInPool.map(p => (
                                                <motion.div key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                                    className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all group">
                                                    {/* Avatar */}
                                                    <div className="shrink-0">
                                                        {p.user.image ? (
                                                            <img src={p.user.image} alt="" className="w-9 h-9 rounded-xl object-cover border border-white/10" />
                                                        ) : (
                                                            <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-500 border border-white/10">
                                                                {(p.user.name || "?").charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        {p.user.steamId ? (
                                                            <Link href={`/player/${p.user.steamId}`}
                                                                className="text-xs font-bold truncate block hover:text-yellow-400 transition-colors">
                                                                {p.user.name}
                                                            </Link>
                                                        ) : (
                                                            <p className="text-xs font-bold truncate">{p.user.name}</p>
                                                        )}
                                                        <div className="flex gap-2 flex-wrap">
                                                            {(() => { const r = getRankBadge(p.user); return r ? <span className={`text-[9px] font-black ${r.color}`}>{r.icon} {r.label}</span> : null; })()}
                                                            {p.user.adr && p.user.adr > 0 && <span className="text-[9px] text-zinc-600">ADR {Math.round(p.user.adr)}</span>}
                                                        </div>
                                                    </div>
                                                    {/* Pick buttons */}
                                                    <div className="flex gap-1 shrink-0">
                                                        {myTurn && (
                                                            <button onClick={() => handleAction("pick", p.userId)}
                                                                className="px-3 py-1.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black rounded-lg text-[9px] font-black uppercase transition-all">
                                                                Pick
                                                            </button>
                                                        )}
                                                        {/* Self-pick if neither leader */}
                                                        {!myTurnA && !myTurnB && lobby.status === "picking"
                                                            && p.userId === currentUserId
                                                            && !isLeaderA && !isLeaderB && (
                                                                <div className="flex gap-1">
                                                                    {teamA.length < 5 && (
                                                                        <button onClick={() => handleAction("chooseTeam", undefined, { choice: "A" })}
                                                                            className="px-2 py-1 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded-lg text-[9px] font-black transition-all">A</button>
                                                                    )}
                                                                    {teamB.length < 5 && (
                                                                        <button onClick={() => handleAction("chooseTeam", undefined, { choice: "B" })}
                                                                            className="px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-[9px] font-black transition-all">B</button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        {/* Owner set leader */}
                                                        {isOwner && lobby.status === "waiting" && !lobby.leaderAId && (
                                                            <button onClick={() => handleAction("setLeaderA", p.userId)} title="Capitão A"
                                                                className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black text-[9px] font-black transition-all">A</button>
                                                        )}
                                                        {isOwner && lobby.status === "waiting" && lobby.leaderAId && !lobby.leaderBId && (
                                                            <button onClick={() => handleAction("setLeaderB", p.userId)} title="Capitão B"
                                                                className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-[9px] font-black transition-all">B</button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Waiting for captains hint */}
                                {lobby.status === "waiting" && (!lobby.leaderAId || !lobby.leaderBId) && isOwner && (
                                    <p className="text-[9px] text-zinc-700 font-bold uppercase text-center mt-2 animate-pulse">
                                        {!lobby.leaderAId ? "Defina o Capitão A clicando no botão A ao lado do jogador" : "Defina o Capitão B"}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Team B */}
                    <div className="lg:col-span-4">
                        <TeamColumn title="Time B" players={teamB} leaderId={lobby.leaderBId}
                            turn={lobby.turn} status={lobby.status} myTurn={myTurnB}
                            onPick={uid => handleAction("pick", uid)} onAction={handleAction}
                            isOwner={isOwner} accentColor="red" lobby={lobby} />
                    </div>
                </div>
            )}
        </div>
    );
}
