"use client";

import React, { useEffect, useState } from 'react';
import { Users, Shield, ShieldCheck, ShieldAlert, Search, Loader2, Trash2 } from 'lucide-react';
import { toast } from "sonner";

interface User {
    id: string;
    name: string;
    image: string;
    steamId: string;
    isAdmin: boolean;
    _count: {
        matches: number;
        lobbiesCreated: number;
    };
}

export default function UsersTab() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Erro ao carregar usuários");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const toggleAdmin = async (userId: string, currentStatus: boolean) => {
        setUpdating(userId);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAdmin: !currentStatus })
            });

            if (res.ok) {
                toast.success(currentStatus ? "Permissões removidas" : "Admin adicionado com sucesso!");
                setUsers(users.map(u => u.id === userId ? { ...u, isAdmin: !currentStatus } : u));
            } else {
                const text = await res.text();
                toast.error(text || "Erro ao atualizar permissões");
            }
        } catch (error) {
            toast.error("Erro na requisição");
        } finally {
            setUpdating(null);
        }
    };

    const deleteUser = async (userId: string, userName: string) => {
        if (!confirm(`Tem certeza que deseja deletar o usuário "${userName}"? Esta ação é irreversível.`)) {
            return;
        }

        setUpdating(userId);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success("Usuário deletado com sucesso");
                setUsers(users.filter(u => u.id !== userId));
            } else {
                const text = await res.text();
                toast.error(text || "Erro ao deletar usuário");
            }
        } catch (error) {
            toast.error("Erro na requisição");
        } finally {
            setUpdating(null);
        }
    };

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(search.toLowerCase()) || 
        u.steamId?.includes(search)
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Carregando usuários...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou SteamID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                    <Users className="w-4 h-4 text-yellow-500" />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        {users.length} Usuários Registrados
                    </span>
                </div>
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((user) => (
                    <div 
                        key={user.id}
                        className={`relative group bg-white/5 border transition-all duration-300 rounded-3xl p-5 ${user.isAdmin ? 'border-yellow-500/20 bg-yellow-500/[0.02]' : 'border-white/5 hover:border-white/10'}`}
                    >
                        {user.isAdmin && (
                            <div className="absolute -top-2 -right-2 bg-yellow-500 text-black p-1.5 rounded-lg shadow-lg">
                                <ShieldCheck size={14} />
                            </div>
                        )}

                        <div className="flex items-start gap-4">
                            <img 
                                src={user.image} 
                                alt={user.name} 
                                className={`w-12 h-12 rounded-2xl border-2 ${user.isAdmin ? 'border-yellow-500/50' : 'border-white/10'}`}
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-black italic uppercase tracking-tight truncate leading-tight">
                                    {user.name}
                                </h3>
                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                    {user.steamId}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                            <div className="flex gap-4">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter leading-none">Matches</p>
                                    <p className="text-sm font-black text-white">{user._count.matches}</p>
                                </div>
                                <div className="text-center border-l border-white/5 pl-4">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter leading-none">Lobbies</p>
                                    <p className="text-sm font-black text-white">{user._count.lobbiesCreated}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleAdmin(user.id, user.isAdmin)}
                                    disabled={updating === user.id}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${user.isAdmin ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black'}`}
                                >
                                    {updating === user.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : user.isAdmin ? (
                                        <ShieldAlert size={12} />
                                    ) : (
                                        <Shield size={12} />
                                    )}
                                    {user.isAdmin ? 'Remover Admin' : 'Tornar Admin'}
                                </button>

                                {!user.isAdmin && (
                                    <button
                                        onClick={() => deleteUser(user.id, user.name)}
                                        disabled={updating === user.id}
                                        className="p-2.5 rounded-xl bg-white/5 text-zinc-500 hover:bg-red-500 hover:text-white transition-all"
                                        title="Excluir Usuário"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredUsers.length === 0 && (
                <div className="py-20 text-center">
                    <p className="text-zinc-500 text-sm italic">Nenhum usuário encontrado para "{search}"</p>
                </div>
            )}
        </div>
    );
}
