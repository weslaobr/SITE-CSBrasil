"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Target, TrendingUp, Calendar, ExternalLink, Download, BarChart2, BarChart3, Zap, Shield, Sword } from 'lucide-react';

interface PlayerStats {
    nickname: string;
    avatar: string;
    rank: string;
    kills: number;
    deaths: number;
    assists: number;
    diff: number;
    kd: number;
    adr: number;
    hs: string;
    kast: string;
    rating: number;
    ef: number;
    fkd: number;
    trades: number;
    onevx: number;
    multikills: string;
    isUser?: boolean;
}

interface Match {
    id: string;
    source: string;
    gameMode: string;
    mapName: string;
    kills: number;
    deaths: number;
    assists: number;
    mvps?: number;
    matchDate: string;
    duration?: string;
    result: string;
    score: string;
    url?: string;
    externalId?: string;
    metadata?: any;
    adr?: number;
    hsPercentage?: number;
}

interface MatchReportModalProps {
    match: Match | null;
    isOpen: boolean;
    onClose: () => void;
}

const MatchReportModal: React.FC<MatchReportModalProps> = ({ match, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('geral');

    if (!match) return null;

    const getScoreboardData = () => {
        // Generate Mock Data in CSBrasil style
        const generateStats = (name: string, isUser = false): PlayerStats => {
            const meta = match.metadata || {};
            const k = isUser ? (match.kills || 0) : 15 + Math.floor(Math.random() * 10);
            const d = isUser ? (match.deaths || 0) : 15 + Math.floor(Math.random() * 10);
            const a = isUser ? (match.assists || 0) : 1 + Math.floor(Math.random() * 5);

            return {
                nickname: isUser ? "[Sua Conta]" : name,
                avatar: isUser ? "https://avatars.steamstatic.com/2cf8997181cfcbceeacd49034d12aaf4c378d15e.jpg" : `https://i.pravatar.cc/150?u=${name}`,
                rank: "Global Elite",
                kills: k,
                deaths: d,
                assists: a,
                diff: k - d,
                kd: Number((k / (d || 1)).toFixed(2)),
                adr: isUser ? (match.adr || 70) : 70 + Math.floor(Math.random() * 30),
                hs: isUser ? (match.hsPercentage ? `${match.hsPercentage.toFixed(1)}%` : '20%') : `${20 + Math.floor(Math.random() * 40)}%`,
                kast: `${70 + Math.floor(Math.random() * 20)}%`,
                rating: isUser && meta.leetify_rating ? meta.leetify_rating : 0.9 + Math.random() * 0.4,
                ef: Math.floor(Math.random() * 5),
                fkd: 0,
                trades: 0,
                onevx: 0,
                multikills: isUser && meta.tripleKills ? `${meta.tripleKills}/${meta.quadroKills}/${meta.pentaKills}` : "0/0/0",
                isUser
            };
        };

        return {
            team1: [
                generateStats("User", true),
                generateStats("Teammate 1"),
                generateStats("Teammate 2"),
                generateStats("Teammate 3"),
                generateStats("Teammate 4"),
            ],
            team2: [
                generateStats("Opponent 1"),
                generateStats("Opponent 2"),
                generateStats("Opponent 3"),
                generateStats("Opponent 4"),
                generateStats("Opponent 5"),
            ]
        };
    };

    const getMapImage = (name: string) => {
        if (!name) return 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_mirage.png';
        const mapName = name.toLowerCase().replace('de_', '').trim();
        const mapMapping: Record<string, string> = {
            'dust 2': 'de_dust2', 'dust2': 'de_dust2', 'dust ii': 'de_dust2',
            'mirage': 'de_mirage', 'inferno': 'de_inferno', 'nuke': 'de_nuke',
            'overpass': 'de_overpass', 'vertigo': 'de_vertigo', 'ancient': 'de_ancient',
            'anubis': 'de_anubis'
        };
        const officialName = mapMapping[mapName] || `de_${mapName}`;
        return `https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/${officialName}.png`;
    };

    const { team1, team2 } = getScoreboardData();
    const isWin = match.result === 'Win' || match.result === 'Victory';

    return (
        <AnimatePresence>
            {isOpen && (
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
                                    <div className="relative w-14 h-14 overflow-hidden rounded-[22px] border border-white/10 shrink-0">
                                        <img 
                                            src={getMapImage(match.mapName)} 
                                            className="w-full h-full object-cover" 
                                            alt={match.mapName} 
                                        />
                                        <div className="absolute inset-0 bg-green-500/10 mix-blend-overlay" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">
                                            Relatório de Partida
                                        </h2>
                                        <p className="text-[11px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                                            {match.mapName?.replace('de_', '')} &nbsp;·&nbsp; {match.gameMode || 'Competitive'}
                                        </p>
                                    </div>
                                </div>

                                {/* Dynamic Score Center */}
                                <div className="flex items-center gap-12 bg-white/[0.03] px-10 py-4 rounded-[32px] border border-white/10 shadow-2xl mx-auto md:mx-0 relative overflow-hidden group/score">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-red-500/5 opacity-0 group-hover/score:opacity-100 transition-opacity" />
                                    <div className="text-center relative z-10">
                                        <p className="text-[9px] font-black uppercase text-emerald-500/60 tracking-[0.15em] mb-1">Time A</p>
                                        <p className={`text-4xl font-black italic leading-none ${isWin ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                            {match.score.split('-')[0]}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-center gap-0 relative z-10">
                                        <div className="h-4 w-[1px] bg-white/10 mb-2" />
                                        <div className="text-zinc-700 font-black italic text-xl tracking-tighter">VS</div>
                                        <div className="h-4 w-[1px] bg-white/10 mt-2" />
                                    </div>
                                    <div className="text-center relative z-10">
                                        <p className="text-[9px] font-black uppercase text-red-500/60 tracking-[0.15em] mb-1">Time B</p>
                                        <p className={`text-4xl font-black italic leading-none ${!isWin ? 'text-red-500' : 'text-zinc-500'}`}>
                                            {match.score.split('-')[1]}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 hover:border-white/10 shadow-lg"
                                >
                                    <X size={24} className="text-white" />
                                </button>
                            </div>

                            {/* Standardized Tabs */}
                            <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/5 rounded-2xl w-fit">
                                {[
                                    { id: 'geral', label: 'Geral' },
                                    { id: 'analitico', label: 'Analítico' },
                                    { id: 'utilitarios', label: 'Utilitários' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            activeTab === tab.id 
                                                ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' 
                                                : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Body Area */}
                        <div className="flex-1 overflow-y-auto p-8 bg-[#0b0e13] custom-scrollbar text-white">
                            {activeTab === 'geral' ? (
                                <div className="space-y-8 pb-8">
                                    {/* Team 1 (Emerald Side) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                                            <h3 className="text-xl font-black italic uppercase tracking-tighter text-emerald-500">Time A (Aliado)</h3>
                                        </div>
                                        <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/5 text-[9px] text-zinc-600 font-black uppercase tracking-widest bg-white/[0.01]">
                                                        <th className="pl-6 py-4">Jogador</th>
                                                        <th className="py-4 text-center">K / D / A</th>
                                                        <th className="py-4 text-center">ADR</th>
                                                        <th className="py-4 text-center">HS%</th>
                                                        <th className="py-4 text-center">Rating</th>
                                                        <th className="pr-6 py-4 text-right">K/D</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {team1.map((p, i) => (
                                                        <tr key={i} className={`group hover:bg-white/[0.03] transition-colors ${p.isUser ? 'bg-green-500/5' : ''}`}>
                                                            <td className="pl-6 py-4 flex items-center gap-3">
                                                                <img src={p.avatar} className="w-8 h-8 rounded-xl border border-white/10 shadow-lg" alt="" />
                                                                <span className={`font-black italic uppercase text-sm ${p.isUser ? 'text-green-500' : 'text-white'}`}>{p.nickname}</span>
                                                            </td>
                                                            <td className="py-4 text-center">
                                                                <span className="text-white font-bold">{p.kills}</span>
                                                                <span className="text-zinc-700 mx-1">/</span>
                                                                <span className="text-zinc-400">{p.deaths}</span>
                                                                <span className="text-zinc-700 mx-1">/</span>
                                                                <span className="text-zinc-500">{p.assists}</span>
                                                            </td>
                                                            <td className="py-4 text-center font-black italic text-white">{p.adr.toFixed(0)}</td>
                                                            <td className="py-4 text-center font-bold text-zinc-500 text-xs">{p.hs}</td>
                                                            <td className="py-4 text-center">
                                                                <span className={`px-3 py-1.5 rounded-xl font-black italic text-xs border ${
                                                                    p.rating >= 1 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                                }`}>
                                                                    {p.rating.toFixed(2)}
                                                                </span>
                                                            </td>
                                                            <td className="pr-6 py-4 text-right font-black italic text-zinc-400">{p.kd.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Team 2 (Red Side) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="w-2 h-6 bg-red-500 rounded-full" />
                                            <h3 className="text-xl font-black italic uppercase tracking-tighter text-red-500">Time B (Inimigo)</h3>
                                        </div>
                                        <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden">
                                            <table className="w-full text-left">
                                                <tbody className="divide-y divide-white/5">
                                                    {team2.map((p, i) => (
                                                        <tr key={i} className="group hover:bg-white/[0.03] transition-colors">
                                                            <td className="pl-6 py-4 flex items-center gap-3">
                                                                <img src={p.avatar} className="w-8 h-8 rounded-xl border border-white/10" alt="" />
                                                                <span className="text-white font-black italic uppercase text-sm">{p.nickname}</span>
                                                            </td>
                                                            <td className="py-4 text-center">
                                                                <span className="text-white font-bold">{p.kills}</span>
                                                                <span className="text-zinc-700 mx-1">/</span>
                                                                <span className="text-zinc-400">{p.deaths}</span>
                                                                <span className="text-zinc-700 mx-1">/</span>
                                                                <span className="text-zinc-500">{p.assists}</span>
                                                            </td>
                                                            <td className="py-4 text-center font-black italic text-white">{p.adr.toFixed(0)}</td>
                                                            <td className="py-4 text-center font-bold text-zinc-500 text-xs">{p.hs}</td>
                                                            <td className="py-4 text-center">
                                                                <span className={`px-3 py-1.5 rounded-xl font-black italic text-xs border ${
                                                                    p.rating >= 1 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                                }`}>
                                                                    {p.rating.toFixed(2)}
                                                                </span>
                                                            </td>
                                                            <td className="pr-6 py-4 text-right font-black italic text-zinc-400">{p.kd.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-green-500/5 border border-green-500/10 rounded-[32px] p-10 text-center">
                                        <div className="w-20 h-20 bg-green-500/20 rounded-[28px] flex items-center justify-center mx-auto mb-6">
                                            <BarChart2 className="text-green-500" size={32} />
                                        </div>
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-3">Dados Analíticos Externos</h3>
                                        <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest max-w-md mx-auto mb-8">
                                            Essa partida foi importada do Steam. Para ver a análise granulada de utilitários e abertura de pixels, confira no CSStats.gg.
                                        </p>
                                        <a 
                                            href={`https://csstats.gg/match/${match.externalId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-3 bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-200 transition-all active:scale-95 shadow-2xl"
                                        >
                                            Ver Análise no CSStats.gg <ExternalLink size={14} />
                                        </a>
                                    </div>

                                    <div className="bg-white/5 border border-white/5 rounded-[32px] p-8">
                                         <h4 className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-6 flex items-center gap-2">
                                            <Trophy size={14} className="text-yellow-500" /> Histórico de Rodadas
                                         </h4>
                                         <div className="flex flex-wrap gap-2">
                                            {match.score.split('-').map((s, i) => (
                                                <div key={i} className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl">
                                                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Total {i === 0 ? 'Time A' : 'Time B'}</span>
                                                    <span className="text-2xl font-black italic text-white">{s}</span>
                                                </div>
                                            ))}
                                         </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between mt-12 pt-8 border-t border-white/5">
                                <div className="flex gap-6">
                                    <div className="flex items-center gap-2">
                                        <Sword size={14} className="text-emerald-500" />
                                        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Data: {new Date(match.matchDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Shield size={14} className="text-green-500" />
                                        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">ID: {match.externalId || 'Local'}</span>
                                    </div>
                                </div>

                                {match.url && (
                                    <a
                                        href={match.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-green-600 hover:bg-green-500 text-black px-8 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 transition-all shadow-lg active:scale-95"
                                    >
                                        <Download size={14} /> Baixar Demo
                                    </a>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default MatchReportModal;
