"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Target, Zap, Shield, Sword, BarChart3, TrendingUp, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface MatchReviewModalProps {
    matchId: string | null;
    onClose: () => void;
}

export default function MatchReviewModal({ matchId, onClose }: MatchReviewModalProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (matchId) {
            fetchMatchDetails();
        }
    }, [matchId]);

    const fetchMatchDetails = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/match/${matchId}`);
            setData(res.data);
        } catch (error) {
            console.error("Error fetching match details:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!matchId) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-950 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.01]">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-green-500 rounded-[22px] flex items-center justify-center shadow-2xl shadow-green-500/20 rotate-3 group-hover:rotate-0 transition-transform">
                                <BarChart3 className="text-black" size={28} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">
                                    Relatório de Partida
                                </h2>
                                <p className="text-[11px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                                    {data?.map_name?.replace('de_', '') || 'Carregando...'} &nbsp;·&nbsp; {data?.data_source || 'Competitive'}
                                </p>
                            </div>
                        </div>

                        {/* Centered Score */}
                        <div className="flex items-center gap-12 bg-white/[0.03] px-10 py-4 rounded-[32px] border border-white/10 shadow-2xl mx-auto md:mx-0 relative overflow-hidden group/score">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-red-500/5 opacity-0 group-hover/score:opacity-100 transition-opacity" />
                            
                            {(() => {
                                const team2 = data?.team_scores?.find((t: any) => t.team_number === 2);
                                const team3 = data?.team_scores?.find((t: any) => t.team_number === 3);
                                
                                return (
                                    <>
                                        <div className="text-center relative z-10">
                                            <p className="text-[9px] font-black uppercase text-green-500/60 tracking-[0.2em] mb-1">Time A</p>
                                            <p className="text-4xl font-black italic text-green-500 leading-none drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                                                {team2?.score ?? data?.team_2_score ?? data?.score?.[0] ?? '—'}
                                            </p>
                                        </div>
                                        
                                        <div className="flex flex-col items-center gap-0 relative z-10">
                                            <div className="h-4 w-[1px] bg-white/10 mb-2" />
                                            <div className="text-zinc-700 font-black italic text-xl tracking-tighter">VS</div>
                                            <div className="h-4 w-[1px] bg-white/10 mt-2" />
                                        </div>
                                        
                                        <div className="text-center relative z-10">
                                            <p className="text-[9px] font-black uppercase text-red-500/60 tracking-[0.2em] mb-1">Time B</p>
                                            <p className="text-4xl font-black italic text-red-500 leading-none drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                                                {team3?.score ?? data?.team_3_score ?? data?.score?.[1] ?? '—'}
                                            </p>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 hover:border-white/10 shrink-0"
                        >
                            <X size={24} className="text-white" />
                        </button>
                    </div>
                                        {/* Body */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {loading ? (
                            <div className="h-64 flex flex-col items-center justify-center gap-4">
                                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-zinc-500 font-black italic uppercase text-xs">Processando dados do Leetify...</p>
                            </div>
                        ) : data ? (
                            <div className="space-y-12 pb-12">
                                {[2, 3].map((teamNum) => {
                                    const teamPlayers = data.stats.filter((p: any) => p.initial_team_number === teamNum)
                                        .sort((a: any, b: any) => b.leetify_rating - a.leetify_rating);
                                    
                                    if (teamPlayers.length === 0) return null;

                                    const isTeamA = teamNum === 2;
                                    const teamColor = isTeamA ? 'text-green-500' : 'text-red-500';
                                    const teamBg = isTeamA ? 'bg-green-500/10' : 'bg-red-500/10';
                                    const teamBorder = isTeamA ? 'border-green-500/20' : 'border-red-500/20';

                                    return (
                                        <div key={teamNum} className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-6 rounded-full ${isTeamA ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    <h3 className={`text-xl font-black italic uppercase tracking-tighter ${teamColor}`}>
                                                        {isTeamA ? 'Time A' : 'Time B'}
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">
                                                        {teamPlayers.length} Jogadores
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-white/5 text-[9px] text-zinc-600 font-black uppercase tracking-widest bg-white/[0.01]">
                                                            <th className="pl-6 py-4">Jogador</th>
                                                            <th className="py-4 text-center">K / D / A</th>
                                                            <th className="py-4 text-center">ADR</th>
                                                            <th className="py-4 text-center">HS%</th>
                                                            <th className="py-4 text-center">Rating</th>
                                                            <th className="pr-6 py-4 text-right">Multis</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {teamPlayers.map((player: any) => {
                                                            // Fix HTML entities in names from API
                                                            const cleanName = player.name
                                                                .replace(/&amp;quot;/g, '"')
                                                                .replace(/&quot;/g, '"')
                                                                .replace(/&amp;/g, '&');

                                                            return (
                                                                <tr key={player.steam64_id} className="group hover:bg-white/[0.03] transition-colors">
                                                                    <td className="pl-6 py-4">
                                                                        <a 
                                                                            href={`https://steamcommunity.com/profiles/${player.steam64_id}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-3 group/name inline-flex"
                                                                        >
                                                                            <div className={`w-1.5 h-1.5 rounded-full ${isTeamA ? 'bg-green-500' : 'bg-red-500'} opacity-40`} />
                                                                            <span className="text-white font-black italic uppercase text-sm group-hover/name:text-cyan-400 transition-colors">
                                                                                {cleanName}
                                                                            </span>
                                                                            <ExternalLink size={10} className="text-zinc-700 opacity-0 group-hover/name:opacity-100 transition-all -translate-x-1 group-hover/name:translate-x-0" />
                                                                        </a>
                                                                    </td>
                                                                    <td className="py-4 text-center">
                                                                        <span className="text-white font-bold">{player.total_kills}</span>
                                                                        <span className="text-zinc-700 mx-1">/</span>
                                                                        <span className="text-zinc-400">{player.total_deaths}</span>
                                                                        <span className="text-zinc-700 mx-1">/</span>
                                                                        <span className="text-zinc-500">{player.total_assists}</span>
                                                                    </td>
                                                                    <td className="py-4 text-center">
                                                                        <span className="text-white font-black italic">{(player.total_damage / player.rounds_count).toFixed(1)}</span>
                                                                    </td>
                                                                    <td className="py-4 text-center font-bold text-zinc-500 text-xs">
                                                                        {(player.accuracy_head * 100).toFixed(0)}%
                                                                    </td>
                                                                    <td className="py-4 text-center">
                                                                        <span className={`px-3 py-1.5 rounded-xl font-black italic text-xs border ${
                                                                            player.leetify_rating > 0 
                                                                                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                                                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                                        }`}>
                                                                            {player.leetify_rating.toFixed(2)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="pr-6 py-4 text-right">
                                                                        <div className="flex flex-row-reverse gap-1.5">
                                                                            {player.multi5k > 0 && <span className="bg-red-500 text-white text-[8px] px-2 py-0.5 rounded font-black uppercase shadow-lg shadow-red-500/20">ACE</span>}
                                                                            {player.multi4k > 0 && <span className="bg-orange-500/20 text-orange-400 border border-orange-500/20 text-[8px] px-2 py-0.5 rounded font-black uppercase">4k</span>}
                                                                            {player.multi3k > 0 && <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 text-[8px] px-2 py-0.5 rounded font-black uppercase">3k</span>}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white/[0.02] rounded-[40px] border border-white/5">
                                <p className="text-zinc-600 font-black italic uppercase tracking-widest text-xs">Erro ao carregar dados detalhados desta partida.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
