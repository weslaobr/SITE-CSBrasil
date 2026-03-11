"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Target, TrendingUp, Calendar, ExternalLink, Download, BarChart2 } from 'lucide-react';

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
}

interface MatchReportModalProps {
    match: Match | null;
    isOpen: boolean;
    onClose: () => void;
}

const MatchReportModal: React.FC<MatchReportModalProps> = ({ match, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('SCOREBOARD');

    if (!match) return null;

    const getScoreboardData = () => {
        if (match.source === 'Faceit' && match.metadata?.fullStats?.rounds?.[0]) {
            const roundData = match.metadata.fullStats.rounds[0];

            const mapStatsPlayers = (teamIndex: number) => {
                const team = roundData.teams[teamIndex];
                if (!team || !team.players) return [];

                return team.players.map((p: any) => {
                    const s = p.player_stats;
                    const kills = parseInt(s.Kills || '0');
                    const deaths = parseInt(s.Deaths || '0');
                    return {
                        nickname: p.nickname,
                        avatar: `https://i.pravatar.cc/150?u=${p.nickname}`,
                        rank: "Faceit",
                        kills,
                        deaths,
                        assists: parseInt(s.Assists || '0'),
                        diff: kills - deaths,
                        kd: parseFloat(s["K/D Ratio"] || '0'),
                        adr: parseFloat(s.ADR || '0'),
                        hs: `${s["Headshots %"] || '0'}%`,
                        kast: "N/A",
                        rating: parseFloat(s.KR || '0') * 1.5,
                        ef: 0,
                        fkd: 0,
                        trades: 0,
                        onevx: 0,
                        multikills: `${s["Triple Kills"] || '0'} / ${s["Quadro Kills"] || '0'} / ${s["Penta Kills"] || '0'}`,
                        isUser: p.nickname === match.metadata?.userNickname
                    } as PlayerStats;
                });
            };

            return {
                team1: mapStatsPlayers(0),
                team2: mapStatsPlayers(1)
            };
        }

        // Fallback to Mock Data
        const generateStats = (name: string, isUser = false): PlayerStats => {
            const meta = match.metadata || {};
            const k = isUser ? match.kills : 15 + Math.floor(Math.random() * 15);
            const d = isUser ? match.deaths : 15 + Math.floor(Math.random() * 10);
            const a = isUser ? match.assists : 1 + Math.floor(Math.random() * 10);

            return {
                nickname: name,
                avatar: isUser ? "https://avatars.steamstatic.com/2cf8997181cfcbceeacd49034d12aaf4c378d15e.jpg" : `https://i.pravatar.cc/150?u=${name}`,
                rank: "Global Elite",
                kills: k,
                deaths: d,
                assists: a,
                diff: k - d,
                kd: Number((k / (d || 1)).toFixed(2)),
                adr: isUser ? (match as any).adr || 70 : 70 + Math.floor(Math.random() * 50),
                hs: isUser ? (meta.headshots ? `${meta.headshots}` : `${Math.floor(Math.random() * 20)}hs`) : `${20 + Math.floor(Math.random() * 40)}%`,
                kast: `${60 + Math.floor(Math.random() * 30)}%`,
                rating: 0.8 + Math.random() * 0.8,
                ef: Math.floor(Math.random() * 12),
                fkd: Math.floor(Math.random() * 5) - 2,
                trades: Math.floor(Math.random() * 5),
                onevx: Math.floor(Math.random() * 3),
                multikills: isUser && meta.tripleKills ? `${meta.tripleKills} / ${meta.quadroKills} / ${meta.pentaKills}` : `${Math.floor(Math.random() * 5)}k+`,
                isUser
            };
        };

        return {
            team1: [
                generateStats("[Current User]", true),
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

    const { team1, team2 } = getScoreboardData();
    const tabs = ["SCOREBOARD", "ROUNDS", "WEAPONS", "DUELS", "HEATMAPS"];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="relative w-full max-w-7xl h-full md:h-auto max-h-[95vh] flex flex-col bg-[#0b0e13] border border-white/5 md:rounded-xl shadow-2xl overflow-hidden"
                    >
                        {/* Top Navigation Bar */}
                        <div className="flex flex-wrap items-center bg-[#151921] border-b border-white/5 px-6">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-4 text-[11px] font-black tracking-widest transition-all border-b-2 uppercase ${activeTab === tab ? 'text-white border-cyan-500 bg-white/5' : 'text-zinc-500 border-transparent hover:text-white'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                            <div className="ml-auto">
                                <button
                                    onClick={onClose}
                                    className="p-4 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto bg-[#0b0e13] custom-scrollbar p-6">
                            {activeTab === 'SCOREBOARD' ? (
                                <div className="overflow-x-auto rounded-lg border border-white/5 bg-[#11161d]">
                                    <table className="w-full text-left border-collapse min-w-[1000px]">
                                        <thead>
                                            <tr className="bg-[#1a2028] text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5">
                                                <th className="px-4 py-3 min-w-[200px]">Player</th>
                                                <th className="px-2 py-3 text-center">K</th>
                                                <th className="px-2 py-3 text-center">D</th>
                                                <th className="px-2 py-3 text-center">A</th>
                                                <th className="px-2 py-3 text-center">+/-</th>
                                                <th className="px-2 py-3 text-center">K/D</th>
                                                <th className="px-2 py-3 text-center">ADR</th>
                                                <th className="px-2 py-3 text-center">HS%</th>
                                                <th className="px-2 py-3 text-center">KAST</th>
                                                <th className="px-4 py-3 text-center bg-white/5">Rating</th>
                                                <th className="px-2 py-3 text-center text-zinc-600">EF</th>
                                                <th className="px-2 py-3 text-center text-zinc-600">FKD</th>
                                                <th className="px-2 py-3 text-center text-zinc-600"> Trades</th>
                                                <th className="px-2 py-3 text-center text-zinc-600">1vX</th>
                                                <th className="px-2 py-3 text-center text-zinc-600">3k/4k/5k</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* TEAM 1 */}
                                            <tr className="bg-green-500/5">
                                                <td colSpan={15} className="px-4 py-1 text-[8px] font-black text-green-500/50 uppercase tracking-widest border-b border-green-500/10">Team 1</td>
                                            </tr>
                                            {team1.map((p: any, i: number) => (
                                                <tr key={i} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${p.isUser ? 'bg-cyan-500/5 shadow-[inset_4px_0_0_#06b6d4]' : ''}`}>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <img src={p.avatar} className="w-8 h-8 rounded border border-white/10" alt="" />
                                                            <div className="flex flex-col">
                                                                <span className={`text-xs font-bold ${p.isUser ? 'text-cyan-400' : 'text-white'}`}>{p.nickname}</span>
                                                                <span className="text-[8px] text-zinc-500 uppercase">{p.rank}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-3 text-center text-xs font-bold text-white">{p.kills}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.deaths}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-500">{p.assists}</td>
                                                    <td className={`px-2 py-3 text-center text-xs font-bold ${p.diff > 0 ? 'text-green-500' : p.diff < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                                                        {p.diff > 0 ? `+${p.diff}` : p.diff}
                                                    </td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-300 font-mono">{p.kd.toFixed(2)}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-300 font-mono">{p.adr.toFixed(1)}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.hs}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.kast}</td>
                                                    <td className="px-4 py-3 text-center bg-white/5">
                                                        <span className={`px-2 py-1 rounded text-xs font-black ${p.rating >= 1.2 ? 'bg-green-500 text-black' :
                                                            p.rating >= 1.0 ? 'bg-lime-500 text-black' :
                                                                p.rating >= 0.8 ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
                                                            }`}>
                                                            {p.rating.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.ef}</td>
                                                    <td className={`px-2 py-3 text-center text-xs ${p.fkd > 0 ? 'text-green-500' : p.fkd < 0 ? 'text-red-500' : 'text-zinc-600'}`}>{p.fkd}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.trades}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.onevx}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.multikills}</td>
                                                </tr>
                                            ))}
                                            {/* TEAM 2 */}
                                            <tr className="bg-red-500/5 mt-4">
                                                <td colSpan={15} className="px-4 py-1 text-[8px] font-black text-red-500/50 uppercase tracking-widest border-b border-red-500/10">Team 2</td>
                                            </tr>
                                            {team2.map((p: any, i: number) => (
                                                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <img src={p.avatar} className="w-8 h-8 rounded border border-white/10" alt="" />
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-white">{p.nickname}</span>
                                                                <span className="text-[8px] text-zinc-500 uppercase">{p.rank}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-3 text-center text-xs font-bold text-white">{p.kills}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.deaths}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-500">{p.assists}</td>
                                                    <td className={`px-2 py-3 text-center text-xs font-bold ${p.diff > 0 ? 'text-green-500' : p.diff < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                                                        {p.diff > 0 ? `+${p.diff}` : p.diff}
                                                    </td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-300 font-mono">{p.kd.toFixed(2)}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-300 font-mono">{p.adr.toFixed(1)}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.hs}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.kast}</td>
                                                    <td className="px-4 py-3 text-center bg-white/5">
                                                        <span className={`px-2 py-1 rounded text-xs font-black ${p.rating >= 1.2 ? 'bg-green-500 text-black' :
                                                            p.rating >= 1.0 ? 'bg-lime-500 text-black' :
                                                                p.rating >= 0.8 ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
                                                            }`}>
                                                            {p.rating.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.ef}</td>
                                                    <td className={`px-2 py-3 text-center text-xs ${p.fkd > 0 ? 'text-green-500' : p.fkd < 0 ? 'text-red-500' : 'text-zinc-600'}`}>{p.fkd}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.trades}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.onevx}</td>
                                                    <td className="px-2 py-3 text-center text-xs text-zinc-400">{p.multikills}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : activeTab === 'ROUNDS' ? (
                                <div className="space-y-6">
                                    {match.source === 'Steam' && (
                                        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-cyan-500 rounded-lg">
                                                    <BarChart2 className="text-black" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black uppercase tracking-tight">Detailed Round Analysis</h3>
                                                    <p className="text-xs text-zinc-500">Steam matches require external tools for round-by-round ADR and utility breakdown.</p>
                                                </div>
                                            </div>
                                            <a
                                                href={`https://csstats.gg/match/${match.externalId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-6 py-2.5 bg-white text-black font-black uppercase text-[10px] rounded-lg hover:bg-zinc-200 transition-all shadow-lg"
                                            >
                                                View on CSStats.gg
                                            </a>
                                        </div>
                                    )}

                                    <div className="bg-[#11161d] border border-white/5 rounded-2xl p-8">
                                        <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <Trophy size={14} className="text-yellow-500" />
                                            Histórico de Rodadas
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from({ length: 24 }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-10 h-12 rounded-lg flex flex-col items-center justify-center border font-black text-xs ${i < 13 ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
                                                        }`}
                                                >
                                                    <span className="text-[8px] opacity-20 mb-1">{i + 1}</span>
                                                    {i < 13 ? 'W' : 'L'}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-[#11161d] border border-white/5 rounded-xl p-6">
                                        <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Target size={14} className="text-cyan-500" />
                                            Utility Effectiveness
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                                <span className="text-zinc-500 text-xs font-bold">Utility Damage</span>
                                                <span className="text-white text-lg font-black">240</span>
                                            </div>
                                            <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                                <span className="text-zinc-500 text-xs font-bold">Enemies Flashed</span>
                                                <span className="text-white text-lg font-black">12</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-[#11161d] border border-white/5 rounded-xl p-6">
                                        <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <TrendingUp size={14} className="text-green-500" />
                                            Impact Metrics
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                                <span className="text-zinc-500 text-xs font-bold">Entry Success</span>
                                                <span className="text-white text-lg font-black">65%</span>
                                            </div>
                                            <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                                <span className="text-zinc-500 text-xs font-bold">Trade Kills</span>
                                                <span className="text-white text-lg font-black">4</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-[#11161d] border border-white/5 rounded-xl p-6">
                                        <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Trophy size={14} className="text-yellow-500" />
                                            Multi-Kills
                                        </h3>
                                        <div className="flex gap-4 justify-around mt-4">
                                            <div className="flex flex-col items-center">
                                                <div className="text-2xl font-black text-white">{match.metadata?.tripleKills || '0'}</div>
                                                <span className="text-[10px] text-zinc-500 font-bold uppercase">3k</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <div className="text-2xl font-black text-white">{match.metadata?.quadroKills || '0'}</div>
                                                <span className="text-[10px] text-zinc-500 font-bold uppercase">4k</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <div className="text-2xl font-black text-cyan-400">{match.metadata?.pentaKills || '0'}</div>
                                                <span className="text-[10px] text-cyan-500/50 font-bold uppercase">5k</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between mt-8 border-t border-white/5 pt-6">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 text-zinc-600">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-[10px] uppercase font-bold tracking-widest">Entry Kill</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-600">
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        <span className="text-[10px] uppercase font-bold tracking-widest">Entry Death</span>
                                    </div>
                                </div>

                                {match.url && (
                                    <a
                                        href={match.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase text-[10px] rounded flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        {match.source === 'Steam' ? <Download size={14} /> : <ExternalLink size={14} />}
                                        {match.source === 'Steam' ? 'Download Demo' : 'Match Room'}
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
