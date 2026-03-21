"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Shield, Sword, Share2, LogOut, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";

export default function LobbyRoom() {
    const params = useParams();
    const lobbyId = params.id as string;
    const { data: session } = useSession();

    const [lobby, setLobby] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchLobby = async () => {
        try {
            const res = await fetch(`/api/lobby/${lobbyId}`);
            const data = await res.json();
            if (data.error) setError(data.error);
            else setLobby(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLobby();
        const interval = setInterval(fetchLobby, 3000);
        return () => clearInterval(interval);
    }, [lobbyId]);

    const handleAction = async (action: string, targetUserId?: string) => {
        try {
            const res = await fetch(`/api/lobby/${lobbyId}`, {
                method: "POST",
                body: JSON.stringify({ action, targetUserId }),
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();
            if (data.error) alert(data.error);
            else fetchLobby();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Tem certeza que deseja excluir esta sala?")) return;
        try {
            const res = await fetch(`/api/lobby/${lobbyId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.error) alert(data.error);
            else window.location.href = "/dashboard";
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="p-20 text-center text-zinc-500 animate-pulse font-black uppercase">Entrando na sala...</div>;
    if (error) return <div className="p-20 text-center text-red-500 font-black uppercase">{error}</div>;

    const currentUserId = (session?.user as any)?.id;
    const isOwner = lobby.creatorId === currentUserId;
    const isLeaderA = lobby.leaderAId === currentUserId;
    const isLeaderB = lobby.leaderBId === currentUserId;
    const myTurn = (lobby.turn === "A" && isLeaderA) || (lobby.turn === "B" && isLeaderB);

    const playersInPool = lobby.players.filter((p: any) => p.team === "none");
    const teamA = lobby.players.filter((p: any) => p.team === "A");
    const teamB = lobby.players.filter((p: any) => p.team === "B");

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Mix 5x5</span>
                        <h1 className="text-3xl font-black italic tracking-tighter uppercase">{lobby.name}</h1>
                    </div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Users size={14} /> {lobby.players.length}/10 Jogadores na sala
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="space-x-2">
                        {isOwner && lobby.status === "waiting" && (
                            <button
                                onClick={() => handleAction("addBots")}
                                className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs transition-all inline-flex items-center gap-2"
                            >
                                <Users size={16} /> Adicionar Bots
                            </button>
                        )}
                        {isOwner && lobby.status === "waiting" && (
                            <button
                                onClick={() => handleAction("start")}
                                className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs transition-all inline-flex items-center gap-2"
                            >
                                <Sword size={16} /> Começar Escolhas
                            </button>
                        )}
                        {isOwner && lobby.status === "picking" && (
                            <button
                                onClick={() => handleAction("start")}
                                className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs transition-all inline-flex items-center gap-2"
                            >
                                <CheckCircle2 size={16} /> Finalizar Mix
                            </button>
                        )}
                        <span className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${lobby.status === 'waiting' ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' :
                            lobby.status === 'picking' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                'bg-green-500/10 text-green-500 border-green-500/20'
                            }`}>
                            {lobby.status === 'waiting' ? 'Aguardando' : lobby.status === 'picking' ? 'Escolhendo' : 'Finalizado'}
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Link copiado!");
                        }}
                        className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all"
                    >
                        <Share2 size={16} /> Link
                    </button>
                    {!lobby.players.find((p: any) => p.userId === currentUserId) && (
                        <button
                            onClick={() => handleAction("join")}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-2xl font-black uppercase text-xs transition-all shadow-lg shadow-yellow-500/10"
                        >
                            Entrar na Sala
                        </button>
                    )}
                    {isOwner && (
                        <button
                            onClick={handleDelete}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-3 rounded-2xl transition-all"
                            title="Excluir Sala"
                        >
                            <Users size={16} className="text-red-500" />
                        </button>
                    )}
                    <button
                        onClick={() => handleAction("leave")}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-3 rounded-2xl transition-all"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Team A */}
                <div className="lg:col-span-3 space-y-4">
                    <div className={`bg-zinc-900/60 border ${lobby.turn === 'A' && lobby.status === 'picking' ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.15)]' : 'border-white/5'} p-6 rounded-3xl min-h-[400px] relative overflow-hidden transition-all duration-500`}>
                        {lobby.turn === 'A' && lobby.status === 'picking' && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500 animate-pulse" />
                        )}
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Sword size={80} />
                        </div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-yellow-500" /> TIME A
                        </h2>
                        <div className="space-y-3">
                            {teamA.map((p: any) => (
                                <PlayerRow key={p.id} player={p} isLeader={lobby.leaderAId === p.userId} />
                            ))}
                            {Array.from({ length: 5 - teamA.length }).map((_, i) => (
                                <div key={i} className="h-14 border border-dashed border-white/5 rounded-2xl flex items-center justify-center">
                                    <span className="text-[10px] text-zinc-700 font-bold uppercase">Aguardando Escolha</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pool / Picking */}
                <div className="lg:col-span-6 space-y-4">
                    <AnimatePresence>
                        {lobby.status === "finished" && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-orange-500/10 border border-orange-500/20 p-8 rounded-[40px] backdrop-blur-xl text-center space-y-4 mb-8"
                            >
                                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(249,115,22,0.4)]">
                                    <CheckCircle2 size={32} className="text-black" />
                                </div>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-orange-500">CONVITES ENVIADOS / MIX PRONTO!</h2>
                                <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Os times foram definidos e a partida pode começar.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className={`bg-zinc-900/40 border ${lobby.status === 'picking' ? 'border-yellow-500/20 shadow-[0_0_40px_rgba(234,179,8,0.05)]' : 'border-white/5'} p-8 rounded-[40px] backdrop-blur-xl transition-all duration-700`}>
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-zinc-400">
                                <Users /> {lobby.status === 'finished' ? 'FORMAÇÃO FINAL' : 'JOGADORES DISPONÍVEIS'}
                            </h2>
                            {myTurn && lobby.status === 'picking' && (
                                <motion.span
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="bg-yellow-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                                >
                                    SUA VEZ DE ESCOLHER!
                                </motion.span>
                            )}
                        </div>

                        {lobby.status !== "finished" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {playersInPool.map((p: any) => (
                                    <motion.div
                                        layout
                                        key={p.id}
                                        className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10" />
                                            <div>
                                                <p className="font-bold text-sm">{p.user.name}</p>
                                                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">LVL {p.user.gcLevel || 10}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {isOwner && !lobby.leaderAId && (
                                                <button onClick={() => handleAction("setLeader", p.userId)} className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500 hover:text-black transition-all" title="Tornar Capitão">
                                                    <Shield size={14} />
                                                </button>
                                            )}
                                            {myTurn && (
                                                <button onClick={() => handleAction("pick", p.userId)} className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500 hover:text-black transition-all" title="Escolher Jogador">
                                                    <Sword size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center space-y-6">
                                <div className="flex justify-center items-center gap-12">
                                    <div className="text-center">
                                        <p className="text-4xl font-black italic text-yellow-500">5</p>
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Time A</p>
                                    </div>
                                    <div className="text-zinc-800 text-4xl font-black italic">VS</div>
                                    <div className="text-center">
                                        <p className="text-4xl font-black italic text-red-500">5</p>
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Time B</p>
                                    </div>
                                </div>
                                <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">A formação foi trancada pelo host.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Team B */}
                <div className="lg:col-span-3 space-y-4">
                    <div className={`bg-zinc-900/60 border ${lobby.turn === 'B' && lobby.status === 'picking' ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'border-white/5'} p-6 rounded-3xl min-h-[400px] relative overflow-hidden text-right transition-all duration-500`}>
                        {lobby.turn === 'B' && lobby.status === 'picking' && (
                            <div className="absolute top-0 right-0 w-full h-1 bg-red-500 animate-pulse" />
                        )}
                        <div className="absolute top-0 left-0 p-4 opacity-5">
                            <Sword size={80} className="scale-x-[-1]" />
                        </div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter mb-6 flex items-center justify-end gap-2">
                            TIME B <div className="w-1.5 h-6 bg-red-500" />
                        </h2>
                        <div className="space-y-3">
                            {teamB.map((p: any) => (
                                <PlayerRow key={p.id} player={p} isLeader={lobby.leaderBId === p.userId} reverse />
                            ))}
                            {Array.from({ length: 5 - teamB.length }).map((_, i) => (
                                <div key={i} className="h-14 border border-dashed border-white/5 rounded-2xl flex items-center justify-center">
                                    <span className="text-[10px] text-zinc-700 font-bold uppercase">Aguardando Escolha</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PlayerRow({ player, isLeader, reverse }: any) {
    return (
        <div className={`flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 ${reverse ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-zinc-800" />
            <div className={reverse ? 'text-right' : 'text-left'}>
                <p className="text-sm font-bold truncate max-w-[120px]">{player.user.name}</p>
                <div className={`flex items-center gap-1 ${reverse ? 'flex-row-reverse' : ''}`}>
                    {isLeader && <Shield size={10} className="text-yellow-500" />}
                    <span className="text-[9px] text-zinc-500 font-black uppercase">LVL {player.user.gcLevel || 10}</span>
                </div>
            </div>
        </div>
    );
}
