"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';


interface PlayerCardProps {
    player: {
        steamId?: string;
        nickname: string;
        avatar: string;
        rank: string;
        rating: number;
        adr: number;
        hsPercentage: number;
        kd: number;
        winRate: string;
        hours: number;
    };
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="relative group w-80 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-xl shadow-2xl transition-all hover:border-yellow-500/50"
        >
            {/* Glow Effect on Hover */}
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500" />

            {/* Header: Avatar & Nickname */}
            <div className="relative flex items-center space-x-4 mb-6">
                <div className="relative">
                    <Image
                        src={player.avatar || '/favicon.png'}
                        alt={player.nickname}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full border-2 border-yellow-500/30 p-0.5 object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                        Pro
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{player.nickname}</h3>
                    <p className="text-zinc-400 text-xs flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> {player.hours}h de jogo
                    </p>
                </div>
            </div>

            {/* Main Stats: Ranking & Rating */}
            <div className="relative grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">Métricas de Skill</span>
                    <div className="flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-lg font-black text-white">
                            {player.rating > 0 ? new Intl.NumberFormat('en-US').format(player.rating) : 'N/A'}
                        </span>
                    </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Win Rate</span>
                    <div className="flex items-center space-x-2">
                        <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                            {player.rank}
                        </span>
                    </div>
                </div>
            </div>

            {/* Secondary Stats: ADR & WinRate */}
            <div className="relative space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center text-zinc-400">
                        <Target className="w-4 h-4 mr-2" />
                        <span>ADR Médio</span>
                    </div>
                    <span className="font-mono text-yellow-500 font-bold">{player.adr}</span>
                </div>

                {/* ADR Progress Bar */}
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(player.adr / 120) * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                    />
                </div>

                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center text-zinc-400">
                        <Target className="w-4 h-4 mr-2" />
                        <span>HS %</span>
                    </div>
                    <span className="font-mono text-white font-bold">{player.hsPercentage}%</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center text-zinc-400">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        <span>K/D Ratio</span>
                    </div>
                    <span className="font-mono text-zinc-200">{player.kd}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center text-zinc-400">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        <span>Taxa de Vitória</span>
                    </div>
                    <span className="font-mono text-zinc-200">{player.winRate}</span>
                </div>
            </div>

            {/* View Profile Button */}
            {player.steamId && (
                <Link href={`/player/${player.steamId}`} className="block w-full mt-6">
                    <button className="w-full py-2.5 bg-white text-black font-bold rounded-lg text-sm transition-transform active:scale-95 hover:bg-yellow-500 hover:text-white">
                        Ver Detalhes
                    </button>
                </Link>
            )}

            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-yellow-500/10 rounded-full blur-3xl" />
        </motion.div>
    );
};

export default PlayerCard;
