"use client";
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Swords, 
    Calendar, 
    Map as MapIcon, 
    Target, 
    Trophy, 
    Info, 
    ChevronDown, 
    ChevronUp,
    Filter, 
    ExternalLink, 
    Search, 
    RefreshCw, 
    ChevronRight,
    Copy,
    Lock,
    Users,
    Activity,
    Zap,
    TrendingUp,
    Check
} from 'lucide-react';
import MatchReportModal from './match-report-modal';

interface Match {
    id: string;
    externalId?: string;
    source: string;
    gameMode: string;
    mapName: string;
    kills: number;
    deaths: number;
    assists: number;
    mvps?: number;
    adr?: number;
    hsPercentage?: number;
    rank?: string;
    matchDate: string;
    duration?: string;
    result: string;
    score: string;
    url?: string;
    metadata?: any;
}

interface MatchesDashboardProps {
    matches: Match[];
    onUpdateFaceit: (nickname: string) => void;
    currentFaceit: string;
    currentUserSteamId?: string; // New prop for user identification
    onSync?: () => void;
    loading?: boolean;
    hasSteamCode?: boolean;
    syncError?: string | null;
}

const MatchesDashboard: React.FC<MatchesDashboardProps> = ({ 
    matches, 
    onUpdateFaceit, 
    currentFaceit, 
    currentUserSteamId,
    onSync, 
    loading, 
    hasSteamCode, 
    syncError 
}) => {
    const [faceitInput, setFaceitInput] = useState(currentFaceit || '');
    const [isEditing, setIsEditing] = useState(!currentFaceit);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Filters
    const [mapFilter, setMapFilter] = useState('all');
    const [modeFilter, setModeFilter] = useState('all');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filteredMatches = useMemo(() => {
        // 1. Initial Filtering
        const baseFiltered = matches.filter(m => {
            const mapName = m.mapName || '';
            const source = m.source || '';
            const gameMode = m.gameMode || '';
            const nameLower = mapName.toLowerCase();
            const searchLower = searchTerm.toLowerCase();

            const matchesSearch = searchTerm === '' || nameLower.includes(searchLower) || source.toLowerCase().includes(searchLower);
            const matchesMap = mapFilter === 'all' || nameLower.includes(mapFilter.toLowerCase());
            const matchesMode = modeFilter === 'all' ||
                source.toLowerCase() === modeFilter.toLowerCase() ||
                gameMode.toLowerCase().includes(modeFilter.toLowerCase());
                
            return matchesSearch && matchesMap && matchesMode;
        });

        // 2. Fuzzy Deduplication (Steam placeholders often overlap with Leetify/Faceit)
        const sorted = [...baseFiltered].sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());
        const uniqueMatches: Match[] = [];
        const processedCodes = new Set<string>();

        for (const match of sorted) {
            const matchTime = new Date(match.matchDate).getTime();
            const normalizedMap = match.mapName?.toLowerCase().replace('de_', '').trim();
            
            // Look for duplicates in matches already added
            const isDuplicate = uniqueMatches.some(m => {
                const diff = Math.abs(new Date(m.matchDate).getTime() - matchTime);
                const mNormalizedMap = m.mapName?.toLowerCase().replace('de_', '').trim();
                
                // If same map and within 15 minutes, it's the same match
                // We prefer Faceit/Leetify (which are processed first if they are same timestamp)
                return diff < 15 * 60 * 1000 && mNormalizedMap === normalizedMap;
            });

            if (!isDuplicate) {
                uniqueMatches.push(match);
            }
        }

        return uniqueMatches;
    }, [matches, mapFilter, modeFilter, searchTerm]);

    const handleViewMatch = (match: Match) => {
        setSelectedMatch(match);
        setIsModalOpen(true);
    };

    const stats = useMemo(() => {
        const total = filteredMatches.length;
        if (total === 0) return { wr: 0, kills: 0, adr: '0.0', kd: '0.00', hs: '0', rating: '0.00' };
        
        const wins = filteredMatches.filter(m => m.result === 'Win').length;
        const totalKills = filteredMatches.reduce((acc, m) => acc + (m.kills || 0), 0);
        const totalDeaths = filteredMatches.reduce((acc, m) => acc + (m.deaths || 0), 0);

        // Only average matches with real ADR data
        const adrMatches = filteredMatches.filter(m => m.adr != null && m.adr > 0);
        const totalAdr = adrMatches.reduce((acc, m) => acc + (m.adr ?? 0), 0);

        // Average HS% from matches that have it
        const hsMatches = filteredMatches.filter(m => m.hsPercentage != null && m.hsPercentage > 0);
        const totalHs = hsMatches.reduce((acc, m) => acc + (m.hsPercentage ?? 0), 0);

        // Average rating from metadata where leetify_rating exists
        const ratingMatches = filteredMatches.filter(m => m.metadata?.leetify_rating);
        const totalRating = ratingMatches.reduce((acc, m) => acc + (m.metadata.leetify_rating || 0), 0);

        return {
            wr: Math.round((wins / total) * 100),
            kills: totalKills,
            adr: adrMatches.length > 0 ? (totalAdr / adrMatches.length).toFixed(1) : '—',
            kd: (totalKills / (totalDeaths || 1)).toFixed(2),
            hs: hsMatches.length > 0 ? Math.round(totalHs / hsMatches.length).toString() : '—',
            rating: ratingMatches.length > 0 ? (totalRating / ratingMatches.length).toFixed(2) : '—'
        };
    }, [filteredMatches]);

    const getMapImage = (name: string) => {
        if (!name) return 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_mirage.png';

        const mapName = name.toLowerCase().replace('de_', '').trim();
        const cdnBase = 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images';
        
        // Map common aliases to official names
        const mapMapping: Record<string, string> = {
            'dust 2': 'de_dust2',
            'dust2': 'de_dust2',
            'dust ii': 'de_dust2',
            'mirage': 'de_mirage',
            'inferno': 'de_inferno',
            'nuke': 'de_nuke',
            'overpass': 'de_overpass',
            'vertigo': 'de_vertigo',
            'ancient': 'de_ancient',
            'anubis': 'de_anubis',
            'cache': 'de_cache',
            'train': 'de_train'
        };

        const officialName = mapMapping[mapName] || `de_${mapName}`;
        return `${cdnBase}/${officialName}.png`;
    };

    const getRankIcon = (rank: string, source?: string, gameMode?: string) => {
        const normMode = gameMode?.toLowerCase() || '';
        const normSource = source?.toLowerCase() || '';
        const isGC = normSource.includes('gamersclub') || 
                     normMode.includes('gamersclub') || 
                     normMode.includes('gamers_club') || 
                     normMode.includes('gamers-club') || 
                     normMode === 'gc';

        if (isGC || !rank || rank.toLowerCase() === 'unranked') return null;
        return "https://www.csstats.gg/images/ranks/12.png";
    };

    const formatTimeAgo = (date: string) => {
        const now = new Date();
        const past = new Date(date);
        const diffInMs = now.getTime() - past.getTime();
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Agora mesmo';
        if (diffInHours < 24) return `${diffInHours}h atrás`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return 'Ontem';
        return `${diffInDays} dias atrás`;
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto min-h-screen pb-24">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter flex items-center gap-4">
                        <Swords className="text-green-500 w-10 h-10 md:w-12 md:h-12" />
                        Minhas Partidas
                    </h1>
                    <p className="text-zinc-500 text-xs font-bold uppercase mt-2 tracking-[0.2em] px-1 flex items-center gap-2">
                        Histórico Competitivo <span className="w-1 h-1 rounded-full bg-zinc-800" /> {matches.length} Registradas
                    </p>
                </div>

                {/* Toolbar Unificada */}
                <div className="w-full md:w-auto flex flex-col md:flex-row items-stretch gap-0 bg-zinc-950/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
                    <div className="relative flex-grow flex items-center border-b md:border-b-0 md:border-r border-white/5">
                        <Search className="absolute left-5 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Filtrar por mapa ou fonte..."
                            className="bg-transparent py-4 pl-14 pr-5 focus:outline-none text-sm w-full md:w-64 placeholder:text-zinc-600 transition-all focus:bg-white/[0.02]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={onSync}
                        disabled={loading}
                        className="flex items-center justify-center gap-3 px-6 py-4 bg-white/[0.02] hover:bg-white/[0.05] transition-all disabled:opacity-50 group border-b md:border-b-0 md:border-r border-white/5"
                    >
                        <RefreshCw className={`w-4 h-4 text-green-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                            {loading ? 'Sincronizando' : 'Sincronizar'}
                        </span>
                    </button>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center justify-center gap-3 px-6 py-4 transition-all group ${isEditing ? 'bg-green-500 text-black' : 'bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white'}`}
                    >
                        <Users className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Contas</span>
                    </button>
                </div>
            </header>

            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-1 border border-white/10 bg-zinc-900/40 rounded-[2rem] backdrop-blur-xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20 shadow-inner">
                                    <Trophy className="text-green-500 w-7 h-7" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black italic uppercase tracking-tight">Vincular Plataformas</h4>
                                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Adicione seus perfis para carregar estatísticas avançadas.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <div className="relative flex-grow">
                                    <input
                                        type="text"
                                        placeholder="Seu Nickname no Faceit"
                                        className="bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-green-500/50 w-full md:w-72 font-bold transition-all"
                                        value={faceitInput}
                                        onChange={(e) => setFaceitInput(e.target.value)}
                                    />
                                    <ExternalLink size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-700" />
                                </div>
                                <button
                                    onClick={() => {
                                        onUpdateFaceit(faceitInput);
                                        setIsEditing(false);
                                    }}
                                    className="bg-white text-black font-black px-10 py-4 rounded-2xl text-[10px] uppercase hover:bg-zinc-200 transition-all active:scale-95 shadow-xl"
                                >
                                    SALVAR
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Summary Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Win Rate', value: `${stats.wr}%`, icon: <Trophy className="text-emerald-500" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Avg ADR', value: stats.adr, icon: <Zap className="text-green-500" />, color: 'text-green-500', bg: 'bg-green-500/10' },
                    { label: 'K/D Ratio', value: stats.kd, icon: <TrendingUp className="text-amber-500" />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'Total Kills', value: stats.kills, icon: <Target className="text-red-500" />, color: 'text-red-500', bg: 'bg-red-500/10' },
                    { label: 'Avg HS%', value: stats.hs !== '—' ? `${stats.hs}%` : '—', icon: <Activity className="text-rose-500" />, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                    { label: 'Avg Rating', value: stats.rating, icon: <Zap className="text-purple-500" />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-zinc-900/40 border border-white/5 p-6 rounded-[2rem] backdrop-blur-xl flex flex-col gap-2 group hover:border-white/10 transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{stat.label}</span>
                            <div className={`p-2 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                                {stat.icon}
                            </div>
                        </div>
                        <div className={`text-3xl font-black italic tracking-tighter ${stat.color}`}>
                            {stat.value}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 mr-2">
                    <Filter size={14} className="text-green-500/50" />
                    Filtros:
                </div>
                <div className="flex gap-1.5 bg-zinc-900/50 p-1 rounded-2xl border border-white/5">
                    {['all', 'Competitive', 'Premier', 'Faceit'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setModeFilter(mode)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-tight ${
                                modeFilter === mode 
                                ? 'bg-white text-black shadow-lg' 
                                : 'text-zinc-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {mode === 'all' ? 'Tudo' : mode}
                        </button>
                    ))}
                </div>
                
                <div className="h-6 w-px bg-white/5 mx-2" />

                <div className="flex flex-wrap gap-2">
                    {['all', 'mirage', 'inferno', 'ancient', 'nuke', 'dust', 'anubis', 'vertigo'].map(map => (
                        <button
                            key={map}
                            onClick={() => setMapFilter(map)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                mapFilter === map 
                                ? 'bg-green-500/10 text-green-500 border-green-500/30' 
                                : 'bg-transparent text-zinc-600 border-transparent hover:text-zinc-400'
                            }`}
                        >
                            {map === 'all' ? 'Todos os Mapas' : map}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <main className="bg-zinc-900/30 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-md">
                {loading && filteredMatches.length === 0 ? (
                    <div className="py-48 flex flex-col items-center justify-center text-center">
                        <div className="relative w-20 h-20 mb-10">
                            <div className="absolute inset-0 border-4 border-green-500/10 rounded-full" />
                            <div className="absolute inset-0 border-4 border-t-green-500 rounded-full animate-spin shadow-[0_0_15px_rgba(254,209,61,0.5)]" />
                            <Activity className="absolute inset-0 m-auto w-8 h-8 text-green-500/50" />
                        </div>
                        <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Buscando Partidas</h3>
                        <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest animate-pulse">Aguarde enquanto sincronizamos com a Valve e Faceit...</p>
                    </div>
                ) : filteredMatches.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] border-b border-white/10 bg-white/[0.02]">
                                    <th className="px-8 py-5">Map</th>
                                    <th className="px-4 py-5 text-center">Score</th>
                                    <th className="px-4 py-5 text-center">Rank</th>
                                    <th className="px-4 py-5 text-center">Type</th>
                                    <th className="px-1 py-5 text-center">Code</th>
                                    <th className="px-2 py-5 text-center">K</th>
                                    <th className="px-2 py-5 text-center">D</th>
                                    <th className="px-2 py-5 text-center">A</th>
                                    <th className="px-4 py-5 text-center">ADR</th>
                                    <th className="px-4 py-5 text-center">HS%</th>
                                    <th className="px-4 py-5 text-center">Rating</th>
                                    <th className="px-8 py-5 text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="">
                                {filteredMatches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((match, i) => {
                                    const isWin = match.result === 'Win';
                                    const isLoss = match.result === 'Loss';
                                    const isDraw = match.result === 'Draw';
                                    const isGamersClub = match.source === 'GamersClub' || 
                                                                match.metadata?.source === 'GamersClub' || 
                                                                match.gameMode?.toLowerCase().includes('gamersclub') ||
                                                                match.gameMode?.toLowerCase().includes('gamers_club') ||
                                                                match.gameMode?.toLowerCase().includes('gamers-club') ||
                                                                match.gameMode?.toLowerCase() === 'gc';
                                    
                                    const isPremier = match.source?.toLowerCase().includes('premier') || 
                                                      match.gameMode?.toLowerCase().includes('premier') ||
                                                      match.metadata?.source?.toLowerCase().includes('premier') ||
                                                      match.metadata?.data_source?.toLowerCase().includes('premier');
                                            
                                            return (
                                                <motion.tr 
                                                    key={match.id || match.externalId || Math.random().toString()}
                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    whileHover={{ 
                                                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                                        scale: 1.005,
                                                        transition: { duration: 0.2 }
                                                    }}
                                                    className={`group relative border-b border-white/5 transition-all cursor-pointer ${
                                                        isWin ? 'hover:shadow-[inset_4px_0_0_0_#10b981]' : 
                                                        isLoss ? 'hover:shadow-[inset_4px_0_0_0_#ef4444]' : 
                                                        'hover:shadow-[inset_4px_0_0_0_#71717a]'
                                                    }`}
                                                    onClick={() => handleViewMatch(match)}
                                                >
                                            <td className="px-8 py-6 first:rounded-l-3xl">
                                                <div className="flex items-center gap-6">
                                                    <div className="relative w-16 h-10 overflow-hidden rounded-xl border border-white/10 shrink-0 group-hover:border-white/20 transition-colors">
                                                        <img
                                                            src={getMapImage(match.mapName)}
                                                            className="w-full h-full object-cover filter brightness-50 group-hover:brightness-90 transition-all duration-700 group-hover:scale-125"
                                                            alt={match.mapName}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-sm text-white uppercase italic tracking-tighter group-hover:text-emerald-400 transition-colors">
                                                            {match.mapName.toLowerCase().includes('dust') ? 'Dust 2' : 
                                                             match.mapName.replace('de_', '').replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{match.duration || 'MR12'} Match</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-6 text-center">
                                                <div className={`inline-flex flex-col items-center px-6 py-2 rounded-2xl border transition-all ${
                                                    isWin ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 
                                                    isLoss ? 'bg-red-500/10 border-red-500/20 text-red-500' : 
                                                    'bg-zinc-800/50 border-white/5 text-zinc-500'
                                                }`}>
                                                    <span className="text-xl font-black italic tracking-tighter leading-none mb-1">
                                                        {match.score || '0-0'}
                                                    </span>
                                                    <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60">
                                                        {isWin ? 'Victory' : isLoss ? 'Defeat' : 'Draw'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-6 text-center">
                                                <div className="flex justify-center flex-col items-center gap-1 group/rank">
                                                    {getRankIcon(match.rank || '', match.source, match.gameMode) ? (
                                                        <img 
                                                            src={getRankIcon(match.rank || '', match.source, match.gameMode)!} 
                                                            className="w-12 h-auto filter drop-shadow-[0_0_8px_rgba(255,255,255,0.15)] group-hover/rank:scale-125 transition-all duration-500" 
                                                            alt="rank" 
                                                        />
                                                    ) : (
                                                        <div className="h-10 flex items-center justify-center">
                                                            {match.source === 'Faceit' ? (
                                                                <Trophy className="text-orange-500/40 w-6 h-6 group-hover:rotate-12 transition-transform" />
                                                            ) : isGamersClub ? (
                                                                <Zap className="text-cyan-500/40 w-6 h-6 group-hover:scale-110 transition-transform" />
                                                            ) : (
                                                                <span className="text-zinc-800 font-black italic text-[10px]">N/A</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">
                                                        {(match.rank && match.rank !== 'unranked') ? match.rank : (isGamersClub ? 'Level GC' : 'Unranked')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-6 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className={`relative px-4 py-1.5 rounded-xl border transition-all overflow-hidden group/source ${
                                                        isGamersClub ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                        match.source === 'Faceit' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                        isPremier ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]' :
                                                        'bg-emerald-500/5 text-emerald-500 border-emerald-500/20'
                                                    }`}>
                                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/source:opacity-100 transition-opacity" />
                                                        <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.15em]">
                                                            {isGamersClub ? 'GamersClub' : 
                                                            match.source === 'Faceit' ? 'Faceit' :
                                                            isPremier ? 'Premier' :
                                                            'Competitive'}
                                                        </span>
                                                    </div>
                                                    {isPremier && match.metadata?.rank_delta && (
                                                        <div className={`flex items-center gap-1 text-[9px] font-black italic ${match.metadata.rank_delta > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {match.metadata.rank_delta > 0 ? (
                                                                <ChevronUp size={10} className="fill-current" />
                                                            ) : (
                                                                <ChevronDown size={10} className="fill-current" />
                                                            )}
                                                            {Math.abs(match.metadata.rank_delta)}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-1 py-6 text-center">
                                                 {match.externalId ? (
                                                     <button
                                                         onClick={(e) => {
                                                              e.stopPropagation();
                                                              const cleanId = match.externalId?.replace('leetify-', '') || '';
                                                             navigator.clipboard.writeText(cleanId);
                                                         }}
                                                         className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.03] hover:bg-emerald-500 text-zinc-600 hover:text-black transition-all active:scale-90 border border-white/5"
                                                         title={`Copiar ID (${match.source})`}
                                                     >
                                                         <Copy size={12} />
                                                     </button>
                                                 ) : (
                                                     <div className="w-10 h-10 flex items-center justify-center text-zinc-800 opacity-20" title="Link Protegido/Indisponível">
                                                         <Lock size={12} />
                                                     </div>
                                                 )}
                                             </td>
                                            <td className="px-2 py-6 text-center">
                                                <div className="flex flex-col">
                                                    <span className={`font-black text-xl italic leading-none tracking-tighter ${match.kills > 0 ? 'text-white' : 'text-zinc-700'}`}>
                                                        {match.kills > 0 ? match.kills : '—'}
                                                    </span>
                                                    <span className="text-[7px] font-black text-zinc-600 uppercase mt-1">Kills</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-6 text-center">
                                                <div className="flex flex-col">
                                                    <span className={`font-black text-xl italic leading-none tracking-tighter ${match.deaths > 0 ? 'text-zinc-500' : 'text-zinc-700'}`}>
                                                        {match.deaths > 0 ? match.deaths : '—'}
                                                    </span>
                                                    <span className="text-[7px] font-black text-zinc-700 uppercase mt-1">Deaths</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-6 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`font-black text-xl italic leading-none tracking-tighter ${match.assists > 0 ? 'text-zinc-600' : 'text-zinc-700'}`}>{match.assists > 0 ? match.assists : '—'}</span>
                                                    <div className="flex gap-1 mt-1.5">
                                                        {(match.metadata?.quadroKills || 0) > 0 && (
                                                            <div className="px-1 rounded bg-orange-500/20 border border-orange-500/30" title="Quadra Kill">
                                                                <span className="text-[7px] font-black text-orange-500 italic">4k</span>
                                                            </div>
                                                        )}
                                                        {(match.metadata?.pentaKills || 0) > 0 && (
                                                            <div className="px-1 rounded bg-purple-500/20 border border-purple-500/30 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.3)]" title="ACE">
                                                                <span className="text-[7px] font-black text-purple-400 italic">ACE</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-6 text-center">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-xl italic text-green-500/80 leading-none tracking-tighter">
                                                        {(match.adr || match.metadata?.adr) ? Math.round(match.adr || match.metadata?.adr) : '—'}
                                                    </span>
                                                    <span className="text-[7px] font-black text-zinc-700 uppercase mt-1">ADR</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-6 text-center">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-base italic text-zinc-500 leading-none tracking-tighter">
                                                        {match.hsPercentage !== null && match.hsPercentage !== undefined ? `${Math.round(match.hsPercentage)}%` : 
                                                         (match.metadata?.headshot_pct ? `${Math.round(Number(match.metadata.headshot_pct))}%` : 
                                                          (match.metadata?.hs_percentage ? `${Math.round(Number(match.metadata.hs_percentage))}%` : '—'))}
                                                    </span>
                                                    <span className="text-[7px] font-black text-zinc-700 uppercase mt-1">HS%</span>
                                                </div>
                                            </td>
                                             <td className="px-4 py-6 text-center">
                                                {(() => {
                                                    const rating = match.metadata?.leetify_rating || 
                                                                   match.metadata?.rating || 
                                                                   (match.source === 'Faceit' ? parseFloat(match.metadata?.kdRatio || '1.0') : 
                                                                    (match.kills / (match.deaths || 1)) || 1.0);
                                                    
                                                    const isLeetify = !!match.metadata?.leetify_rating;
                                                    
                                                    return (
                                                        <div className="flex flex-col items-center gap-1 group/rating">
                                                            <div className={`px-4 py-1.5 rounded-2xl font-black italic text-lg tracking-tighter transition-all group-hover:scale-110 ${
                                                                rating >= 1.2 ? 'bg-orange-500/20 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]' :
                                                                rating >= 1 ? 'bg-emerald-500/10 text-emerald-400' : 
                                                                'bg-red-500/10 text-red-500'
                                                            }`}>
                                                                {typeof rating === 'number' ? rating.toFixed(2) : parseFloat(String(rating)).toFixed(2)}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Activity size={8} className="text-zinc-600" />
                                                                <span className="text-[7px] text-zinc-600 font-black uppercase tracking-widest">
                                                                    {isLeetify ? 'Leetify' : 'Impact'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-8 py-6 text-right last:rounded-r-3xl">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-black text-white hover:text-emerald-400 transition-colors uppercase tracking-widest whitespace-nowrap">
                                                        {formatTimeAgo(match.matchDate)}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <div className={`w-1 h-1 rounded-full ${isWin ? 'bg-emerald-500' : isLoss ? 'bg-red-500' : 'bg-zinc-500'}`} />
                                                        <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Analítico ✓</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-32 px-10 text-center max-w-2xl mx-auto">
                        <div className="relative inline-block mb-12">
                            <div className="w-24 h-24 bg-gradient-to-tr from-green-500/20 to-amber-500/10 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl relative z-10">
                                <Lock className="w-10 h-10 text-green-500/50" />
                            </div>
                            <div className="absolute -inset-4 bg-green-500/5 blur-3xl rounded-full" />
                        </div>

                        {hasSteamCode ? (
                            // User has credentials but no matches — probably first sync timed out
                            <>
                                <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Credenciais Salvas ✓</h3>
                                <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-12 leading-relaxed max-w-md mx-auto">
                                    Seus dados estão configurados! Clique em <span className="text-green-400">Sincronizar</span> para carregar suas partidas. A primeira sincronização pode demorar um pouco.
                                </p>
                                <button
                                    onClick={onSync}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-4 mx-auto bg-green-500 hover:bg-green-400 text-black font-black uppercase text-sm tracking-widest py-5 px-12 rounded-3xl transition-all active:scale-95 shadow-xl shadow-green-500/30 disabled:opacity-50"
                                >
                                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                                    {loading ? 'Sincronizando...' : 'Sincronizar Agora'}
                                </button>
                            </>
                        ) : (
                            // User has no credentials configured
                            <>
                                <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Configuração Necessária</h3>
                                <p className="text-zinc-500 text-sm font-bold tracking-wide mb-12 leading-relaxed max-w-lg mx-auto">
                                    Para ver suas partidas Steam, você precisa configurar o <span className="text-green-400">Auth Code</span> e o <span className="text-yellow-400">Código da Última Partida</span> nas configurações.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <a
                                        href="https://help.steampowered.com/en/wizard/HelpWithGameIssue/?appid=730&issueid=128"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase text-[10px] tracking-widest py-5 rounded-3xl border border-white/5 transition-all flex flex-col items-center justify-center gap-3 active:scale-95"
                                    >
                                        <ExternalLink size={20} className="text-zinc-600 group-hover:text-cyan-500 transition-colors" />
                                        1. Auth Code
                                    </a>
                                    <a
                                        href="https://www.youtube.com/results?search_query=cs2+match+sharing+code"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase text-[10px] tracking-widest py-5 rounded-3xl border border-yellow-500/10 transition-all flex flex-col items-center justify-center gap-3 active:scale-95"
                                    >
                                        <Info size={20} className="text-yellow-500/40 group-hover:text-yellow-500 transition-colors" />
                                        2. Último Match Code
                                    </a>
                                    <button
                                        onClick={() => (window as any).location.href = '/settings'}
                                        className="group bg-green-500 hover:bg-green-400 text-black font-black uppercase text-[10px] tracking-widest py-5 rounded-3xl transition-all flex flex-col items-center justify-center gap-3 active:scale-95 shadow-xl shadow-green-500/20"
                                    >
                                        <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
                                        3. Configurações
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Pagination (Premium Style) */}
                {filteredMatches.length > itemsPerPage && !loading && (
                    <footer className="footer bg-black/40 p-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mr-3">Exibir:</span>
                            {[10, 25, 50].map(n => (
                                <button
                                    key={n}
                                    onClick={() => {
                                        setItemsPerPage(n);
                                        setCurrentPage(1);
                                    }}
                                    className={`w-12 h-12 rounded-2xl text-[10px] font-black transition-all border ${
                                        itemsPerPage === n 
                                        ? 'bg-white text-black border-white shadow-xl' 
                                        : 'bg-zinc-900/50 text-zinc-600 border-white/5 hover:border-white/10 hover:text-white'
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3 bg-black/40 p-2 rounded-3xl border border-white/5">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-zinc-500 disabled:opacity-20 hover:text-white transition-all active:scale-90"
                            >
                                <ChevronDown className="rotate-90" size={18} />
                            </button>
                            <div className="px-8 py-2 text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                                <span className="text-green-500">{currentPage}</span>
                                <span className="text-zinc-800">/</span>
                                <span className="text-zinc-500">{Math.ceil(filteredMatches.length / itemsPerPage)}</span>
                            </div>
                            <button
                                disabled={currentPage >= Math.ceil(filteredMatches.length / itemsPerPage)}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-zinc-500 disabled:opacity-20 hover:text-white transition-all active:scale-90"
                            >
                                <ChevronDown className="-rotate-90" size={18} />
                            </button>
                        </div>

                        <div className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">
                            Total {filteredMatches.length} <span className="text-zinc-800">Partidas</span>
                        </div>
                    </footer>
                )}
            </main>

            <MatchReportModal
                match={selectedMatch}
                matchId={selectedMatch?.source === 'Leetify' || selectedMatch?.externalId?.includes('leetify') ? 
                         (selectedMatch.externalId?.replace('leetify-', '') || selectedMatch.id) : null}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userSteamId={currentUserSteamId}
                userNickname={currentFaceit}
            />
        </div>
    );
};

export default MatchesDashboard;
