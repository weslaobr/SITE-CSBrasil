"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Target, Zap, Shield, Sword, BarChart3, TrendingUp } from 'lucide-react';
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
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                                <BarChart3 className="text-black" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                                    Análise de Partida
                                </h2>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                    {data?.map_name?.replace('de_', '') || 'Carregando...'} • {data?.data_source || 'Match'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5"
                        >
                            <X size={20} className="text-white" />
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
                            <div className="space-y-8">
                                {/* Scoreboard */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-4">
                                        <h3 className="text-sm font-black italic uppercase tracking-widest text-zinc-400">Scoreboard</h3>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                <span className="text-[10px] font-bold text-white uppercase italic">Team A</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                                <span className="text-[10px] font-bold text-white uppercase italic">Team B</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/5 text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                                                    <th className="pb-4 pt-2">Jogador</th>
                                                    <th className="pb-4 pt-2 text-center">K / D / A</th>
                                                    <th className="pb-4 pt-2 text-center">ADR</th>
                                                    <th className="pb-4 pt-2 text-center">HS%</th>
                                                    <th className="pb-4 pt-2 text-center">Rating</th>
                                                    <th className="pb-4 pt-2 text-right">Multis</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {data.stats.sort((a: any, b: any) => b.leetify_rating - a.leetify_rating).map((player: any) => (
                                                    <tr key={player.steam64_id} className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-1.5 h-6 rounded-full ${player.initial_team_number === 2 ? 'bg-green-500' : 'bg-red-500'}`} />
                                                                <span className="text-white font-black italic uppercase text-sm">{player.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            <span className="text-white font-bold">{player.total_kills}</span>
                                                            <span className="text-zinc-600 mx-1">/</span>
                                                            <span className="text-zinc-400">{player.total_deaths}</span>
                                                            <span className="text-zinc-600 mx-1">/</span>
                                                            <span className="text-zinc-500">{player.total_assists}</span>
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            <span className="text-white font-black italic">{(player.total_damage / player.rounds_count).toFixed(1)}</span>
                                                        </td>
                                                        <td className="py-4 text-center font-bold text-zinc-400">
                                                            {(player.accuracy_head * 100).toFixed(0)}%
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            <span className={`px-3 py-1 rounded-lg font-black italic text-xs ${player.leetify_rating > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                {player.leetify_rating.toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            <div className="flex flex-row-reverse gap-1">
                                                                {player.multi3k > 0 && <span className="bg-yellow-500/20 text-yellow-500 text-[8px] px-1.5 py-0.5 rounded font-black uppercase">3k</span>}
                                                                {player.multi4k > 0 && <span className="bg-orange-500/20 text-orange-500 text-[8px] px-1.5 py-0.5 rounded font-black uppercase">4k</span>}
                                                                {player.multi5k > 0 && <span className="bg-red-500/20 text-red-500 text-[8px] px-1.5 py-0.5 rounded font-black uppercase">ACE</span>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-zinc-600 font-black italic uppercase">Erro ao carregar dados desta partida.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
