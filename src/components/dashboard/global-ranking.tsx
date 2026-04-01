"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, Search, Trophy, Crown, Minus, Star, ExternalLink, Shield } from 'lucide-react';

interface RankUser {
    rank: number;
    steamId: string;
    nickname: string;
    avatar: string;
    rating: number;
    winRate: string;
    adr: number;
    trend: 'up' | 'down' | 'neutral';
    gcLevel: number;
    faceitLevel: number;
}

const PODIUM_CONFIG = [
    {
        pos: 0,
        label: '1º',
        crown: true,
        size: 'w-24 h-24',
        borderColor: 'border-yellow-500',
        cardBg: 'from-yellow-500/15 to-yellow-500/5',
        cardBorder: 'border-yellow-500/30',
        glow: 'shadow-[0_0_60px_rgba(246,203,2,0.2)]',
        glowRing: 'shadow-[0_0_0_3px_rgba(246,203,2,0.3)]',
        textColor: 'text-yellow-400',
        badgeBg: 'bg-yellow-500',
        badgeText: 'text-black',
        order: 'md:order-2',
        scale: 'md:scale-110',
        zIndex: 'z-10',
    },
    {
        pos: 1,
        label: '2º',
        crown: false,
        size: 'w-20 h-20',
        borderColor: 'border-zinc-400',
        cardBg: 'from-zinc-500/10 to-zinc-500/5',
        cardBorder: 'border-zinc-500/20',
        glow: 'shadow-[0_0_40px_rgba(160,160,160,0.1)]',
        glowRing: 'shadow-[0_0_0_2px_rgba(160,160,160,0.2)]',
        textColor: 'text-zinc-300',
        badgeBg: 'bg-zinc-400',
        badgeText: 'text-black',
        order: 'md:order-1',
        scale: '',
        zIndex: 'z-0',
    },
    {
        pos: 2,
        label: '3º',
        crown: false,
        size: 'w-20 h-20',
        borderColor: 'border-amber-700',
        cardBg: 'from-amber-700/10 to-amber-700/5',
        cardBorder: 'border-amber-700/20',
        glow: 'shadow-[0_0_40px_rgba(180,100,20,0.1)]',
        glowRing: '',
        textColor: 'text-amber-600',
        badgeBg: 'bg-amber-700',
        badgeText: 'text-white',
        order: 'md:order-3',
        scale: '',
        zIndex: 'z-0',
    },
];

const GlobalRanking: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<RankUser[]>([]);
    const [loading, setLoading] = useState(true);
    const maxRating = users.length > 0 ? Math.max(...users.map(u => u.rating)) : 30000;

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                const res = await fetch('/api/ranking');
                const data = await res.json();
                if (Array.isArray(data)) setUsers(data);
            } catch (error) {
                console.error("Failed to fetch rankings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRankings();
    }, []);

    const filteredUsers = users.filter(user =>
        user.nickname.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const top3 = filteredUsers.slice(0, 3);
    const rest = filteredUsers.slice(3);

    return (
        <div className="space-y-10">

            {/* ── PÓDIO ──────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-3 px-4">
                {loading ? (
                    [0, 1, 2].map(i => (
                        <div key={i} className="flex-1 max-w-xs h-52 bg-zinc-900/50 rounded-3xl border border-white/5 animate-pulse" />
                    ))
                ) : top3.length === 0 ? (
                    <div className="text-zinc-600 font-black uppercase tracking-widest text-sm py-16">
                        Nenhum jogador no ranking ainda.
                    </div>
                ) : (
                    PODIUM_CONFIG.slice(0, top3.length).map((cfg) => {
                        const user = top3[cfg.pos];
                        if (!user) return null;
                        return (
                            <motion.div
                                key={user.steamId}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: cfg.pos * 0.12, type: 'spring', stiffness: 100 }}
                                className={`flex-1 max-w-sm relative bg-gradient-to-b ${cfg.cardBg} border ${cfg.cardBorder} rounded-3xl p-6 flex flex-col items-center text-center ${cfg.glow} ${cfg.order} ${cfg.scale} transition-transform`}
                            >
                                {/* Posição badge */}
                                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full ${cfg.badgeBg} ${cfg.badgeText} flex items-center justify-center text-[11px] font-black shadow-lg`}>
                                    {cfg.pos === 0 ? <Crown size={14} /> : cfg.label}
                                </div>

                                {/* Coroa para 1º */}
                                {cfg.crown && (
                                    <div className="mb-1">
                                        <Crown className="text-yellow-500 w-6 h-6 drop-shadow-[0_0_8px_rgba(246,203,2,0.8)]" />
                                    </div>
                                )}

                                {/* Avatar */}
                                <div className={`relative mb-4 ${cfg.crown ? 'mt-0' : 'mt-4'}`}>
                                    <img
                                        src={user.avatar}
                                        className={`${cfg.size} rounded-full border-2 ${cfg.borderColor} object-cover ${cfg.glowRing} transition-all`}
                                        alt={user.nickname}
                                    />
                                    {cfg.crown && (
                                        <div className="absolute inset-0 rounded-full bg-yellow-500/10 animate-pulse" />
                                    )}
                                </div>

                                {/* Nome */}
                                <Link href={`/player/${user.steamId}`} className="group">
                                    <h3 className={`text-base font-black italic uppercase tracking-tight ${cfg.textColor} group-hover:underline truncate max-w-[180px]`}>
                                        {user.nickname}
                                    </h3>
                                </Link>

                                {/* Rating */}
                                <div className="mt-3 flex flex-col items-center gap-1">
                                    <span className={`text-3xl font-black italic tracking-tighter ${cfg.textColor}`}>
                                        {user.rating.toLocaleString()}
                                    </span>
                                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Premier SR</span>
                                </div>

                                {/* Mini badges */}
                                <div className="flex gap-2 mt-3">
                                    {user.gcLevel > 0 && (
                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 tracking-widest">
                                            GC {user.gcLevel}
                                        </span>
                                    )}
                                    {user.faceitLevel > 0 && (
                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 tracking-widest">
                                            FCS {user.faceitLevel}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* ── BUSCA ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                        type="text"
                        placeholder="Buscar jogador..."
                        className="w-full bg-zinc-950/70 border border-white/[0.07] rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-yellow-500/40 placeholder:text-zinc-700 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">
                    {filteredUsers.length} jogadores
                </span>
            </div>

            {/* ── TABELA ─────────────────────────────────────────────────── */}
            <div className="bg-zinc-950/60 border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl shadow-black/50 backdrop-blur-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-[9px] uppercase font-black text-zinc-600 tracking-[0.15em] border-b border-white/[0.05] bg-black/40 backdrop-blur-md">
                            <th className="px-5 py-3.5 w-16">#</th>
                            <th className="px-4 py-3.5">Jogador</th>
                            <th className="px-4 py-3.5">SR Premier</th>
                            <th className="px-4 py-3.5 text-center hidden md:table-cell">Gamers Club</th>
                            <th className="px-4 py-3.5 text-center hidden md:table-cell">Faceit</th>
                            <th className="px-4 py-3.5 text-center">Trend</th>
                            <th className="px-4 py-3.5 text-right"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [1, 2, 3, 4, 5].map(i => (
                                <tr key={i} className="border-b border-white/[0.04] animate-pulse">
                                    <td colSpan={7} className="px-5 py-4">
                                        <div className="h-8 bg-white/[0.03] rounded-xl" />
                                    </td>
                                </tr>
                            ))
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Trophy className="w-10 h-10 text-zinc-800" />
                                        <span className="text-zinc-600 font-black uppercase text-[10px] tracking-widest">
                                            Nenhum jogador encontrado
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user, idx) => {
                                const isTop1 = user.rank === 1;
                                const isTop3 = user.rank <= 3;
                                const pct = Math.min((user.rating / (maxRating || 30000)) * 100, 100);

                                return (
                                    <motion.tr
                                        key={user.steamId}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03, type: 'spring', stiffness: 200 }}
                                        className={`group border-b border-white/[0.04] transition-colors cursor-pointer hover:bg-white/[0.02] ${isTop1 ? 'bg-yellow-500/[0.04]' : ''}`}
                                    >
                                        {/* Posição */}
                                        <td className="px-5 py-4">
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-xl text-[11px] font-black ${
                                                isTop1 ? 'bg-yellow-500 text-black shadow-[0_0_12px_rgba(246,203,2,0.4)]' :
                                                user.rank === 2 ? 'bg-zinc-400 text-black' :
                                                user.rank === 3 ? 'bg-amber-700 text-white' :
                                                'bg-white/5 text-zinc-500'
                                            }`}>
                                                {isTop1 ? <Crown size={13} /> : user.rank < 10 ? `0${user.rank}` : user.rank}
                                            </div>
                                        </td>

                                        {/* Jogador */}
                                        <td className="px-4 py-4">
                                            <Link href={`/player/${user.steamId}`} className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img
                                                        src={user.avatar}
                                                        className={`w-9 h-9 rounded-full object-cover border ${
                                                            isTop1 ? 'border-yellow-500/60' :
                                                            isTop3 ? 'border-white/20' :
                                                            'border-white/[0.07]'
                                                        } group-hover:border-yellow-500/50 transition-all`}
                                                        alt={user.nickname}
                                                    />
                                                    {isTop1 && (
                                                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-500 rounded-full flex items-center justify-center shadow-[0_0_6px_rgba(246,203,2,0.6)]">
                                                            <Crown size={7} className="text-black" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`font-black text-sm italic tracking-tight group-hover:text-yellow-400 transition-colors truncate max-w-[140px] ${
                                                    isTop1 ? 'text-yellow-400' : 'text-zinc-200'
                                                }`}>
                                                    {user.nickname}
                                                </span>
                                            </Link>
                                        </td>

                                        {/* SR + barra */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className={`font-black text-base italic tracking-tighter ${
                                                    isTop1 ? 'text-yellow-400' : 'text-zinc-200'
                                                }`}>
                                                    {user.rating.toLocaleString()}
                                                </span>
                                                <div className="w-20 h-1.5 bg-white/[0.04] rounded-full overflow-hidden hidden sm:block">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ delay: 0.3 + idx * 0.03, duration: 0.7, ease: 'easeOut' }}
                                                        className={`h-full rounded-full ${
                                                            isTop1 ? 'bg-yellow-500 shadow-[0_0_6px_rgba(246,203,2,0.5)]' :
                                                            user.rank === 2 ? 'bg-zinc-400' :
                                                            user.rank === 3 ? 'bg-amber-700' :
                                                            'bg-zinc-600'
                                                        }`}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* GC */}
                                        <td className="px-4 py-4 text-center hidden md:table-cell">
                                            {user.gcLevel > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-black uppercase tracking-wide">
                                                    <Shield size={9} /> {user.gcLevel}
                                                </span>
                                            ) : <span className="text-zinc-800">—</span>}
                                        </td>

                                        {/* Faceit */}
                                        <td className="px-4 py-4 text-center hidden md:table-cell">
                                            {user.faceitLevel > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-black uppercase tracking-wide">
                                                    <Star size={9} /> {user.faceitLevel}
                                                </span>
                                            ) : <span className="text-zinc-800">—</span>}
                                        </td>

                                        {/* Trend */}
                                        <td className="px-4 py-4 text-center">
                                            {user.trend === 'up' && (
                                                <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-black">
                                                    <ArrowUp size={14} className="drop-shadow-[0_0_4px_rgba(52,211,153,0.7)]" />
                                                </span>
                                            )}
                                            {user.trend === 'down' && (
                                                <span className="inline-flex items-center gap-1 text-red-400 text-[10px] font-black">
                                                    <ArrowDown size={14} />
                                                </span>
                                            )}
                                            {user.trend === 'neutral' && (
                                                <Minus size={14} className="text-zinc-700 mx-auto" />
                                            )}
                                        </td>

                                        {/* Link */}
                                        <td className="px-4 py-4 text-right">
                                            <Link href={`/player/${user.steamId}`}>
                                                <ExternalLink size={13} className="text-zinc-700 group-hover:text-yellow-500 transition-colors" />
                                            </Link>
                                        </td>
                                    </motion.tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GlobalRanking;
