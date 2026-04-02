"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Map, Trophy, Target, TrendingUp, Crosshair, Clock, BarChart3, SortAsc } from "lucide-react";

interface MapStat {
    mapName: string;
    image: string;
    total: number;
    wins: number;
    losses: number;
    winRate: number;
    avgKills: number;
    avgAdr: number;
    kdr: number;
    lastPlayed: string;
}

type SortKey = 'total' | 'winRate' | 'avgAdr' | 'kdr';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'total', label: 'Mais Jogado' },
    { key: 'winRate', label: 'Win Rate' },
    { key: 'avgAdr', label: 'ADR' },
    { key: 'kdr', label: 'KDR' },
];

function timeAgo(iso: string): string {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days}d atrás`;
    if (days < 30) return `${Math.floor(days / 7)}sem atrás`;
    return `${Math.floor(days / 30)}m atrás`;
}

export default function MapsPage() {
    const [maps, setMaps] = useState<MapStat[]>([]);
    const [totalMatches, setTotalMatches] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sortKey, setSortKey] = useState<SortKey>('total');
    const [selected, setSelected] = useState<MapStat | null>(null);

    useEffect(() => {
        fetch('/api/maps')
            .then(r => r.json())
            .then(d => {
                if (d.maps) {
                    setMaps(d.maps);
                    setTotalMatches(d.totalMatches);
                    if (d.maps.length > 0) setSelected(d.maps[0]);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const sorted = useMemo(() =>
        [...maps].sort((a, b) => b[sortKey] - a[sortKey]),
        [maps, sortKey]
    );

    const mostPlayed = maps[0];
    const bestWinRate = [...maps].sort((a, b) => b.winRate - a.winRate)[0];
    const bestAdr = [...maps].sort((a, b) => b.avgAdr - a.avgAdr)[0];

    return (
        <div className="p-4 md:p-8 space-y-8 min-h-screen pb-24">
            {/* Header */}
            <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-hidden">
                <div className="pointer-events-none absolute -top-16 -left-16 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-inner">
                            <Map className="text-blue-400 w-7 h-7 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">Stats de</span>
                                <span className="text-blue-400"> Mapas</span>
                            </h1>
                            <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.5em] mt-1 flex items-center gap-2">
                                <span className="w-4 h-px bg-blue-500/40" />
                                Desempenho da Tropa
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                <span className="text-zinc-500">{totalMatches} partidas analisadas</span>
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Community Map Highlights */}
            {!loading && maps.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    {[
                        {
                            icon: <BarChart3 size={16} className="text-blue-400" />,
                            label: 'Mapa Favorito',
                            value: mostPlayed?.mapName || '—',
                            sub: `${mostPlayed?.total || 0} partidas`,
                            accent: 'border-blue-500/20 bg-blue-500/5',
                        },
                        {
                            icon: <Trophy size={16} className="text-emerald-400" />,
                            label: 'Melhor Win Rate',
                            value: bestWinRate?.mapName || '—',
                            sub: `${bestWinRate?.winRate || 0}% de vitórias`,
                            accent: 'border-emerald-500/20 bg-emerald-500/5',
                        },
                        {
                            icon: <Target size={16} className="text-orange-400" />,
                            label: 'Maior ADR',
                            value: bestAdr?.mapName || '—',
                            sub: `${bestAdr?.avgAdr || 0} ADR médio`,
                            accent: 'border-orange-500/20 bg-orange-500/5',
                        },
                    ].map((card, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.07 }}
                            className={`relative rounded-2xl border p-4 flex flex-col gap-1 overflow-hidden ${card.accent}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                {card.icon}
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{card.label}</span>
                            </div>
                            <span className="text-2xl font-black italic tracking-tighter text-white">{card.value}</span>
                            <span className="text-[10px] text-zinc-600">{card.sub}</span>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Sort Options */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-zinc-600">
                    <SortAsc size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Ordenar</span>
                </div>
                {SORT_OPTIONS.map(opt => (
                    <button
                        key={opt.key}
                        onClick={() => setSortKey(opt.key)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                            sortKey === opt.key
                                ? 'bg-blue-500 text-white border-blue-500 shadow-[0_0_10px_rgba(96,165,250,0.3)]'
                                : 'bg-white/[0.03] text-zinc-500 border-white/[0.05] hover:border-white/[0.1] hover:text-zinc-300'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Map Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[0,1,2,3,4,5,6,7].map(i => (
                        <div key={i} className="h-64 bg-zinc-900/50 rounded-3xl border border-white/5 animate-pulse" />
                    ))}
                </div>
            ) : sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Map className="w-12 h-12 text-zinc-800" />
                    <p className="text-zinc-600 font-black uppercase text-[10px] tracking-widest">Nenhuma partida registrada ainda</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sorted.map((map, idx) => {
                        const isFirst = idx === 0;
                        const winColor = map.winRate >= 60 ? '#10b981' : map.winRate >= 50 ? '#3b82f6' : '#ef4444';
                        return (
                            <motion.div
                                key={map.mapName}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => setSelected(map)}
                                className={`relative rounded-3xl overflow-hidden border cursor-pointer transition-all group
                                    hover:scale-[1.02] hover:shadow-2xl
                                    ${selected?.mapName === map.mapName ? 'border-blue-500/60 shadow-[0_0_20px_rgba(96,165,250,0.2)]' : 'border-white/[0.07]'}
                                `}
                            >
                                {/* Map Image */}
                                <div className="relative h-40 overflow-hidden">
                                    <img
                                        src={map.image}
                                        alt={map.mapName}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/img/maps/Mirage.webp'; }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                                    {/* Rank badge */}
                                    <div className="absolute top-3 left-3">
                                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg tracking-widest
                                            ${isFirst ? 'bg-blue-500 text-white' : 'bg-black/60 text-zinc-400'}
                                        `}>
                                            #{idx + 1} {isFirst ? '⭐ Favorito' : ''}
                                        </span>
                                    </div>

                                    {/* Win Rate badge */}
                                    <div className="absolute top-3 right-3">
                                        <span
                                            className="text-[9px] font-black uppercase px-2 py-1 rounded-lg tracking-widest"
                                            style={{ background: `${winColor}30`, color: winColor, border: `1px solid ${winColor}40` }}
                                        >
                                            {map.winRate}% WR
                                        </span>
                                    </div>

                                    {/* Map name overlay */}
                                    <div className="absolute bottom-3 left-4">
                                        <h3 className="text-lg font-black italic uppercase tracking-tight text-white drop-shadow-lg">
                                            {map.mapName}
                                        </h3>
                                        <p className="text-[9px] text-zinc-400 font-bold flex items-center gap-1">
                                            <Clock size={9} /> {timeAgo(map.lastPlayed)}
                                        </p>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="bg-zinc-950/90 p-4 grid grid-cols-3 gap-3">
                                    <div className="text-center">
                                        <p className="text-[8px] text-zinc-600 uppercase font-black tracking-wider mb-0.5">Partidas</p>
                                        <p className="text-sm font-black text-zinc-200">{map.total}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] text-zinc-600 uppercase font-black tracking-wider mb-0.5">ADR</p>
                                        <p className="text-sm font-black text-zinc-200">{map.avgAdr || '—'}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] text-zinc-600 uppercase font-black tracking-wider mb-0.5">KDR</p>
                                        <p className="text-sm font-black text-zinc-200">{map.kdr > 0 ? map.kdr.toFixed(2) : '—'}</p>
                                    </div>
                                </div>

                                {/* Win/Loss bar */}
                                <div className="h-1 w-full bg-red-500/30">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${map.winRate}%` }}
                                        transition={{ delay: 0.3 + idx * 0.05, duration: 0.8, ease: 'easeOut' }}
                                        className="h-full"
                                        style={{ background: winColor }}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Detail Panel — aparece ao clicar num mapa */}
            {selected && !loading && (
                <motion.div
                    key={selected.mapName}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-950/60 border border-white/[0.07] rounded-3xl overflow-hidden backdrop-blur-xl"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3">
                        {/* Image */}
                        <div className="relative h-48 md:h-full min-h-48">
                            <img
                                src={selected.image}
                                alt={selected.mapName}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/img/maps/Mirage.webp'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-950/80" />
                        </div>

                        {/* Stats Detail */}
                        <div className="md:col-span-2 p-8 flex flex-col justify-center gap-6">
                            <div>
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">{selected.mapName}</h2>
                                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mt-1">Análise detalhada</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Partidas',  value: selected.total,                    icon: <BarChart3 size={14} className="text-blue-400" /> },
                                    { label: 'Vitórias',  value: `${selected.winRate}%`,           icon: <Trophy size={14} className="text-emerald-400" /> },
                                    { label: 'ADR Médio', value: selected.avgAdr || '—',            icon: <Target size={14} className="text-orange-400" /> },
                                    { label: 'KDR',       value: selected.kdr > 0 ? selected.kdr.toFixed(2) : '—', icon: <Crosshair size={14} className="text-red-400" /> },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            {stat.icon}
                                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{stat.label}</span>
                                        </div>
                                        <p className="text-2xl font-black italic tracking-tighter text-white">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* W/L breakdown */}
                            <div>
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">
                                    <span className="text-emerald-400">V {selected.wins}</span>
                                    <span>Vitórias / Derrotas</span>
                                    <span className="text-red-400">D {selected.losses}</span>
                                </div>
                                <div className="h-2 rounded-full bg-red-500/30 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${selected.winRate}%` }}
                                        transition={{ duration: 0.8 }}
                                        className="h-full rounded-full bg-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
