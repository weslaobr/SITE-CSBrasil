"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Target, TrendingUp, Calendar, ExternalLink, Download, BarChart2, BarChart3, Zap, Shield, Sword, Activity, ChevronDown, ChevronUp } from 'lucide-react';

import axios from 'axios';

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
    fkd: number;
    fkd_deaths: number;
    trades: number;
    onevx: number;
    onevx_attempts: number;
    multikills: string;
    // Utility stats
    util_damage: number;
    flash_assists: number;
    util_thrown: number;
    blind_time: number;
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
    matchId?: string | null;
    isOpen: boolean;
    onClose: () => void;
}

const MatchReportModal: React.FC<MatchReportModalProps> = ({ match: initialMatch, matchId, isOpen, onClose }) => {
    const [mainTab, setMainTab] = useState('seu-jogo');
    const [subTab, setSubTab] = useState('geral');
    const [internalMatch, setInternalMatch] = useState<Match | null>(null);
    const [loading, setLoading] = useState(false);

    const match = initialMatch || internalMatch;

    React.useEffect(() => {
        if (isOpen && matchId && !initialMatch) {
            fetchMatchData();
        }
    }, [isOpen, matchId, initialMatch]);

    const fetchMatchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/match/${matchId}`);
            const data = res.data;
            
            // Map API data to Match interface
            const fetchedMatch: Match = {
                id: data.match_id || matchId!,
                source: data.data_source || 'Leetify',
                gameMode: data.game_mode || 'Competitive',
                mapName: data.map_name || 'de_mirage',
                kills: data.stats?.find((p: any) => p.is_user)?.total_kills || 0,
                deaths: data.stats?.find((p: any) => p.is_user)?.total_deaths || 0,
                assists: data.stats?.find((p: any) => p.is_user)?.total_assists || 0,
                matchDate: data.match_date || new Date().toISOString(),
                result: data.result || (data.team_2_score > data.team_3_score ? 'Win' : 'Loss'), // Simplified
                score: `${data.team_2_score || 0}-${data.team_3_score || 0}`,
                url: data.demo_url,
                externalId: data.match_id,
                metadata: data, // Store the full data in metadata for normalization
                adr: data.stats?.find((p: any) => p.is_user)?.adr,
                hsPercentage: data.stats?.find((p: any) => p.is_user)?.accuracy_head * 100
            };
            setInternalMatch(fetchedMatch);
        } catch (error) {
            console.error("Error fetching match in modal:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!match) {
        if (loading) {
            return (
                <AnimatePresence>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative bg-[#0b0e13] border border-white/10 rounded-[40px] p-20 flex flex-col items-center gap-8 shadow-2xl"
                        >
                            <div className="relative w-20 h-20">
                                <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
                                <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-2">Analisando Partida</h3>
                                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Cruzando dados do Leetify...</p>
                            </div>
                        </motion.div>
                    </div>
                </AnimatePresence>
            );
        }
        return null;
    }

    // Since we returned earlier if match is null, TS now knows match is non-null here
    const currentMatch = match;

    // Helper to normalize any player object to our standard PlayerStats
    const normalizePlayerData = (p: any, isUser: boolean = false): PlayerStats => {
        const kills = p.kills !== undefined ? p.kills : parseInt(p.player_stats?.Kills || p.Kills || '0');
        const deaths = p.deaths !== undefined ? p.deaths : parseInt(p.player_stats?.Deaths || p.Deaths || '0');
        const assists = p.assists !== undefined ? p.assists : parseInt(p.player_stats?.Assists || p.Assists || '0');
        const adr = p.adr !== undefined ? p.adr : parseFloat(p.player_stats?.ADR || p.ADR || '0');
        const hs = p.hs !== undefined ? p.hs : 
                   (p.hs_percent !== undefined ? `${p.hs_percent}%` : 
                   (p.player_stats?.["Headshots %"] ? `${p.player_stats["Headshots %"]}%` : '0%'));
        
        const isWinResult = currentMatch.result === 'Win' || currentMatch.result === 'Victory';
        
        // Smart mocks for missing detailed data (GC/Steam)
        const fallbackFk = Math.max(0, Math.floor(kills / 6) + (Math.random() > 0.7 ? 1 : 0));
        const fallbackFd = Math.max(0, Math.floor(deaths / 8) + (Math.random() > 0.8 ? 1 : 0));
        const fallbackTrades = Math.floor(kills / 4);
        const fallbackClutches = kills > 20 ? Math.floor(Math.random() * 2) : 0;
        const fallbackKast = isWinResult ? 75 + Math.floor(Math.random() * 15) : 60 + Math.floor(Math.random() * 20);

        return {
            nickname: p.name || p.nickname || (isUser ? "[Sua Conta]" : "Jogador"),
            avatar: p.avatar || (isUser ? "https://avatars.steamstatic.com/2cf8997181cfcbceeacd49034d12aaf4c378d15e.jpg" : `https://i.pravatar.cc/150?u=${p.player_id || p.name || Math.random()}`),
            rank: p.rank || "Competitive",
            kills,
            deaths,
            assists,
            diff: kills - deaths,
            kd: Number((kills / (deaths || 1)).toFixed(2)),
            adr: adr || (isUser ? (currentMatch.adr || 70) : 70 + Math.floor(Math.random() * 20)),
            hs,
            kast: p.kast || `${fallbackKast}%`,
            rating: p.rating || p.leetify_rating || (p.player_stats?.["K/D Ratio"] ? parseFloat(p.player_stats["K/D Ratio"]) : 1.0),
            fkd: p.fk_count || p.fkd || fallbackFk,
            fkd_deaths: p.fd_count || p.fk_deaths || fallbackFd,
            trades: p.trade_count || p.trades || fallbackTrades,
            onevx: p.clutch_count || p.onevx || fallbackClutches,
            onevx_attempts: p.onevx_attempts || (fallbackClutches > 0 ? fallbackClutches + 1 : 0),
            multikills: p.multikills || (p.tripleKills !== undefined ? `${p.tripleKills}/${p.quadroKills}/${p.pentaKills}` : "0/0/0"),
            util_damage: p.util_damage || p.utility_damage || 0,
            flash_assists: p.flash_assists || p.flashbang_assists || 0,
            util_thrown: p.util_thrown || (p.he_thrown || 0) + (p.flash_thrown || 0) + (p.smokes_thrown || 0) + (p.molotovs_thrown || 0),
            blind_time: p.blind_time || p.flash_blind_time || 0,
            isUser: isUser || p.nickname === currentMatch.metadata?.playerNickname
        };
    };

    const getScoreboardData = (): { team1: PlayerStats[]; team2: PlayerStats[] } => {
        const meta = currentMatch.metadata || {};

        // 1. Faceit fullStats
        if (meta.fullStats?.rounds?.[0]?.teams) {
            const teams = meta.fullStats.rounds[0].teams;
            return {
                team1: (teams[0].players || []).map((p: any) => normalizePlayerData(p, p.nickname === currentMatch.metadata?.playerNickname)),
                team2: (teams[1].players || []).map((p: any) => normalizePlayerData(p, p.nickname === currentMatch.metadata?.playerNickname))
            };
        }

        // 2. Metadata players (Leetify/Steam)
        if (meta.players && Array.isArray(meta.players)) {
            return {
                team1: meta.players.slice(0, 5).map((p: any) => normalizePlayerData(p)),
                team2: meta.players.slice(5, 10).map((p: any) => normalizePlayerData(p))
            };
        }

        // 3. Fallback (Mock)
        return {
            team1: [
                normalizePlayerData({ nickname: "[Sua Conta]", kills: currentMatch.kills, deaths: currentMatch.deaths, assists: currentMatch.assists, adr: currentMatch.adr }, true),
                normalizePlayerData({ nickname: "Aliado 1" }),
                normalizePlayerData({ nickname: "Aliado 2" }),
                normalizePlayerData({ nickname: "Aliado 3" }),
                normalizePlayerData({ nickname: "Aliado 4" }),
            ],
            team2: [
                normalizePlayerData({ nickname: "Inimigo 1" }),
                normalizePlayerData({ nickname: "Inimigo 2" }),
                normalizePlayerData({ nickname: "Inimigo 3" }),
                normalizePlayerData({ nickname: "Inimigo 4" }),
                normalizePlayerData({ nickname: "Inimigo 5" }),
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

    const isPremier = currentMatch.source?.toLowerCase().includes('premier') || 
                      currentMatch.gameMode?.toLowerCase().includes('premier') ||
                      currentMatch.metadata?.data_source?.toLowerCase().includes('premier') ||
                      currentMatch.metadata?.source?.toLowerCase().includes('premier');

    const displayMode = isPremier ? 'Premier' : 
                        currentMatch.gameMode?.toLowerCase().includes('matchmaking') ? 'Competitive' : 
                        currentMatch.gameMode || 'Competitive';

    const { team1, team2 } = getScoreboardData();

    const isWin = currentMatch.result === 'Win' || currentMatch.result === 'Victory';

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
                        className="relative w-full max-w-6xl max-h-[90vh] bg-[#0b0e13] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Cinematic Header (Leetify Style) */}
                        <div className="relative h-48 shrink-0 overflow-hidden">
                            {/* Map Background with Dark Overlay */}
                            <img 
                                src={getMapImage(currentMatch.mapName)} 
                                className="absolute inset-0 w-full h-full object-cover scale-110 blur-[2px] opacity-40"
                                alt="" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-[#0b0e13]" />
                            
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 z-20 w-10 h-10 rounded-xl bg-black/40 hover:bg-black/60 flex items-center justify-center transition-all border border-white/10"
                            >
                                <X size={20} className="text-white/70" />
                            </button>

                            {/* Banner Content */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                                <div className="flex items-center gap-12">
                                    {/* Map info left */}
                                    <div className="hidden md:flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                                            <img src={getMapImage(currentMatch.mapName)} className="w-4 h-4 rounded-sm" alt="" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white">{currentMatch.mapName?.replace('de_', '')}</span>
                                        </div>
                                        <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{displayMode}</div>
                                    </div>

                                    {/* Main Result */}
                                    <div className="flex items-center gap-8">
                                        <div className="text-center">
                                            <h1 className={`text-6xl font-black italic uppercase tracking-tighter ${isWin ? 'text-white' : 'text-white/90'}`}>
                                                {isWin ? 'Victory' : 'Defeat'}
                                            </h1>
                                            <div className="flex items-center justify-center gap-4 mt-2">
                                                <span className={`text-4xl font-black italic ${isWin ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {currentMatch.score.split('-')[0]}
                                                </span>
                                                <span className="text-2xl font-black text-zinc-700 italic">:</span>
                                                <span className={`text-4xl font-black italic ${!isWin ? 'text-red-500' : 'text-emerald-500'}`}>
                                                    {currentMatch.score.split('-')[1]}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Date info right */}
                                    <div className="hidden md:flex flex-col items-start gap-1">
                                        <div className="text-[10px] font-black text-white/60 tracking-widest uppercase">
                                            {new Date(currentMatch.matchDate).toLocaleDateString('pt-BR')}
                                        </div>
                                        <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                                            {currentMatch.source} Match &nbsp;·&nbsp; MR12
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Primary Navigation (Leetify Tabs) */}
                            <div className="absolute bottom-0 left-0 right-0 flex justify-center px-8 border-b border-white/5">
                                <div className="flex gap-8">
                                    {[
                                        { id: 'seu-jogo', label: 'Your Match' },
                                        { id: 'visao-geral', label: 'Overview' },
                                        { id: 'detalhes', label: 'Match Details' },
                                        { id: 'duelos', label: 'Duelos' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setMainTab(tab.id);
                                                if (tab.id !== 'detalhes') setSubTab('geral');
                                            }}
                                            className="relative py-4 px-2 group"
                                        >
                                            <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
                                                mainTab === tab.id ? 'text-emerald-500' : 'text-zinc-500 group-hover:text-white'
                                            }`}>
                                                {tab.label}
                                            </span>
                                            {mainTab === tab.id && (
                                                <motion.div 
                                                    layoutId="activeTab"
                                                    className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sub-navigation for Details (Leetify Style) */}
                        {mainTab === 'detalhes' && (
                            <div className="bg-black/20 border-b border-white/5 px-8 pt-4 overflow-x-auto no-scrollbar">
                                <div className="flex gap-6 pb-4">
                                    {[
                                        { id: 'geral', label: 'General' },
                                        { id: 'timeline', label: 'Timeline' },
                                        { id: 'mira', label: 'Aim' },
                                        { id: 'utilitarios', label: 'Utility' },
                                        { id: 'atividade', label: 'Activity' },
                                        { id: 'trocas', label: 'Trades' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setSubTab(tab.id)}
                                            className={`text-[10px] font-black uppercase tracking-widest px-1 transition-colors whitespace-nowrap ${
                                                subTab === tab.id ? 'text-rose-500' : 'text-zinc-600 hover:text-white'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Body Area */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar text-white">
                            {mainTab === 'seu-jogo' ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* Left Column: Identity & Highlights */}
                                        <div className="lg:col-span-6 space-y-6">
                                            {/* Identity Card */}
                                            <div className="relative group overflow-hidden bg-gradient-to-br from-zinc-900 to-[#0b0e13] border border-white/5 rounded-[32px] p-8 shadow-2xl">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32" />
                                                
                                                <div className="flex items-center gap-6 mb-8 relative z-10">
                                                    <div className="relative">
                                                        <div className="w-24 h-24 rounded-[32px] overflow-hidden border-2 border-emerald-500/20 p-1 bg-zinc-800">
                                                            <img 
                                                                src={normalizePlayerData(currentMatch.metadata?.players?.[0] || {}, true).avatar} 
                                                                className="w-full h-full object-cover rounded-[28px]" 
                                                                alt="" 
                                                            />
                                                        </div>
                                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-zinc-900 border border-white/10 rounded-lg flex items-center justify-center shadow-xl">
                                                            <Trophy size={14} className="text-emerald-500" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-widest rounded-md border border-rose-500/10">Match Identity</span>
                                                            <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[8px] font-black uppercase tracking-widest rounded-md">Your Top 5 Stats</span>
                                                        </div>
                                                        <h2 className="text-4xl font-black italic uppercase tracking-tighter italic">The Aimer</h2>
                                                    </div>
                                                </div>

                                                {/* Top 5 Stats Highlight */}
                                                <div className="space-y-4 relative z-10">
                                                    {[
                                                        { label: 'Time to Damage', value: '500ms', color: 'bg-rose-500', tag: 'AIM', badge: 'MATCH BEST' },
                                                        { label: 'Spray Accuracy', value: '46%', color: 'bg-rose-500', tag: 'AIM' },
                                                        { label: 'Accuracy (Enemy Spotted)', value: '38%', color: 'bg-rose-500', tag: 'AIM', badge: 'TEAM BEST' },
                                                        { label: 'Teammates Flashed per Flash', value: '0.00', color: 'bg-cyan-500', tag: 'UTILITY', badge: 'MATCH BEST' },
                                                        { label: 'Leetify Rating (CT Side)', value: '+2.75', color: 'bg-emerald-500', tag: 'IMPACT' }
                                                    ].map((stat, i) => (
                                                        <div key={i} className="flex items-center gap-4 group/stat">
                                                            <span className="text-zinc-600 font-black italic text-xs w-4">#{i+1}</span>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-end mb-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black uppercase tracking-wider text-white/80">{stat.label}</span>
                                                                        {stat.badge && <span className="text-[7px] font-black bg-amber-500 text-black px-1.5 py-0.5 rounded-sm">{stat.badge}</span>}
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-rose-500/60">{stat.tag}</span>
                                                                </div>
                                                                <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
                                                                    <div className={`absolute inset-y-0 left-0 ${stat.color} opacity-80`} style={{ width: Math.random() * 40 + 30 + '%' }} />
                                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-black italic pr-1">{stat.value}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Comparison */}
                                        <div className="lg:col-span-6">
                                            <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-6 space-y-6">
                                                <div className="flex items-center justify-between px-2">
                                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">This Match</h3>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-700">Last 30 Matches</span>
                                                </div>

                                                <div className="space-y-1">
                                                    {[
                                                        { label: 'Leetify Rating', value: '-0.52', avg: '+1.03', trend: 'down' },
                                                        { label: 'Aim Rating', value: '67', avg: '68', trend: 'down' },
                                                        { label: 'Utility Rating', value: '19', avg: '67', trend: 'down' },
                                                        { label: 'Trade Kill Opportunities', value: '4', avg: '5.93', trend: 'down' },
                                                        { label: 'Kills', value: '9', avg: '16.4', trend: 'down' },
                                                        { label: 'ADR', value: '55', avg: '91', trend: 'down' },
                                                        { label: 'Opening Duel Attempts', value: '6%', avg: '21%', trend: 'down' },
                                                        { label: 'Clutch Kills', value: '1', avg: '1.81', trend: 'down' }
                                                    ].map((stat, i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.02] transition-colors group">
                                                            <span className="text-[11px] font-black text-white/70 tracking-wide uppercase">{stat.label}</span>
                                                            <div className="flex items-center gap-8">
                                                                <span className={`text-[11px] font-black italic ${parseFloat(stat.value) > 0 ? 'text-emerald-500' : 'text-zinc-300'}`}>{stat.value}</span>
                                                                <div className="flex items-center gap-3 w-16 justify-end">
                                                                    <span className="text-[10px] font-bold text-zinc-600 italic bg-white/5 px-1.5 py-0.5 rounded-md">{stat.avg}</span>
                                                                    {stat.trend === 'up' ? (
                                                                        <ChevronUp size={12} className="text-emerald-500" />
                                                                    ) : (
                                                                        <ChevronDown size={12} className="text-rose-500" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : mainTab === 'visao-geral' ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Detailed Ratings Row */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {[
                                            { label: 'Mira', value: currentMatch.metadata?.leetify_ratings?.aim || 75 + Math.floor(Math.random() * 10), icon: <Target className="text-red-500" /> },
                                            { label: 'Utilitários', value: currentMatch.metadata?.leetify_ratings?.utility || 60 + Math.floor(Math.random() * 15), icon: <Zap className="text-cyan-500" /> },
                                            { label: 'Posicionam.', value: currentMatch.metadata?.leetify_ratings?.positioning || 70 + Math.floor(Math.random() * 20), icon: <Shield className="text-emerald-500" /> },
                                            { label: 'Clutch', value: currentMatch.metadata?.leetify_ratings?.clutching || 50 + Math.floor(Math.random() * 25), icon: <Trophy className="text-amber-500" /> },
                                            { label: 'Abertura', value: currentMatch.metadata?.leetify_ratings?.opening || 40 + Math.floor(Math.random() * 40), icon: <Sword className="text-purple-500" /> },
                                        ].map((stat, i) => (
                                            <div key={i} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2">
                                                <div className="p-2 bg-white/5 rounded-lg mb-1">{stat.icon}</div>
                                                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider text-center">{stat.label}</span>
                                                <div className="text-xl font-black italic text-white">{stat.value}</div>
                                                <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${stat.value}%` }}
                                                        className={`h-full ${stat.value > 80 ? 'bg-purple-500' : stat.value > 60 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                                    />
                                                </div>
                                                {!currentMatch.metadata?.leetify_ratings && <span className="text-[6px] text-zinc-700 font-bold uppercase tracking-widest mt-0.5">ESTIMADO</span>}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Full Scoreboard */}
                                    {[team1, team2].map((team, tIdx) => (
                                        <div key={tIdx} className="space-y-4">
                                            <div className="flex items-center gap-3 px-2">
                                                <div className={`w-2 h-6 rounded-full ${tIdx === 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                <h3 className={`text-xl font-black italic uppercase tracking-tighter ${tIdx === 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {tIdx === 0 ? 'Aliados' : 'Inimigos'}
                                                </h3>
                                            </div>
                                            <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-white/5 text-[9px] text-zinc-600 font-black uppercase tracking-widest bg-white/[0.01]">
                                                            <th className="pl-6 py-4">Jogador</th>
                                                            <th className="py-4 text-center">K / D / A</th>
                                                            <th className="py-4 text-center">ADR</th>
                                                            <th className="py-4 text-center">HS%</th>
                                                            <th className="py-4 text-center">Impacto</th>
                                                            <th className="pr-6 py-4 text-right">Rating</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {team.map((p: PlayerStats, i: number) => (
                                                            <tr key={i} className={`group hover:bg-white/[0.03] transition-colors ${p.isUser ? 'bg-white/5' : ''}`}>
                                                                <td className="pl-6 py-4 flex items-center gap-3">
                                                                    <img src={p.avatar} className="w-8 h-8 rounded-xl border border-white/10" alt="" />
                                                                    <span className={`font-black italic uppercase text-sm ${p.isUser ? 'text-emerald-400' : 'text-zinc-200'}`}>{p.nickname}</span>
                                                                </td>
                                                                <td className="py-4 text-center">
                                                                    <span className="text-white font-bold">{p.kills}</span>
                                                                    <span className="text-zinc-700 mx-1">/</span>
                                                                    <span className="text-zinc-400">{p.deaths}</span>
                                                                </td>
                                                                <td className="py-4 text-center font-black italic text-white">{p.adr.toFixed(0)}</td>
                                                                <td className="py-4 text-center font-bold text-zinc-500 text-xs">{p.hs}</td>
                                                                <td className="py-4 text-center font-bold text-zinc-400">{(p.rating * 0.9 + Math.random() * 0.2).toFixed(2)}</td>
                                                                <td className="pr-6 py-4 text-right">
                                                                    <span className={`px-3 py-1.5 rounded-xl font-black italic text-xs border ${
                                                                        p.rating >= 1 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                                    }`}>
                                                                        {p.rating.toFixed(2)}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : mainTab === 'detalhes' ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {subTab === 'geral' ? (
                                        <div className="space-y-6">
                                            {[team1, team2].map((team, tIdx) => (
                                                <div key={tIdx} className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="border-b border-white/5 text-[9px] text-zinc-600 font-black uppercase tracking-widest bg-white/[0.01]">
                                                                <th className="pl-6 py-4">Jogador</th>
                                                                <th className="py-4 text-center">K/D/A</th>
                                                                <th className="py-4 text-center">2K</th>
                                                                <th className="py-4 text-center">3K</th>
                                                                <th className="py-4 text-center">4K</th>
                                                                <th className="py-4 text-center">5K</th>
                                                                <th className="pr-6 py-4 text-right">HLTV</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {team.map((p: PlayerStats, i: number) => (
                                                                <tr key={i} className="hover:bg-white/[0.03]">
                                                                    <td className="pl-6 py-4 font-black italic uppercase text-xs text-zinc-400">{p.nickname}</td>
                                                                    <td className="py-4 text-center text-xs font-bold text-white">{p.kills}/{p.assists}/{p.deaths}</td>
                                                                    {p.multikills.split('/').map((val, idx) => (
                                                                        <td key={idx} className={`py-4 text-center text-[10px] font-black ${parseInt(val) > 0 ? 'text-white' : 'text-zinc-800'}`}>{val}</td>
                                                                    ))}
                                                                    <td className="pr-6 py-4 text-right text-xs font-black text-rose-500">{p.rating.toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ))}
                                        </div>
                                    ) : subTab === 'utilitarios' ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-6 mb-8">
                                                {[team1, team2].map((team, tIdx) => (
                                                    <div key={tIdx} className="bg-zinc-900 border border-white/5 rounded-[32px] p-6">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                                                            <Zap size={14} className={tIdx === 0 ? 'text-emerald-500' : 'text-rose-500'} />
                                                            {tIdx === 0 ? 'Flash / Smoke / HE / Molotov' : 'Usage Comparison'}
                                                        </h4>
                                                        <div className="h-40 flex items-end justify-around gap-2 px-2">
                                                            {team.map((p, pIdx) => (
                                                                <div key={pIdx} className="flex flex-col items-center gap-2 flex-1 group">
                                                                    <div className="w-full relative flex flex-col-reverse justify-end gap-0.5">
                                                                        <div className="bg-emerald-500/80 rounded-sm" style={{ height: Math.random() * 40 + 'px' }} />
                                                                        <div className="bg-sky-500/80 rounded-sm" style={{ height: Math.random() * 40 + 'px' }} />
                                                                        <div className="bg-orange-500/80 rounded-sm" style={{ height: Math.random() * 40 + 'px' }} />
                                                                        <div className="bg-red-500/80 rounded-sm" style={{ height: Math.random() * 40 + 'px' }} />
                                                                    </div>
                                                                    <img src={p.avatar} className="w-4 h-4 rounded-full border border-white/20" alt="" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-white/5 text-[9px] text-zinc-600 font-black uppercase tracking-widest bg-white/[0.01]">
                                                            <th className="pl-6 py-4">Jogador</th>
                                                            <th className="py-4 text-center">Flashes</th>
                                                            <th className="py-4 text-center">Enemies Blinded</th>
                                                            <th className="py-4 text-center">Avg Blind Time</th>
                                                            <th className="py-4 text-center">Util Damage</th>
                                                            <th className="pr-6 py-4 text-right">Utility Rating</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {[...team1, ...team2].map((p: PlayerStats, i: number) => (
                                                            <tr key={i} className="hover:bg-white/[0.03]">
                                                                <td className="pl-6 py-4 text-xs font-black italic uppercase text-zinc-400">{p.nickname}</td>
                                                                <td className="py-4 text-center text-xs text-white">{p.util_thrown}</td>
                                                                <td className="py-4 text-center text-xs text-zinc-300">{p.flash_assists}</td>
                                                                <td className="py-4 text-center text-xs text-emerald-500">{p.blind_time.toFixed(1)}s</td>
                                                                <td className="py-4 text-center text-xs text-rose-500">{p.util_damage.toFixed(0)}</td>
                                                                <td className="pr-6 py-4 text-right">
                                                                    <span className="text-[10px] font-black bg-white/5 px-2 py-1 rounded">{(Math.random() * 80).toFixed(0)}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 bg-zinc-950/50 rounded-[32px] border border-white/5 border-dashed">
                                            <Activity size={48} className="text-zinc-800 mb-4 animate-pulse" />
                                            <p className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[10px]">Visualização em Desenvolvimento</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden">
                                        {[team1, team2].map((team, tIdx) => (
                                            <div key={tIdx} className={tIdx === 1 ? 'mt-8 border-t border-white/5' : ''}>
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-white/5 text-[9px] text-zinc-600 font-black uppercase tracking-widest bg-white/[0.01]">
                                                            <th className="pl-6 py-4">Jogador</th>
                                                            <th className="py-4 text-center">Opening Kills</th>
                                                            <th className="py-4 text-center">Opening Deaths</th>
                                                            <th className="py-4 text-center">Trade Kills</th>
                                                            <th className="py-4 text-center">Clutches</th>
                                                            <th className="pr-6 py-4 text-right">Impact</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {team.map((p: PlayerStats, i: number) => (
                                                            <tr key={i} className="hover:bg-white/[0.03]">
                                                                <td className="pl-6 py-4 text-xs font-black italic uppercase text-emerald-500">{p.nickname}</td>
                                                                <td className="py-4 text-center text-white font-bold">{p.fkd}</td>
                                                                <td className="py-4 text-center text-rose-500 font-bold">{p.fkd_deaths}</td>
                                                                <td className="py-4 text-center text-sky-400 font-bold">{p.trades}</td>
                                                                <td className="py-4 text-center text-amber-500 font-bold">{p.onevx}</td>
                                                                <td className="pr-6 py-4 text-right font-black italic text-zinc-500">{p.rating.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
               {/* Unified Footer */}
                            <div className="flex items-center justify-between mt-12 pt-8 border-t border-white/5 bg-black/20 p-6 -mx-8 -mb-8">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                        <Calendar size={12} className="text-emerald-500" />
                                        <span>Data: {new Date(match.matchDate).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                                        <Shield size={12} />
                                        <span>ID: {currentMatch.externalId || 'Local'}</span>
                                    </div>
                                </div>

                                {currentMatch.url && (
                                    <a
                                        href={currentMatch.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                    >
                                        <Download size={14} />
                                        Baixar Demo
                            </a>
                        )}
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);
};

export default MatchReportModal;
