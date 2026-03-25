"use client";

import { useEffect, useState } from "react";
import { Plus, Users, Lock, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function LobbyDashboard() {
    const [lobbies, setLobbies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [rpsEnabled, setRpsEnabled] = useState(false);

    const fetchLobbies = async () => {
        try {
            const res = await fetch("/api/lobby");
            const data = await res.json();
            setLobbies(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchLobbies();
        const interval = setInterval(fetchLobbies, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            const res = await fetch("/api/lobby", {
                method: "POST",
                body: JSON.stringify({ name: newName, password: newPassword, rpsEnabled }),
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();
            if (data.id) window.location.href = `/lobby/${data.id}`;
        } catch (e) { console.error(e); }
    };

    const statusBadge: Record<string, string> = {
        waiting:  "bg-zinc-700/30 text-zinc-500",
        rps:      "bg-purple-500/20 text-purple-400",
        picking:  "bg-yellow-500/20 text-yellow-400",
        finished: "bg-green-500/20 text-green-400",
    };
    const statusLabel: Record<string, string> = {
        waiting: "Aguardando", rps: "RPS", picking: "Escolhendo", finished: "Finalizado"
    };

    return (
        <div className="p-6 md:p-8 space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/5">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                            <Users size={22} />
                        </div>
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Mix 5×5</h1>
                    </div>
                    <p className="text-zinc-500 text-sm pl-[52px]">Forme seu time e escolha seus adversários.</p>
                </div>
                <button
                    onClick={() => setShowCreate(v => !v)}
                    className="px-7 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase italic tracking-widest text-[10px] rounded-xl transition-all active:scale-95 shadow-lg shadow-yellow-500/20 flex items-center gap-2"
                >
                    <Plus size={14} /> Criar Sala
                </button>
            </div>

            {/* Create form */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
                        className="bg-zinc-900/40 border border-white/5 p-8 rounded-2xl backdrop-blur-xl space-y-6">
                        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Nova Sala</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Nome da Sala</label>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                    className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition-all"
                                    placeholder="Ex: Mix do Final de Semana" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Senha (Opcional)</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                    className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition-all"
                                    placeholder="Deixe em branco para sala pública" />
                            </div>
                        </div>

                        {/* RPS Toggle */}
                        <button onClick={() => setRpsEnabled(v => !v)}
                            className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${rpsEnabled ? 'bg-purple-500/15 border-purple-500/30 text-purple-300' : 'bg-white/5 border-white/10 text-zinc-500 hover:border-purple-500/20'}`}>
                            <span className="text-xl">🪨</span>
                            <div className="text-left">
                                <p className="text-[11px] font-black uppercase">Pedra Papel Tesoura</p>
                                <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">
                                    {rpsEnabled ? "Ativo — capitães jogam RPS para decidir quem escolhe primeiro" : "Desativado — capitão A começa"}
                                </p>
                            </div>
                            <div className={`ml-auto w-8 h-4 rounded-full transition-all ${rpsEnabled ? 'bg-purple-500' : 'bg-zinc-700'} relative`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${rpsEnabled ? 'left-4' : 'left-0.5'}`} />
                            </div>
                        </button>

                        <div className="flex gap-3">
                            <button onClick={handleCreate}
                                className="bg-yellow-500 hover:bg-yellow-400 text-black px-7 py-3 rounded-2xl font-black uppercase text-xs transition-all active:scale-95 shadow-lg shadow-yellow-500/20">
                                Criar Sala
                            </button>
                            <button onClick={() => setShowCreate(false)}
                                className="bg-white/5 hover:bg-white/10 text-white px-7 py-3 rounded-2xl font-black uppercase text-xs transition-all">
                                Cancelar
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Lobby list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {loading && Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-40 bg-zinc-900/40 border border-white/5 rounded-2xl animate-pulse" />
                ))}

                {!loading && lobbies.map((lobby) => (
                    <Link key={lobby.id} href={`/lobby/${lobby.id}`}>
                        <motion.div whileHover={{ y: -2 }}
                            className="group bg-zinc-900/40 border border-white/5 p-6 rounded-2xl hover:border-yellow-500/30 transition-all cursor-pointer relative overflow-hidden backdrop-blur-md">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {lobby.password && <Lock size={12} className="text-zinc-600" />}
                                    {lobby.rpsEnabled && <Star size={12} className="text-purple-400" />}
                                </div>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${statusBadge[lobby.status] || statusBadge.waiting}`}>
                                    {statusLabel[lobby.status] || "Aguardando"}
                                </span>
                            </div>

                            <h3 className="text-lg font-black uppercase italic tracking-tight group-hover:text-yellow-400 transition-colors leading-tight">{lobby.name}</h3>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">Host: {lobby.creator?.name}</p>

                            <div className="mt-5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        {Array.from({ length: Math.min(lobby._count?.players || 0, 10) }).map((_, i) => (
                                            <div key={i} className="w-2 h-2 rounded-full bg-yellow-500/60" />
                                        ))}
                                        {Array.from({ length: Math.max(0, 10 - (lobby._count?.players || 0)) }).map((_, i) => (
                                            <div key={i} className="w-2 h-2 rounded-full bg-white/10" />
                                        ))}
                                    </div>
                                    <span className="text-xs font-black text-zinc-500">{lobby._count?.players || 0}/10</span>
                                </div>
                                <div className="p-2 rounded-xl group-hover:bg-yellow-500 group-hover:text-black transition-all text-zinc-600">
                                    <ChevronRight size={15} />
                                </div>
                            </div>
                        </motion.div>
                    </Link>
                ))}

                {!loading && lobbies.length === 0 && (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-2xl space-y-3">
                        <Users className="mx-auto text-zinc-700" size={36} />
                        <p className="text-zinc-600 font-bold uppercase text-xs tracking-widest">Nenhuma sala ativa</p>
                        <p className="text-zinc-700 text-[10px]">Crie a primeira sala e convide seus amigos!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
