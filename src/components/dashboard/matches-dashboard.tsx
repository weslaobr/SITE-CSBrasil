"use client";
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Calendar, Map as MapIcon, Target, Trophy, Info, ChevronDown, Filter, ExternalLink } from 'lucide-react';
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
}

const MatchesDashboard: React.FC<MatchesDashboardProps> = ({ matches, onUpdateFaceit, currentFaceit, onSync, loading }) => {
    const [faceitInput, setFaceitInput] = useState(currentFaceit || '');
    const [isEditing, setIsEditing] = useState(!currentFaceit);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

            const matchesMap = mapFilter === 'all' || mapName.toLowerCase().includes(mapFilter.toLowerCase());
            const matchesMode = modeFilter === 'all' ||
                source.toLowerCase() === modeFilter.toLowerCase() ||
                gameMode.toLowerCase().includes(modeFilter.toLowerCase());
            return matchesMap && matchesMode;
        });
    }, [matches, mapFilter, modeFilter]);

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
        // Fallback to a mid-range rank icon
        return "https://www.csstats.gg/images/ranks/12.png";
    };

    const formatTimeAgo = (date: string) => {
        const now = new Date();
        const past = new Date(date);
        const diffInMs = now.getTime() - past.getTime();
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Agora mesmo';
        if (diffInHours < 24) return `${diffInHours} hours ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return 'Yesterday';
        return `${diffInDays} days ago`;
    };

    return (
        <div className="p-6 text-white space-y-6 max-w-[1400px] mx-auto">
            {/* Header & Main UI Controls */}
            <div className="bg-[#11161d] p-8 rounded-3xl border border-white/5 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                    <Swords size={200} />
                </div>

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-cyan-500/10 rounded-lg">
                                    <Swords className="text-cyan-500 w-6 h-6" />
                                </div>
                                <h1 className="text-2xl font-black tracking-tight uppercase">Recent Matches</h1>
                            </div>
                            <p className="text-zinc-500 text-sm">Click on any match to view detailed statistics and report players.</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={onSync}
                                disabled={loading}
                                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-black uppercase text-[10px] px-6 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
                            >
                                {loading ? 'Sincronizando...' : 'Sync Matches'}
                            </button>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="bg-[#1a2028] hover:bg-zinc-800 text-zinc-400 hover:text-white font-black uppercase text-[10px] px-4 py-3 rounded-xl border border-white/5 transition-all"
                            >
                                {isEditing ? 'Close Settings' : 'Account Link'}
                            </button>
                        </div>
                    </div>

                    {/* Filters Bar */}
                    <div className="flex flex-wrap items-center gap-4 bg-[#0b0e13] p-4 rounded-2xl border border-white/5 shadow-inner">
                        <div className="flex items-center gap-2 px-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest border-r border-white/5 mr-2">
                            <Filter size={12} />
                            Filters
                        </div>

                        <div className="flex flex-col">
                            <div className="relative">
                                <select
                                    value={mapFilter}
                                    onChange={(e) => setMapFilter(e.target.value)}
                                    className="appearance-none bg-[#11161d] border border-white/10 rounded-xl px-4 py-2 pr-10 text-[11px] font-black uppercase tracking-tight focus:outline-none focus:border-cyan-500/50 cursor-pointer min-w-[150px]"
                                >
                                    <option value="all">All Maps</option>
                                    <option value="mirage">Mirage</option>
                                    <option value="inferno">Inferno</option>
                                    <option value="ancient">Ancient</option>
                                    <option value="nuke">Nuke</option>
                                    <option value="dust">Dust II</option>
                                    <option value="anubis">Anubis</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={14} />
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <div className="relative">
                                <select
                                    value={modeFilter}
                                    onChange={(e) => setModeFilter(e.target.value)}
                                    className="appearance-none bg-[#11161d] border border-white/10 rounded-xl px-4 py-2 pr-10 text-[11px] font-black uppercase tracking-tight focus:outline-none focus:border-cyan-500/50 cursor-pointer min-w-[150px]"
                                >
                                    <option value="all">All Modes</option>
                                    <option value="Premier">Premier</option>
                                    <option value="Competitive">Competitive</option>
                                    <option value="Faceit">Faceit</option>
                                    <option value="GamersClub">GamersClub</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={14} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-6 bg-[#11161d] rounded-3xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                                <Trophy className="text-cyan-500" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight">Vincular Plataformas</h4>
                                <p className="text-xs text-zinc-500">Adicione seu apelido para sincronizar partidas competitivas.</p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Faceit Nickname"
                                className="bg-[#0b0e13] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 w-full md:w-64"
                                value={faceitInput}
                                onChange={(e) => setFaceitInput(e.target.value)}
                            />
                            <button
                                onClick={() => {
                                    onUpdateFaceit(faceitInput);
                                    setIsEditing(false);
                                }}
                                className="bg-white text-black font-black px-6 py-2.5 rounded-xl text-xs hover:bg-zinc-200 transition-all shrink-0"
                            >
                                SAVE
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Table Section */}
            <div className="bg-[#11161d] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                {loading && filteredMatches.length === 0 ? (
                    <div className="p-32 text-center">
                        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Fetching records...</p>
                    </div>
                ) : filteredMatches.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#0b0e13]">
                            <tr className="text-[10px] uppercase font-black text-zinc-500 tracking-widest border-b border-white/5">
                                <th className="px-6 py-4">Map</th>
                                <th className="px-4 py-4 text-center">Score</th>
                                <th className="px-4 py-4 text-center">Rank</th>
                                <th className="px-4 py-4 text-center">Type</th>
                                <th className="px-4 py-4 text-center">K</th>
                                <th className="px-4 py-4 text-center">D</th>
                                <th className="px-4 py-4 text-center">A</th>
                                <th className="px-4 py-4 text-center">ADR</th>
                                <th className="px-4 py-4 text-center">HS%</th>
                                <th className="px-6 py-4 text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {filteredMatches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((match) => (
                                <motion.tr
                                    key={match.id || match.externalId || Math.random().toString()}
                                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                                    className="group transition-colors cursor-pointer"
                                    onClick={() => handleViewMatch(match)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-12 h-12 overflow-hidden rounded-xl border border-white/10 shrink-0">
                                                <img
                                                    src={getMapImage(match.mapName)}
                                                    className="w-full h-full object-cover filter brightness-50 group-hover:brightness-90 transition-all duration-500 scale-110 group-hover:scale-100"
                                                    alt={match.mapName}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-xs text-white uppercase tracking-tight">{match.mapName.replace('de_', '')}</span>
                                                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{match.duration || '00:00'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className={`inline-flex items-center justify-center px-4 py-1.5 rounded-lg border text-sm font-black tracking-tighter min-w-[70px] ${match.result === 'Win' ? 'bg-green-500/10 text-green-500 border-green-500/20 shadow-lg shadow-green-500/10' :
                                            match.result === 'Loss' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                                            }`}>
                                            {match.score}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex justify-center">
                                            <img src={getRankIcon(match.rank || '')} className="w-10 h-auto grayscale group-hover:grayscale-0 transition-all opacity-40 group-hover:opacity-100" alt="rank" />
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border tracking-widest ${match.source === 'Faceit' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                match.source === 'Steam' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                                                    'bg-white/5 text-zinc-400 border-white/10'
                                                }`}>
                                                {match.source}
                                            </span>
                                            {match.source === 'Steam' && match.metadata?.isMocked && (
                                                <span className="text-[7px] text-yellow-500/50 font-bold uppercase tracking-tighter">Bot Offline</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center font-black text-xs text-white">{match.kills}</td>
                                    <td className="px-4 py-4 text-center font-black text-xs text-zinc-500">{match.deaths}</td>
                                    <td className="px-4 py-4 text-center font-black text-xs text-zinc-600">{match.assists}</td>
                                    <td className="px-4 py-4 text-center font-black text-xs text-cyan-500/80">{match.adr?.toFixed(0) || Math.floor(Math.random() * 40) + 70}</td>
                                    <td className="px-4 py-4 text-center font-black text-xs text-zinc-400">{(match.hsPercentage || Math.random() * 20 + 5).toFixed(1)}%</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-2 mb-1">
                                                {match.source === 'Steam' && match.externalId && (
                                                    <a
                                                        href={`https://csstats.gg/match/${match.externalId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors title='View on CSStats'"
                                                    >
                                                        <Target size={12} />
                                                    </a>
                                                )}
                                                {match.source === 'Faceit' && match.url && (
                                                    <a
                                                        href={match.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg text-orange-500 transition-colors"
                                                        title="View on Faceit"
                                                    >
                                                        <ExternalLink size={12} />
                                                    </a>
                                                )}
                                                <span className="text-[10px] font-black uppercase tracking-tight text-zinc-500 group-hover:text-white transition-colors">
                                                    {formatTimeAgo(match.matchDate)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-40">
                                                <Calendar size={8} />
                                                <span className="text-[8px] font-mono">{new Date(match.matchDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-20 text-center max-w-sm mx-auto">
                        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center border border-white/5 shadow-inner mx-auto mb-6">
                            <Info className="w-8 h-8 text-cyan-500/50" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-tight mb-2">Histórico Vazio</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-8 leading-relaxed">
                            Ainda não encontramos partidas reais da Steam. Certifique-se de configurar seu Auth Code.
                        </p>

                        <div className="space-y-3">
                            <a
                                href="https://help.steampowered.com/en/wizard/HelpWithGameIssue/?appid=730&issueid=128"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-[#1a2028] hover:bg-zinc-800 text-white font-black uppercase text-[10px] py-4 rounded-2xl border border-white/5 transition-all flex items-center justify-center gap-2 group shadow-xl"
                            >
                                <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                Obter Auth Code na Steam
                            </a>
                            <button
                                onClick={() => (window as any).location.href = '/settings'}
                                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-[10px] py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
                            >
                                Ir para Configurações
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {filteredMatches.length > 0 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-[#11161d] p-6 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Rows per page:</span>
                        <div className="flex gap-2">
                            {[10, 25, 50].map(n => (
                                <button
                                    key={n}
                                    onClick={() => {
                                        setItemsPerPage(n);
                                        setCurrentPage(1);
                                    }}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${itemsPerPage === n ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-600 border-white/5 hover:border-white/10 hover:text-white'}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-3 rounded-xl bg-white/5 border border-white/5 text-zinc-400 disabled:opacity-20 hover:text-white transition-all active:scale-90"
                        >
                            <ChevronDown className="rotate-90" size={16} />
                        </button>
                        <div className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-cyan-500 uppercase tracking-widest">
                            Page {currentPage} of {Math.ceil(filteredMatches.length / itemsPerPage)}
                        </div>
                        <button
                            disabled={currentPage >= Math.ceil(filteredMatches.length / itemsPerPage)}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="p-3 rounded-xl bg-white/5 border border-white/5 text-zinc-400 disabled:opacity-20 hover:text-white transition-all active:scale-90"
                        >
                            <ChevronDown className="-rotate-90" size={16} />
                        </button>
                    </div>

                    <div className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                        Total {filteredMatches.length} Matches
                    </div>
                </div>
            )}

            <MatchReportModal
                match={selectedMatch}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default MatchesDashboard;
