"use client";

import { useEffect, useState } from "react";
import { Plus, Users, Lock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LobbyDashboard() {
    const [lobbies, setLobbies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const fetchLobbies = async () => {
        try {
            const res = await fetch("/api/lobby");
            const data = await res.json();
            setLobbies(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLobbies();
        const interval = setInterval(fetchLobbies, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreate = async () => {
        if (!newName) return;
        try {
            const res = await fetch("/api/lobby", {
                method: "POST",
                body: JSON.stringify({ name: newName, password: newPassword }),
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();
            if (data.id) {
                window.location.href = `/lobby/${data.id}`;
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-10">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white">MIX 5X5 LOBBY</h1>
                    <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest mt-2">Forme seu time e escolha seus adversários</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/20"
                >
                    <Plus size={18} />
                    Criar Sala
                </button>
            </header>

            {showCreate && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/60 border border-white/10 p-8 rounded-3xl backdrop-blur-xl space-y-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Nome da Sala</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition-all"
                                placeholder="Ex: Mix do Final de Semana"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Senha (Opcional)</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition-all"
                                placeholder="Deixe em branco para sala pública"
                            />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleCreate}
                            className="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase text-xs transition-all active:scale-95"
                        >
                            Confirmar Criação
                        </button>
                        <button
                            onClick={() => setShowCreate(false)}
                            className="bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lobbies.map((lobby) => (
                    <Link key={lobby.id} href={`/lobby/${lobby.id}`}>
                        <div className="group bg-zinc-900/40 border border-white/5 p-6 rounded-3xl hover:border-yellow-500/50 transition-all cursor-pointer relative overflow-hidden backdrop-blur-md">
                            <div className="absolute top-0 right-0 p-4">
                                {lobby.password && <Lock size={14} className="text-zinc-600" />}
                            </div>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter group-hover:text-yellow-500 transition-colors">
                                {lobby.name}
                            </h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Host: {lobby.creator?.name}</p>

                            <div className="mt-6 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <span key={i} className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(254,209,61,0.5)]" />
                                        ))}
                                    </div>
                                    <span className="text-xs font-black text-zinc-400">{lobby._count?.players}/10</span>
                                </div>
                                <div className="relative z-10">
                                    <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                                    <div className="p-2 rounded-xl group-hover:bg-yellow-500 group-hover:text-black transition-all relative">
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}

                {lobbies.length === 0 && !loading && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                        <Users className="mx-auto text-zinc-700 mb-4" size={40} />
                        <p className="text-zinc-500 font-bold uppercase text-xs">Nenhuma sala ativa no momento</p>
                    </div>
                )}
            </div>
        </div>
    );
}
