"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowUp, ArrowDown, Search, Medal } from 'lucide-react';

interface RankUser {
    rank: number;
    nickname: string;
    avatar: string;
    rating: number;
    winRate: string;
    adr: number;
    trend: 'up' | 'down' | 'neutral';
}

const GlobalRanking: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const users: RankUser[] = [
        { rank: 1, nickname: 's1mple_fan', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1', rating: 2850, winRate: '68%', adr: 94.2, trend: 'up' },
        { rank: 2, nickname: 'Fallen_de_Cria', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2', rating: 2790, winRate: '62%', adr: 88.5, trend: 'neutral' },
        { rank: 3, nickname: 'Zywoo_Jr', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3', rating: 2715, winRate: '60%', adr: 91.0, trend: 'down' },
        { rank: 4, nickname: 'NiKo_Belo', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4', rating: 2650, winRate: '58%', adr: 85.4, trend: 'up' },
        { rank: 5, nickname: 'Kscerato_B', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5', rating: 2590, winRate: '55%', adr: 82.1, trend: 'up' },
    ];

    return (
        <div className="p-8 bg-zinc-950 min-h-screen text-white">
            <div className="max-w-5xl mx-auto">
                {/* Header Table */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Trophy className="text-cyan-500 w-8 h-8" />
                            <h1 className="text-4xl font-black tracking-tighter">RANKING GLOBAL</h1>
                        </div>
                        <p className="text-zinc-500">Os jogadores de maior elite da Tropa do CS2.</p>
                    </div>

                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Buscar player..."
                            className="w-full bg-zinc-900 border border-white/5 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-cyan-500/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Podium Top 3 (Simplified for this UI) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {users.slice(0, 3).map((user, idx) => (
                        <motion.div
                            key={user.nickname}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`relative p-6 rounded-2xl border ${idx === 0 ? 'bg-cyan-500/10 border-cyan-500/20 shadow-glow-cyan' : 'bg-zinc-900/50 border-white/5'} flex flex-col items-center text-center overflow-hidden`}
                        >
                            {idx === 0 && <Medal className="absolute top-4 right-4 text-cyan-500 w-6 h-6" />}
                            <img src={user.avatar} className="w-20 h-20 rounded-full border-4 border-zinc-800 mb-4" />
                            <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Rank #{user.rank}</p>
                            <h3 className="text-xl font-bold mb-2">{user.nickname}</h3>
                            <div className="text-2xl font-black text-white">{user.rating} SR</div>
                        </motion.div>
                    ))}
                </div>

                {/* Table List */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
                                <th className="px-6 py-4"># Pos</th>
                                <th className="px-6 py-4">Player</th>
                                <th className="px-6 py-4">Skill Rating</th>
                                <th className="px-6 py-4">Win Rate</th>
                                <th className="px-6 py-4">ADR</th>
                                <th className="px-6 py-4">Trend</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user, idx) => (
                                <motion.tr
                                    key={user.nickname}
                                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                                    className="border-b border-white/5 group transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-5 font-mono font-bold text-zinc-400">
                                        {user.rank < 10 ? `0${user.rank}` : user.rank}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatar} className="w-8 h-8 rounded-full" />
                                            <span className="font-bold text-white group-hover:text-cyan-400 transition-colors">{user.nickname}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-zinc-200">{user.rating}</span>
                                            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-cyan-500" style={{ width: `${(user.rating / 3000) * 100}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 font-mono text-xs text-zinc-400">{user.winRate}</td>
                                    <td className="px-6 py-5 font-mono text-xs text-zinc-400">{user.adr}</td>
                                    <td className="px-6 py-5">
                                        {user.trend === 'up' && <ArrowUp className="text-green-500 w-4 h-4" />}
                                        {user.trend === 'down' && <ArrowDown className="text-red-500 w-4 h-4" />}
                                        {user.trend === 'neutral' && <div className="w-4 h-0.5 bg-zinc-700" />}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GlobalRanking;
