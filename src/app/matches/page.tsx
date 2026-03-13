"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Swords, RefreshCw, Search, ExternalLink, ChevronLeft,
    ChevronRight, X, Target, Crosshair, Trophy, Clock,
    Calendar, Activity, Zap, Shield, TrendingUp, BarChart3
} from "lucide-react";
import MatchReviewModal from "@/components/csbrasil/match-review-modal";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const MAP_LABELS: Record<string, string> = {
    'de_mirage':   'Mirage',   'mirage':   'Mirage',
    'de_inferno':  'Inferno',  'inferno':  'Inferno',
    'de_ancient':  'Ancient',  'ancient':  'Ancient',
    'de_anubis':   'Anubis',   'anubis':   'Anubis',
    'de_nuke':     'Nuke',     'nuke':     'Nuke',
    'de_overpass': 'Overpass', 'overpass': 'Overpass',
    'de_vertigo':  'Vertigo',  'vertigo':  'Vertigo',
    'de_dust2':    'Dust 2',   'dust2':    'Dust 2',   'dust 2': 'Dust 2',
};

function formatMapName(raw: string) {
    if (!raw) return 'Desconhecido';
    const key = raw.toLowerCase();
    return MAP_LABELS[key] || raw.replace('de_', '').charAt(0).toUpperCase() + raw.replace('de_', '').slice(1);
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'Agora mesmo';
    if (h < 24) return `${h}h atrás`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'Ontem';
    return `${d} dias atrás`;
}

function StatBox({ label, value, color = 'white', icon }: { label: string; value: any; color?: string; icon?: React.ReactNode }) {
    const colorMap: Record<string, string> = {
        green: 'text-green-400', red: 'text-red-400', cyan: 'text-cyan-400',
        yellow: 'text-yellow-400', purple: 'text-purple-400', white: 'text-white',
    };
    return (
        <div className="bg-white/[0.04] border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                {icon}{label}
            </p>
            <p className={`text-2xl font-black italic tracking-tighter ${colorMap[color] || 'text-white'}`}>
                {value ?? '—'}
            </p>
        </div>
    );
}

// ────────────────────────────────────────────
// Match Detail Drawer
// ────────────────────────────────────────────

function MatchDetailDrawer({ match, onClose }: { match: any; onClose: () => void }) {
    const isWin  = match.result === 'Win';
    const isDraw = match.result === 'Draw';
    const mapLabel = formatMapName(match.mapName || '');

    const meta = match.metadata || {};
    const leetifyRating = meta.leetify_rating ?? null;
    const kd = match.deaths > 0 ? (match.kills / match.deaths).toFixed(2) : match.kills > 0 ? '∞' : '—';
    const kdr = match.kills > 0 || match.deaths > 0 ? `${match.kills}/${match.deaths}/${match.assists}` : '—';

    const resultLabel = isWin ? 'Vitória' : isDraw ? 'Empate' : 'Derrota';
    const resultColor = isWin ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400';
    const resultBg    = isWin ? 'bg-green-500' : isDraw ? 'bg-yellow-500' : 'bg-red-500';

    const hasLeetify = match.url && match.url.includes('leetify');
    const hasCsStats = match.source === 'Steam' && match.externalId;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-6"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-10 h-10 ${resultBg} rounded-xl flex items-center justify-center font-black italic text-lg ${isWin || isDraw ? 'text-black' : 'text-white'}`}>
                                    {isWin ? 'W' : isDraw ? 'E' : 'L'}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{mapLabel}</h2>
                                    <p className={`text-sm font-black uppercase tracking-widest ${resultColor}`}>{resultLabel}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border tracking-widest ${
                                    match.source === 'Faceit'  ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                    match.source === 'Leetify' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                    'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                }`}>{match.source || 'Steam'}</span>
                                {match.gameMode && (
                                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{match.gameMode}</span>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Date & Duration */}
                    <div className="flex items-center gap-6 mb-8 pb-6 border-b border-white/5">
                        <div className="flex items-center gap-2 text-zinc-500">
                            <Calendar size={14} />
                            <span className="text-xs font-bold">
                                {match.matchDate ? new Date(match.matchDate).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                            <Clock size={14} />
                            <span className="text-xs font-bold">{match.duration || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-600">
                            <Activity size={14} />
                            <span className="text-[10px] font-bold">{timeAgo(match.matchDate)}</span>
                        </div>
                    </div>

                    {/* Score highlight */}
                    {match.score && match.score !== '0-0' && (
                        <div className="text-center mb-8">
                            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-2">Placar Final</p>
                            <p className={`text-5xl font-black italic tracking-tighter ${resultColor}`}>{match.score}</p>
                        </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                        <StatBox
                            label="K / D / A"
                            value={kdr}
                            icon={<Target size={10} />}
                        />
                        <StatBox
                            label="K/D Ratio"
                            value={kd}
                            color={parseFloat(kd) >= 1 ? 'green' : 'red'}
                            icon={<TrendingUp size={10} />}
                        />
                        {match.mvps > 0 && (
                            <StatBox
                                label="MVPs"
                                value={match.mvps}
                                color="yellow"
                                icon={<Trophy size={10} />}
                            />
                        )}
                        {match.adr != null && match.adr > 0 && (
                            <StatBox
                                label="ADR"
                                value={typeof match.adr === 'number' ? match.adr.toFixed(1) : match.adr}
                                color="cyan"
                                icon={<Zap size={10} />}
                            />
                        )}
                        {match.hsPercentage != null && match.hsPercentage > 0 && (
                            <StatBox
                                label="Headshot %"
                                value={`${typeof match.hsPercentage === 'number' ? match.hsPercentage.toFixed(1) : match.hsPercentage}%`}
                                color="purple"
                                icon={<Crosshair size={10} />}
                            />
                        )}
                        {leetifyRating != null && (
                            <StatBox
                                label="Leetify Rating"
                                value={typeof leetifyRating === 'number' ? leetifyRating.toFixed(2) : leetifyRating}
                                color={leetifyRating > 0 ? 'green' : 'red'}
                                icon={<Activity size={10} />}
                            />
                        )}
                    </div>

                    {/* Extra metadata from Leetify */}
                    {(meta.tripleKills || meta.quadroKills || meta.pentaKills) && (
                        <div className="mb-8">
                            <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-3">Multikills</p>
                            <div className="flex gap-3 flex-wrap">
                                {meta.tripleKills > 0 && (
                                    <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg">
                                        3K × {meta.tripleKills}
                                    </span>
                                )}
                                {meta.quadroKills > 0 && (
                                    <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg">
                                        4K × {meta.quadroKills}
                                    </span>
                                )}
                                {meta.pentaKills > 0 && (
                                    <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg">
                                        ACE × {meta.pentaKills}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* External Links */}
                    <div className="flex gap-3 flex-wrap border-t border-white/5 pt-6">
                        {hasLeetify && (
                            <a
                                href={match.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <ExternalLink size={14} /> Ver no Leetify
                            </a>
                        )}
                        {hasCsStats && (
                            <a
                                href={`https://csstats.gg/match/${match.externalId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <ExternalLink size={14} /> Ver no CSStats
                            </a>
                        )}
                        {match.source === 'Faceit' && match.url && (
                            <a
                                href={match.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <ExternalLink size={14} /> Ver na Faceit
                            </a>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────

export default function MatchesPage() {
    const { data: session } = useSession();
    const [matches,   setMatches]   = useState<any[]>([]);
    const [loading,   setLoading]   = useState(false);
    const [syncing,   setSyncing]   = useState(false);
    const [search,    setSearch]    = useState('');
    const [filter,    setFilter]    = useState<'all' | 'win' | 'loss'>('all');
    const [page,      setPage]      = useState(1);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
    const PER_PAGE = 20;

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const res  = await fetch('/api/matches');
            const data = await res.json();
            setMatches(data.matches || []);
        } catch (e) { console.error(e); }
        finally     { setLoading(false); }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await fetch('/api/sync/all', { method: 'POST' });
            await fetchMatches();
        } catch (e) { console.error(e); }
        finally     { setSyncing(false); }
    };

    useEffect(() => { if (session) fetchMatches(); }, [session]);

    const filtered = useMemo(() =>
        matches.filter(m => {
            const mapOk    = search === '' || (m.mapName || '').toLowerCase().includes(search.toLowerCase());
            const resultOk = filter === 'all'
                || (filter === 'win'  && m.result === 'Win')
                || (filter === 'loss' && m.result === 'Loss');
            return mapOk && resultOk;
        }),
    [matches, search, filter]);

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const wins   = matches.filter(m => m.result === 'Win').length;
    const losses = matches.filter(m => m.result === 'Loss').length;
    const wr     = matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;

    if (!session) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-zinc-500 font-black uppercase tracking-widest">
                Faça login para ver seu histórico
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 pb-24">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                        <Swords className="text-cyan-500" size={36} />
                        Minhas Partidas
                    </h1>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
                        {matches.length} registradas &nbsp;·&nbsp;
                        <span className="text-green-500">{wins}W</span>
                        &nbsp;/&nbsp;
                        <span className="text-red-500">{losses}L</span>
                        &nbsp;·&nbsp;
                        <span className="text-cyan-500">{wr}% WR</span>
                    </p>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-0 bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="relative flex items-center border-r border-white/5">
                        <Search size={14} className="absolute left-4 text-zinc-600" />
                        <input
                            type="text"
                            placeholder="Buscar mapa..."
                            className="bg-transparent pl-10 pr-4 py-3 text-sm font-medium focus:outline-none w-44 placeholder:text-zinc-700"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40 border-r border-white/5"
                    >
                        <RefreshCw size={14} className={syncing ? 'animate-spin text-cyan-500' : ''} />
                        {syncing ? 'Sync...' : 'Sincronizar'}
                    </button>
                    <div className="flex">
                        {(['all', 'win', 'loss'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => { setFilter(f); setPage(1); }}
                                className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                                    filter === f
                                        ? f === 'win'  ? 'bg-green-500 text-black'
                                        : f === 'loss' ? 'bg-red-500 text-white'
                                        :                'bg-white text-black'
                                        : 'text-zinc-600 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {f === 'all' ? 'Todos' : f === 'win' ? 'Vitórias' : 'Derrotas'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Match List */}
            <div className="bg-zinc-900/40 rounded-[2.5rem] border border-white/5 p-6 md:p-8 backdrop-blur-xl">
                <h2 className="text-lg font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-cyan-500 rounded-full" />
                    Histórico de Combate
                    {filtered.length !== matches.length && (
                        <span className="text-xs text-zinc-600 font-bold normal-case tracking-normal">
                            ({filtered.length} de {matches.length})
                        </span>
                    )}
                </h2>

                {loading ? (
                    <div className="py-24 flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                        <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Carregando partidas...</p>
                    </div>
                ) : paged.length > 0 ? (
                    <div className="space-y-3">
                        {paged.map((match, idx) => {
                            const isWin  = match.result === 'Win';
                            const isDraw = match.result === 'Draw';
                            const mapLabel = formatMapName(match.mapName || '');
                            const rating   = match.metadata?.leetify_rating ?? match.adr;

                            return (
                                <motion.div
                                    key={match.id}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    onClick={() => {
                                        if (match.source === 'Leetify') {
                                            // Extract UUID from leetify-UUID
                                            const cleanId = match.externalId?.replace('leetify-', '');
                                            setSelectedId(cleanId || match.id);
                                        } else {
                                            setSelectedMatch(match);
                                        }
                                    }}
                                    className="bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 p-5 rounded-2xl flex items-center justify-between gap-6 transition-all group cursor-pointer"
                                >
                                    {/* Left */}
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black italic text-lg shadow-lg shrink-0 ${
                                            isWin  ? 'bg-green-500 text-black'  :
                                            isDraw ? 'bg-yellow-500 text-black' :
                                                     'bg-red-500 text-white'
                                        }`}>
                                            {isWin ? 'W' : isDraw ? 'E' : 'L'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-white font-black italic uppercase text-sm tracking-tight truncate group-hover:text-cyan-400 transition-colors">
                                                {mapLabel}
                                            </p>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase">
                                                {match.source || 'Steam'}
                                                &nbsp;·&nbsp;
                                                {match.matchDate ? timeAgo(match.matchDate) : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right */}
                                    <div className="flex items-center gap-8 shrink-0">
                                        {match.score && match.score !== '0-0' && (
                                            <div className="text-center hidden md:block">
                                                <p className="text-[9px] text-zinc-600 font-black uppercase mb-0.5">Score</p>
                                                <p className={`font-black italic text-sm ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                                                    {match.score}
                                                </p>
                                            </div>
                                        )}
                                        {match.kills > 0 && (
                                            <div className="text-center hidden md:block">
                                                <p className="text-[9px] text-zinc-600 font-black uppercase mb-0.5">K/D/A</p>
                                                <p className="font-bold text-xs text-zinc-300">
                                                    {match.kills}/{match.deaths}/{match.assists}
                                                </p>
                                            </div>
                                        )}
                                        {rating != null && rating > 0 && (
                                            <div className="text-center">
                                                <p className="text-[9px] text-zinc-600 font-black uppercase mb-0.5">Rating</p>
                                                <p className="font-black italic text-sm text-cyan-400">
                                                    {typeof rating === 'number' ? rating.toFixed(2) : rating}
                                                </p>
                                            </div>
                                        )}
                                        {/* Click hint */}
                                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-zinc-700 group-hover:text-cyan-500 group-hover:bg-cyan-500/10 transition-all">
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <p className="text-zinc-600 font-black uppercase text-xs tracking-widest">
                            {matches.length === 0
                                ? 'Nenhuma partida. Clique em Sincronizar!'
                                : 'Nenhuma partida corresponde ao filtro.'}
                        </p>
                        {matches.length === 0 && (
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className="mt-6 flex items-center gap-2 mx-auto bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-xs px-8 py-4 rounded-2xl transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                                {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-black text-zinc-400">
                        <span className="text-white">{page}</span> / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* Full Match Review Modal (Scoreboard) */}
            <MatchReviewModal 
                matchId={selectedId} 
                onClose={() => setSelectedId(null)} 
            />

            {/* Simple Detail Drawer (for non-Leetify or fallback) */}
            <AnimatePresence>
                {selectedMatch && (
                    <MatchDetailDrawer match={selectedMatch} onClose={() => setSelectedMatch(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
