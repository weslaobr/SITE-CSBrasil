"use client";

import { Trophy, TrendingUp, Target, Zap, ExternalLink, BarChart3, Activity } from 'lucide-react';

interface OverviewCardProps {
    player: {
        name: string;
        avatarUrl: string;
        rating: number;
        winRate: string;
        impact: number;
        rank?: number | string;
        faceitLevel?: number;
        gamersClubLevel?: number;
        steamId: string;
    };
}

export default function OverviewCard({ player }: OverviewCardProps) {
    // Utility to get Premier rank color
    const getPremierColor = (rank: number | string) => {
        const val = typeof rank === 'number' ? rank : parseInt(String(rank));
        if (isNaN(val)) return 'text-zinc-400';
        if (val >= 25000) return 'text-pink-500';    // Global
        if (val >= 20000) return 'text-purple-500';  // Elite
        if (val >= 15000) return 'text-blue-500';    // Advanced
        if (val >= 10000) return 'text-yellow-500';   // Yellow
        if (val >= 5000) return 'text-yellow-500';   // Yellow
        return 'text-zinc-300';
    };

    return (
        <div className="bg-zinc-900/40 rounded-[40px] border border-white/5 p-8 backdrop-blur-xl relative overflow-hidden group">
            {/* Animated Glow Background */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/20 transition-all duration-700" />

            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
                <div className="relative">
                    <img 
                        src={player.avatarUrl || "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg"} 
                        alt={player.name}
                        className="w-32 h-32 rounded-3xl border-2 border-yellow-500/30 object-cover shadow-2xl"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-tighter shadow-xl">
                        PLAYER
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
                                {player.name}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <p className="text-[10px] font-black italic tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" /> Status: Ativo na TropaCS
                                </p>

                                {/* Ícones/Emblemas da Plataforma */}
                                <div className="flex items-center gap-2 ml-2">
                                    <span className="px-2 py-0.5 bg-white/5 border border-yellow-500/20 text-yellow-500 rounded text-[9px] font-black uppercase">
                                        GC {player.gamersClubLevel ? `LVL ${player.gamersClubLevel}` : 'N/A'}
                                    </span>
                                    <span className="px-2 py-0.5 bg-white/5 border border-orange-500/20 text-orange-500 rounded text-[9px] font-black uppercase">
                                        FACEIT {player.faceitLevel ? `LVL ${player.faceitLevel}` : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Links */}
                        <div className="flex items-center justify-center gap-2">
                            <a 
                                href={`https://leetify.com/public/profile/${player.steamId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all hover:scale-105"
                            >
                                <BarChart3 size={14} /> Perfil Analytics
                            </a>
                            <a 
                                href={`https://faceitfinder.com/profile/${player.steamId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-white/10 flex items-center gap-2 transition-all"
                            >
                                <ExternalLink size={14} /> FACEIT
                            </a>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group/stat hover:border-yellow-500/30 transition-all">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1 group-hover/stat:text-yellow-500 transition-colors">
                                <Zap size={10} /> Rating 2.0
                            </p>
                            <p className="text-2xl font-black text-white italic">
                                {player.rating.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group/stat hover:border-orange-500/30 transition-all">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1 group-hover/stat:text-orange-500 transition-colors">
                                <Trophy size={10} /> Win Rate
                            </p>
                            <p className="text-2xl font-black text-white italic">
                                {player.winRate}
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group/stat hover:border-yellow-500/30 transition-all">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1 group-hover/stat:text-yellow-500 transition-colors">
                                <TrendingUp size={10} /> Impacto
                            </p>
                            <p className="text-2xl font-black text-white italic">
                                {player.impact.toFixed(1)}
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group/stat hover:border-yellow-500/30 transition-all">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1 group-hover/stat:text-yellow-500 transition-colors">
                                <Target size={10} /> Premier
                            </p>
                            <p className={`text-2xl font-black uppercase italic ${getPremierColor(player.rank || 0)}`}>
                                {player.rank || "Global"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

