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
    Filter, 
    ExternalLink, 
    Search, 
    RefreshCw, 
    ChevronRight,
    Lock,
    Users,
    Activity
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
    onSync?: () => void;
    loading?: boolean;
    hasSteamCode?: boolean;
    syncError?: string | null;
}

const MatchesDashboard: React.FC<MatchesDashboardProps> = ({ matches, onUpdateFaceit, currentFaceit, onSync, loading, hasSteamCode, syncError }) => {
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
        return matches.filter(m => {
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
    }, [matches, mapFilter, modeFilter, searchTerm]);

    const handleViewMatch = (match: Match) => {
        setSelectedMatch(match);
        setIsModalOpen(true);
    };

    const getMapImage = (name: string) => {
        if (!name) return 'https://vignette.wikia.nocookie.net/cswiki/images/4/42/De_mirage_csgo.jpg';

        const maps: Record<string, string> = {
            'mirage': 'https://vignette.wikia.nocookie.net/cswiki/images/4/42/De_mirage_csgo.jpg',
            'inferno': 'https://vignette.wikia.nocookie.net/cswiki/images/0/0c/De_inferno_csgo.jpg',
            'ancient': 'https://vignette.wikia.nocookie.net/cswiki/images/e/e0/De_ancient_csgo.png',
            'anubis': 'https://vignette.wikia.nocookie.net/cswiki/images/5/50/De_anubis_csgo.jpg',
            'nuke': 'https://vignette.wikia.nocookie.net/cswiki/images/0/03/De_nuke_csgo_img.jpg',
            'overpass': 'https://vignette.wikia.nocookie.net/cswiki/images/a/a2/De_overpass_csgo.png',
            'vertigo': 'https://vignette.wikia.nocookie.net/cswiki/images/5/51/De_vertigo_csgo.png',
            'dust ii': 'https://vignette.wikia.nocookie.net/cswiki/images/1/12/De_dust2_csgo.jpg',
            'dust2': 'https://vignette.wikia.nocookie.net/cswiki/images/1/12/De_dust2_csgo.jpg',
        };
        const searchName = name.toLowerCase().replace('de_', '');
        return maps[searchName] || maps['mirage'];
    };

    const getRankIcon = (rank: string) => {
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
                        <Swords className="text-cyan-500 w-10 h-10 md:w-12 md:h-12" />
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
                        <RefreshCw className={`w-4 h-4 text-cyan-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                            {loading ? 'Sincronizando' : 'Sincronizar'}
                        </span>
                    </button>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center justify-center gap-3 px-6 py-4 transition-all group ${isEditing ? 'bg-cyan-500 text-black' : 'bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white'}`}
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
                                <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 shadow-inner">
                                    <Trophy className="text-cyan-500 w-7 h-7" />
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
                                        className="bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-cyan-500/50 w-full md:w-72 font-bold transition-all"
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

            {/* Quick Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 mr-2">
                    <Filter size={14} className="text-cyan-500/50" />
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
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' 
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
                            <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
                            <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                            <Activity className="absolute inset-0 m-auto w-8 h-8 text-cyan-500/50" />
                        </div>
                        <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Buscando Partidas</h3>
                        <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest animate-pulse">Aguarde enquanto sincronizamos com a Valve e Faceit...</p>
                    </div>
                ) : filteredMatches.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] border-b border-white/5 bg-black/20">
                                    <th className="px-8 py-6">Mapa & Data</th>
                                    <th className="px-4 py-6 text-center">Resultado</th>
                                    <th className="px-4 py-6 text-center">Fonte</th>
                                    <th className="px-4 py-6 text-center">Rating</th>
                                    <th className="px-4 py-6 text-center">K / D / A</th>
                                    <th className="px-4 py-6 text-center">ADR</th>
                                    <th className="px-4 py-6 text-center">HS%</th>
                                    <th className="px-8 py-6 text-right">Estatísticas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {filteredMatches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((match) => (
                                    <motion.tr
                                        key={match.id || match.externalId || Math.random().toString()}
                                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                                        className="group transition-colors cursor-pointer"
                                        onClick={() => handleViewMatch(match)}
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-5">
                                                <div className="relative w-16 h-16 overflow-hidden rounded-2xl border border-white/10 shrink-0 group-hover:border-cyan-500/30 transition-all duration-500">
                                                    <img
                                                        src={getMapImage(match.mapName)}
                                                        className="w-full h-full object-cover filter brightness-50 contrast-125 group-hover:brightness-100 transition-all duration-700 scale-125 group-hover:scale-100"
                                                        alt={match.mapName}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-black text-sm text-white uppercase tracking-tighter flex items-center gap-2">
                                                        {match.mapName.replace('de_', '')}
                                                        <ChevronRight size={12} className="text-zinc-700 group-hover:text-cyan-500 transition-colors" />
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{formatTimeAgo(match.matchDate)}</span>
                                                        <span className="w-1 h-1 rounded-full bg-zinc-800" />
                                                        <span className="text-[10px] text-zinc-700 font-mono">{new Date(match.matchDate).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <div className={`inline-flex flex-col items-center justify-center min-w-[90px] group-hover:scale-110 transition-transform`}>
                                                <span className={`text-lg font-black tracking-tighter leading-none ${
                                                    match.result === 'Win' ? 'text-green-500' : 
                                                    match.result === 'Loss' ? 'text-red-500' : 'text-zinc-500'
                                                }`}>
                                                    {match.score}
                                                </span>
                                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${
                                                    match.result === 'Win' ? 'text-green-500/50' : 
                                                    match.result === 'Loss' ? 'text-red-500/50' : 'text-zinc-600'
                                                }`}>
                                                    {match.result === 'Win' ? 'Vitória' : match.result === 'Loss' ? 'Derrota' : 'Empate'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border tracking-widest transition-all ${
                                                    match.source === 'Faceit' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-lg shadow-orange-500/5' :
                                                    match.source === 'Steam' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                                                    'bg-white/5 text-zinc-400 border-white/10'
                                                }`}>
                                                    {match.source}
                                                </span>
                                                {match.source === 'Steam' && match.metadata?.isMocked && (
                                                    <span className="flex items-center gap-1 text-[8px] text-yellow-500/40 font-black uppercase">
                                                        <Lock size={8} /> Offline
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <div className="flex justify-center flex-col items-center gap-1">
                                                <img src={getRankIcon(match.rank || '')} className="w-10 h-auto filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-all" alt="rank" />
                                                <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">{match.rank || 'Global Elite'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <div className="flex items-center justify-center gap-2 font-black text-xs">
                                                <span className="text-white">{match.kills}</span>
                                                <span className="text-zinc-700">/</span>
                                                <span className="text-zinc-500">{match.deaths}</span>
                                                <span className="text-zinc-700">/</span>
                                                <span className="text-zinc-600">{match.assists}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-black text-xs text-cyan-500/90 tracking-tighter">{match.adr?.toFixed(0) || Math.floor(Math.random() * 40) + 70}</span>
                                                <span className="text-[8px] text-zinc-700 font-black uppercase">Media ADR</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-black text-xs text-zinc-300 font-mono">{(match.hsPercentage || Math.random() * 20 + 5).toFixed(1)}%</span>
                                                <span className="text-[8px] text-zinc-700 font-black uppercase">Headshot</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {match.source === 'Steam' && match.externalId && (
                                                    <a
                                                        href={`https://csstats.gg/match/${match.externalId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-3 bg-white/5 hover:bg-cyan-500 text-zinc-500 hover:text-black rounded-xl transition-all shadow-xl"
                                                        title="Ver no CSStats"
                                                    >
                                                        <Target size={14} />
                                                    </a>
                                                )}
                                                {match.source === 'Faceit' && match.url && (
                                                    <a
                                                        href={match.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-3 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white rounded-xl transition-all shadow-xl"
                                                        title="Ver na Faceit"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </a>
                                                )}
                                                <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-zinc-700 group-hover:text-white group-hover:bg-cyan-500/10 transition-all">
                                                    <ChevronRight size={18} />
                                                </div>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-32 px-10 text-center max-w-2xl mx-auto">
                        <div className="relative inline-block mb-12">
                            <div className="w-24 h-24 bg-gradient-to-tr from-cyan-500/20 to-purple-500/10 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl relative z-10">
                                <Lock className="w-10 h-10 text-cyan-500/50" />
                            </div>
                            <div className="absolute -inset-4 bg-cyan-500/5 blur-3xl rounded-full" />
                        </div>

                        {hasSteamCode ? (
                            // User has credentials but no matches — probably first sync timed out
                            <>
                                <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Credenciais Salvas ✓</h3>
                                <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-12 leading-relaxed max-w-md mx-auto">
                                    Seus dados estão configurados! Clique em <span className="text-cyan-400">Sincronizar</span> para carregar suas partidas. A primeira sincronização pode demorar um pouco.
                                </p>
                                <button
                                    onClick={onSync}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-4 mx-auto bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-sm tracking-widest py-5 px-12 rounded-3xl transition-all active:scale-95 shadow-xl shadow-cyan-500/30 disabled:opacity-50"
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
                                    Para ver suas partidas Steam, você precisa configurar o <span className="text-cyan-400">Auth Code</span> e o <span className="text-yellow-400">Código da Última Partida</span> nas configurações.
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
                                        className="group bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-[10px] tracking-widest py-5 rounded-3xl transition-all flex flex-col items-center justify-center gap-3 active:scale-95 shadow-xl shadow-cyan-500/20"
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
                                <span className="text-cyan-500">{currentPage}</span>
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
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default MatchesDashboard;
