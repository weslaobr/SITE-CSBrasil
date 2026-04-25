"use client";

import React, { useState, useEffect } from 'react';
import { 
    Users as UsersIcon, Shield, ShieldAlert, Search, 
    Loader2, Check, X, UserCheck, UserX 
} from 'lucide-react';

interface User {
    id: string;
    name: string | null;
    steamId: string | null;
    image: string | null;
    isAdmin: boolean;
    isModerator: boolean;
}

export default function UsersTab() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async (query = '') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateRole = async (userId: string, role: 'isAdmin' | 'isModerator', currentStatus: boolean) => {
        setUpdatingId(userId + role);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, [role]: !currentStatus }),
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, [role]: !currentStatus } : u));
            } else {
                const data = await res.json();
                alert(data.error || 'Erro ao atualizar permissões. Apenas Administradores podem alterar cargos.');
            }
        } catch (error) {
            alert('Erro de conexão');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchUsers(search);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Gestão de Permissões</h2>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Gerencie Administradores e Moderadores do site</p>
                </div>

                <form onSubmit={handleSearch} className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                        type="text"
                        placeholder="Buscar por nome ou SteamID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-zinc-900/40 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500/50 transition-all"
                    />
                </form>
            </div>

            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-white/[0.02]">
                                <th className="px-6 py-4">Usuário</th>
                                <th className="px-6 py-4">SteamID</th>
                                <th className="px-6 py-4">Cargos</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Carregando usuários...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest">
                                        Nenhum usuário encontrado
                                    </td>
                                </tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img 
                                                src={user.image || '/img/avatar-placeholder.png'} 
                                                alt={user.name || ''} 
                                                className="w-10 h-10 rounded-lg border border-white/10"
                                            />
                                            <div>
                                                <p className="text-xs font-black text-white">{user.name || 'Sem Nome'}</p>
                                                <div className="flex gap-1 mt-1">
                                                    {user.isAdmin && (
                                                        <span className="text-[7px] font-black uppercase text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-md">Admin</span>
                                                    )}
                                                    {user.isModerator && !user.isAdmin && (
                                                        <span className="text-[7px] font-black uppercase text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-md">Moderador</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[10px] font-mono text-zinc-500">
                                        {user.steamId || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`flex items-center gap-1.5 ${user.isAdmin ? 'text-yellow-500' : 'text-zinc-600 opacity-30'}`}>
                                                <Shield size={10} />
                                                <span className="text-[8px] font-black uppercase">Admin</span>
                                            </div>
                                            <div className={`flex items-center gap-1.5 ${user.isModerator ? 'text-blue-400' : 'text-zinc-600 opacity-30'}`}>
                                                <Shield size={10} />
                                                <span className="text-[8px] font-black uppercase">Mod</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Mod Toggle */}
                                            <button 
                                                onClick={() => updateRole(user.id, 'isModerator', user.isModerator)}
                                                disabled={updatingId === user.id + 'isModerator' || user.isAdmin}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                                                    user.isModerator 
                                                        ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-400 hover:text-black' 
                                                        : 'bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-white'
                                                } disabled:opacity-30`}
                                                title={user.isAdmin ? 'Admins já são moderadores' : ''}
                                            >
                                                {updatingId === user.id + 'isModerator' ? <Loader2 size={10} className="animate-spin" /> : <Shield size={10} />}
                                                {user.isModerator ? 'Remover Mod' : 'Tornar Mod'}
                                            </button>

                                            {/* Admin Toggle */}
                                            <button 
                                                onClick={() => updateRole(user.id, 'isAdmin', user.isAdmin)}
                                                disabled={updatingId === user.id + 'isAdmin'}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                                                    user.isAdmin 
                                                        ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black' 
                                                        : 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black'
                                                } disabled:opacity-50`}
                                            >
                                                {updatingId === user.id + 'isAdmin' ? <Loader2 size={10} className="animate-spin" /> : <ShieldAlert size={10} />}
                                                {user.isAdmin ? 'Remover Admin' : 'Tornar Admin'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
