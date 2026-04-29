"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Target, Zap, Shield, Sword, BarChart3, TrendingUp, ExternalLink, Calendar, Download, Activity, BarChart2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Replay2D from './replay-2d';

interface MatchReviewModalProps {
    matchId: string | null;
    onClose: () => void;
}

export default function MatchReviewModal({ matchId, onClose }: MatchReviewModalProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'geral' | 'analitico' | 'utilitarios' | 'armas' | 'duelos' | 'simulacao'>('geral');

    useEffect(() => {
        if (matchId) {
            setData(null); // Clear previous data
            setActiveTab('geral'); // Reset tab
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
                    <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 ${(data?.data_source?.includes('premier')) ? 'bg-purple-500 shadow-purple-500/20' : 'bg-green-500 shadow-green-500/20'} rounded-[22px] flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-0 transition-transform`}>
                                    <BarChart3 className="text-black" size={28} />
                                </div>
                                <div>
                                    <h2 className={`text-3xl font-black italic uppercase tracking-tighter leading-none ${(data?.data_source?.includes('premier')) ? 'text-purple-400' : 'text-white'}`}>
                                        Relatório de Partida
                                    </h2>
                                    <p className="text-[11px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                                        {data?.map_name?.replace('de_', '') || 'Carregando...'} &nbsp;·&nbsp; <span className={(data?.data_source?.includes('premier')) ? 'text-purple-500/80' : ''}>{
                                            (data?.data_source?.includes('premier')) ? 'Premier' :
                                            (data?.data_source?.includes('matchmaking')) ? 'Competitive' :
                                            data?.data_source === 'faceit' ? 'Faceit' :
                                            data?.data_source === 'gamersclub' ? 'GamersClub' :
                                            (data?.data_source || 'Competitive')
                                        }</span>
                                    </p>
                                </div>
                            </div>

                            {/* Centered Score */}
                            <div className="flex items-center gap-12 bg-white/[0.03] px-10 py-4 rounded-[32px] border border-white/10 shadow-2xl mx-auto md:mx-0 relative overflow-hidden group/score">
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-red-500/5 opacity-0 group-hover/score:opacity-100 transition-opacity" />
                                
                                <div className="text-center relative z-10">
                                    <p className="text-[9px] font-black uppercase text-yellow-500/60 tracking-[0.15em] mb-1">Time A</p>
                                    <p className="text-4xl font-black italic text-yellow-500 leading-none drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                                        {data?.team_scores?.find((t: any) => t.team_number === 2)?.score ?? data?.team_2_score ?? '—'}
                                    </p>
                                </div>
                                
                                <div className="flex flex-col items-center gap-0 relative z-10">
                                    <div className="h-4 w-[1px] bg-white/10 mb-2" />
                                    <div className="text-zinc-700 font-black italic text-xl tracking-tighter">VS</div>
                                    <div className="h-4 w-[1px] bg-white/10 mt-2" />
                                </div>
                                
                                <div className="text-center relative z-10">
                                    <p className="text-[9px] font-black uppercase text-red-500/60 tracking-[0.15em] mb-1">Time B</p>
                                    <p className="text-4xl font-black italic text-red-500 leading-none drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                                        {data?.team_scores?.find((t: any) => t.team_number === 3)?.score ?? data?.team_3_score ?? '—'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 hover:border-white/10 shadow-lg shrink-0"
                            >
                                <X size={24} className="text-white" />
                            </button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/5 rounded-2xl w-fit">
                            {[
                                { id: 'geral', label: 'Geral' },
                                { id: 'analitico', label: 'Analítico' },
                                { id: 'utilitarios', label: 'Utilitários' },
                                { id: 'armas', label: 'Armas' },
                                { id: 'duelos', label: 'Duelos' },
                                { id: 'simulacao', label: 'Simulação 2D' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === tab.id 
                                            ? (data?.data_source?.includes('premier') ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20')
                                            : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-8 bg-[#0b0e13] custom-scrollbar text-white">
                        {loading ? (
                            <div className="h-64 flex flex-col items-center justify-center gap-4">
                                <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-zinc-500 font-black italic uppercase text-xs">Processando dados do Leetify...</p>
                            </div>
                        ) : data ? (
                            <div className="space-y-12 pb-12">
                                {/* 2D Simulation Tab */}
                                {activeTab === 'simulacao' && data?.metadata?.replayData && (
                                    <div className="mb-8">
                                        <Replay2D 
                                            mapName={data.map_name || 'de_mirage'}
                                            replayData={data.metadata.replayData}
                                            playerIndexMap={data.metadata.playerIndexMap || {}}
                                            stats={data.stats || []}
                                            killEvents={Object.values(data.metadata.roundSummaries || {}).flatMap((r: any) => (r.kills || []).map((k: any) => ({
                                                ...k,
                                                attackerSide: k.attackerSide || 'Unknown',
                                                victimSide: k.victimSide || 'Unknown'
                                            })))}
                                        />
                                    </div>
                                )}

                                {/* Performance Cards in Analytical Tab */}
                                {activeTab === 'analitico' && (
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                                        {[
                                            { label: 'Mira', value: data?.leetify_ratings?.aim || 0, icon: <Target className="text-red-500" /> },
                                            { label: 'Utilitários', value: data?.leetify_ratings?.utility || 0, icon: <Zap className="text-yellow-500" /> },
                                            { label: 'Posicionam.', value: data?.leetify_ratings?.positioning || 0, icon: <Shield className="text-yellow-500" /> },
                                            { label: 'Clutch', value: data?.leetify_ratings?.clutching || 0, icon: <Trophy className="text-amber-500" /> },
                                            { label: 'Abertura', value: data?.leetify_ratings?.opening || 0, icon: <Sword className="text-purple-500" /> },
                                        ].map((stat, i) => (
                                            <div key={i} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2">
                                                <div className="p-2 bg-white/5 rounded-lg mb-1">{stat.icon}</div>
                                                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider text-center">{stat.label}</span>
                                                <div className={`text-xl font-black italic ${stat.value > 0 ? 'text-white' : 'text-zinc-800'}`}>
                                                    {stat.value > 0 ? stat.value : '---'}
                                                </div>
                                                <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${stat.value}%` }}
                                                        className="h-full bg-yellow-500"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Advanced Stats Header for Analytical Tab */}
                                {activeTab === 'analitico' && (
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] px-2 flex items-center gap-2">
                                            <Activity size={14} className="text-yellow-500" /> Estatísticas Avançadas
                                        </h4>
                                        {data?.data_source === 'gamersclub' && (
                                            <span className="text-[8px] font-black uppercase text-zinc-700 bg-white/5 px-2 py-1 rounded">
                                                Dados limitados pela fonte: GamersClub
                                            </span>
                                        )}
                                    </div>
                                )}

                                {[2, 3].map((teamNum) => {
                                    const teamPlayers = data?.stats?.filter((p: any) => p.initial_team_number === teamNum)
                                        .sort((a: any, b: any) => b.leetify_rating - a.leetify_rating);
                                    
                                    if (!teamPlayers || teamPlayers.length === 0) return null;

                                    const isTeamA = teamNum === 2;
                                    const teamColor = isTeamA ? 'text-emerald-500' : 'text-red-500';

                                    return (
                                        <div key={teamNum} className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-6 rounded-full ${isTeamA ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                                    <h3 className={`text-xl font-black italic uppercase tracking-tighter ${teamColor}`}>
                                                        {isTeamA ? 'Time A' : 'Time B'}
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">
                                                        {teamPlayers.length} Jogadores
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-white/5 text-[9px] text-zinc-600 font-black uppercase tracking-widest bg-white/[0.01]">
                                                            <th className="pl-6 py-4" colSpan={2}>Jogador</th>
                                                            {activeTab === 'geral' ? (
                                                                <>
                                                                    <th className="py-4 text-center">K / D / A</th>
                                                                    <th className="py-4 text-center">ADR</th>
                                                                    <th className="py-4 text-center">HS%</th>
                                                                    <th className="py-4 text-center">Rating</th>
                                                                    <th className="pr-6 py-4 text-right">Multis</th>
                                                                </>
                                                            ) : activeTab === 'analitico' ? (
                                                                <>
                                                                    <th className="py-4 text-center">Flash (Ceg/Duração)</th>
                                                                    <th className="py-4 text-center">Abertura (FK/FD)</th>
                                                                    <th className="py-4 text-center">Dist. Kill</th>
                                                                    <th className="py-4 text-center">TTD (Reflexo)</th>
                                                                    <th className="pr-6 py-4 text-right">Rating</th>
                                                                </>
                                                            ) : activeTab === 'duelos' ? (
                                                                <>
                                                                    <th className="py-4 text-center">Abertura (FK/FD)</th>
                                                                    <th className="py-4 text-center">Trades (K/D)</th>
                                                                    <th className="py-4 text-center">Clutches (1vX)</th>
                                                                    <th className="py-4 text-center">KAST %</th>
                                                                    <th className="pr-6 py-4 text-right">Impacto</th>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <th className="py-4 text-center">Dano HE (Média)</th>
                                                                    <th className="py-4 text-center">Dano Molotov (T)</th>
                                                                    <th className="py-4 text-center">Flashes (Ass/Lanç)</th>
                                                                    <th className="py-4 text-center">Vezes Cegou (I/A)</th>
                                                                    <th className="pr-6 py-4 text-right">Total Thrown</th>
                                                                </>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {teamPlayers.map((player: any) => {
                                                            const cleanName = player.name
                                                                .replace(/&amp;quot;/g, '"')
                                                                .replace(/&quot;/g, '"')
                                                                .replace(/&amp;/g, '&');

                                                            return (
                                                                <tr key={player.steam64_id} className="group hover:bg-white/[0.03] transition-colors">
                                                                    <td className="pl-6 py-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`w-1.5 h-1.5 rounded-full ${isTeamA ? 'bg-yellow-500' : 'bg-red-500'} opacity-40`} />
                                                                            <img 
                                                                                src={player.avatar_url || `https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg`} 
                                                                                className="w-10 h-10 rounded-xl border border-white/10 object-cover" 
                                                                                alt="" 
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 pr-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-white font-black italic uppercase text-sm group-hover:text-yellow-400 transition-colors">
                                                                                {cleanName}
                                                                            </span>
                                                                            <a 
                                                                                href={`https://steamcommunity.com/profiles/${player.steam64_id}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            >
                                                                                <ExternalLink size={10} className="text-zinc-600" />
                                                                            </a>
                                                                        </div>
                                                                    </td>
                                                                    
                                                                    {activeTab === 'geral' ? (
                                                                        <>
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
                                                                                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' 
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
                                                                        </>
                                                                    ) : activeTab === 'analitico' ? (
                                                                        <>
                                                                            <td className="py-4 text-center">
                                                                                <span className="text-white font-bold">{player.enemies_flashed || player.flashbang_hit_foe || 0}</span>
                                                                                <span className="text-zinc-700 mx-1">·</span>
                                                                                <span className="text-zinc-400 text-[10px]">{(player.total_blind_duration || player.blind_time || 0).toFixed(1)}s</span>
                                                                            </td>
                                                                            <td className="py-4 text-center">
                                                                                <span className="text-yellow-500 font-bold">{player.fk || player.multi1k || 0}</span>
                                                                                <span className="text-zinc-700 mx-1">/</span>
                                                                                <span className="text-red-500">{player.fd || 0}</span>
                                                                            </td>
                                                                            <td className="py-4 text-center font-bold text-zinc-400">
                                                                                {player.avg_kill_distance ? `${(player.avg_kill_distance / 10).toFixed(0)}m` : '---'}
                                                                            </td>
                                                                            <td className="py-4 text-center">
                                                                                <span className={`font-black italic ${player.avg_ttd > 0 && player.avg_ttd < 400 ? 'text-green-400' : 'text-zinc-500'}`}>
                                                                                    {player.avg_ttd > 0 ? `${player.avg_ttd.toFixed(0)}ms` : '---'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="pr-6 py-4 text-right">
                                                                                <span className="text-yellow-500 font-black italic">{player.rating?.toFixed(2) || '0.00'}</span>
                                                                            </td>
                                                                        </>
                                                                    ) : activeTab === 'duelos' ? (
                                                                        <>
                                                                            <td className="py-4 text-center">
                                                                                <span className="text-yellow-500 font-bold">{player.entry_kill_count || 0}</span>
                                                                                <span className="text-zinc-700 mx-1">/</span>
                                                                                <span className="text-red-500">{player.entry_death_count || 0}</span>
                                                                                <span className="block text-[8px] text-zinc-600 uppercase font-black mt-0.5">Ratio: {((player.entry_kill_count || 0) / (player.entry_death_count || 1)).toFixed(1)}</span>
                                                                            </td>
                                                                            <td className="py-4 text-center">
                                                                                <span className="text-white font-bold">{player.trade_kill_count || 0}</span>
                                                                                <span className="text-zinc-700 mx-1">/</span>
                                                                                <span className="text-zinc-400">{player.trade_death_count || 0}</span>
                                                                            </td>
                                                                            <td className="py-4 text-center">
                                                                                <span className="text-amber-500 font-bold">{player.clutches_won || 0}</span>
                                                                                <span className="text-zinc-700 mx-1">/</span>
                                                                                <span className="text-zinc-500 text-[10px]">{player.clutch_attempts || 0}</span>
                                                                            </td>
                                                                            <td className="py-4 text-center">
                                                                                <span className="text-white font-black italic">{(player.kast * 100 || 75).toFixed(0)}%</span>
                                                                            </td>
                                                                            <td className="pr-6 py-4 text-right">
                                                                                <span className={`px-2 py-1 rounded text-[10px] font-black italic ${
                                                                                    (player.impact_rating || 1.0) > 1.1 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 'bg-white/5 text-zinc-500'
                                                                                }`}>
                                                                                    {(player.impact_rating || 1.0).toFixed(2)}
                                                                                </span>
                                                                            </td>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <td className="py-4 text-center">
                                                                                <span className="text-white font-bold">{player.he_foes_damage_avg?.toFixed(1) || '0.0'}</span>
                                                                                <span className="text-zinc-700 ml-1 text-[8px] uppercase">dmg/util</span>
                                                                            </td>
                                                                            <td className="py-4 text-center text-zinc-400">
                                                                                <span className="text-orange-500 font-bold">{player.molotov_thrown || 0}</span>
                                                                                <span className="text-zinc-700 mx-1">/</span>
                                                                                <span className="text-white">{(player.molotov_thrown * 15).toFixed(0)}</span>
                                                                            </td>
                                                                            <td className="py-4 text-center">
                                                                                <span className="text-white font-bold">{player.flash_assist || 0}</span>
                                                                                <span className="text-zinc-700 mx-1">/</span>
                                                                                <span className="text-zinc-400">{player.flashbang_thrown || 0}</span>
                                                                            </td>
                                                                            <td className="py-4 text-center">
                                                                                <span className="text-red-400">{player.flashbang_hit_foe || 0} Inim</span>
                                                                                <span className="text-zinc-700 mx-1 text-[8px]">·</span>
                                                                                <span className="text-zinc-600">{player.flashbang_hit_friend || 0} Amig</span>
                                                                            </td>
                                                                            <td className="pr-6 py-4 text-right">
                                                                                <div className="flex flex-row-reverse gap-1 justify-end">
                                                                                    <span className="bg-white/5 text-zinc-500 px-1.5 py-0.5 rounded text-[10px] uppercase font-black">
                                                                                        {(player.he_thrown || 0) + (player.molotov_thrown || 0) + (player.smoke_thrown || 0) + (player.flashbang_thrown || 0)} Total
                                                                                    </span>
                                                                                </div>
                                                                            </td>
                                                                        </>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Weapon Stats Tab */}
                                {activeTab === 'armas' && (
                                    <div className="space-y-8">
                                        {data?.stats?.map((player: any) => {
                                            const pWeapons = data?.weapon_stats?.filter((w: any) => String(w.steamid64) === String(player.steam64_id));
                                            if (!pWeapons || pWeapons.length === 0) return null;
                                            
                                            return (
                                                <div key={player.steam64_id} className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={player.avatar_url} className="w-8 h-8 rounded-lg" alt="" />
                                                        <h4 className="font-black italic uppercase text-sm">{player.name}</h4>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                        {pWeapons.sort((a:any, b:any) => b.kills - a.kills).map((w: any, idx: number) => (
                                                            <div key={idx} className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl flex flex-col gap-1">
                                                                <span className="text-[10px] font-black uppercase text-yellow-500/80">{w.weapon}</span>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-xl font-black italic">{w.kills}</span>
                                                                    <span className="text-[9px] text-zinc-500 uppercase font-bold">Kills</span>
                                                                </div>
                                                                <div className="flex justify-between text-[8px] font-bold text-zinc-500 uppercase">
                                                                    <span>HS: {w.headshots}</span>
                                                                    <span>Dmg: {w.damage}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-zinc-900/50 rounded-[40px] border border-white/5">
                                <p className="text-zinc-600 font-black italic uppercase tracking-widest text-xs">Erro ao carregar dados detalhados desta partida.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 bg-black/50 flex items-center justify-between px-8 text-white">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                <Calendar size={12} className="text-yellow-500" />
                                <span>Data: {new Date(data?.match_date || Date.now()).toLocaleDateString('pt-BR')}</span>
                            </div>
                            {data?.match_id && (
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                                    <Shield size={12} />
                                    <span>ID: {data.match_id}</span>
                                </div>
                            )}
                        </div>
                        {data?.demo_url && (
                            <a
                                href={data.demo_url}
                                className="flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-yellow-500/20 active:scale-95"
                            >
                                <Download size={14} />
                                Baixar Demo
                            </a>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
