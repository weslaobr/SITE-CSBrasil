"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, Trophy, Target, TrendingUp, Crosshair, Clock, BarChart3, SortAsc, ChevronRight, Info } from "lucide-react";

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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    return (
        <div className="relative min-h-screen bg-[#050505] text-zinc-100 overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#f6cb0215,transparent_50%)]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f6cb0230] to-transparent" />
            </div>

            <div className="relative z-10 p-4 md:p-8 space-y-12 max-w-7xl mx-auto pb-32">
                {/* Header */}
                <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="flex items-center gap-3"
                        >
                            <div className="p-2 bg-[#f6cb02]/10 rounded-lg border border-[#f6cb02]/20 shadow-[0_0_15px_rgba(246,203,2,0.1)]">
                                <Map className="text-[#f6cb02] w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#f6cb02]/80">Map Performance Center</span>
                        </motion.div>
                        
                        <motion.h1 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none"
                        >
                            <span className="text-white drop-shadow-2xl">Estatísticas de</span><br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f6cb02] via-[#ffeb85] to-[#f6cb02] animate-gradient-x">Campo</span>
                        </motion.h1>
                    </div>

                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col items-end"
                    >
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 backdrop-blur-md">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total Analisado</p>
                            <p className="text-3xl font-black italic tracking-tighter text-[#f6cb02]">
                                {totalMatches} <span className="text-zinc-500 text-sm not-italic uppercase">Partidas</span>
                            </p>
                        </div>
                    </motion.div>
                </header>

                {/* Highlight Cards */}
                {!loading && maps.length > 0 && (
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                        {[
                            {
                                icon: <BarChart3 className="text-[#f6cb02]" />,
                                label: 'Preferência da Tropa',
                                title: 'Mapa Favorito',
                                value: mostPlayed?.mapName || '—',
                                sub: `${mostPlayed?.total || 0} partidas registradas`,
                                color: '#f6cb02'
                            },
                            {
                                icon: <Trophy className="text-emerald-400" />,
                                label: 'Domínio Estratégico',
                                title: 'Melhor Win Rate',
                                value: bestWinRate?.mapName || '—',
                                sub: `${bestWinRate?.winRate || 0}% de vitórias`,
                                color: '#10b981'
                            },
                            {
                                icon: <Target className="text-orange-400" />,
                                label: 'Poder de Fogo',
                                title: 'Maior ADR',
                                value: bestAdr?.mapName || '—',
                                sub: `${bestAdr?.avgAdr || 0} ADR médio global`,
                                color: '#fb923c'
                            },
                        ].map((card, i) => (
                            <motion.div
                                key={i}
                                variants={itemVariants}
                                whileHover={{ y: -5 }}
                                className="group relative bg-zinc-900/40 border border-white/5 rounded-3xl p-6 overflow-hidden backdrop-blur-sm"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                    {card.icon}
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: card.color }} />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{card.label}</span>
                                </div>
                                <h3 className="text-zinc-400 text-xs font-bold uppercase mb-1">{card.title}</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black italic tracking-tighter text-white uppercase">{card.value}</span>
                                </div>
                                <p className="text-[10px] text-zinc-600 mt-2 font-medium uppercase tracking-wider">{card.sub}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* Main Content Area */}
                <div className="space-y-8">
                    {/* Controls */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#f6cb02]/10 flex items-center justify-center border border-[#f6cb02]/20">
                                <SortAsc size={14} className="text-[#f6cb02]" />
                            </div>
                            <h2 className="text-lg font-black italic uppercase tracking-tight">Arsenal de Mapas</h2>
                        </div>

                        <div className="flex items-center gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-xl backdrop-blur-md">
                            {SORT_OPTIONS.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => setSortKey(opt.key)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                        sortKey === opt.key
                                            ? 'bg-[#f6cb02] text-black shadow-[0_0_15px_rgba(246,203,2,0.3)]'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[0,1,2,3,4,5,6,7].map(i => (
                                <div key={i} className="h-72 bg-white/[0.02] rounded-[2rem] border border-white/5 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        >
                            <AnimatePresence mode="popLayout">
                                {sorted.map((map, idx) => {
                                    const winColor = map.winRate >= 60 ? '#10b981' : map.winRate >= 50 ? '#f6cb02' : '#ef4444';
                                    const isSelected = selected?.mapName === map.mapName;

                                    return (
                                        <motion.div
                                            key={map.mapName}
                                            layout
                                            variants={itemVariants}
                                            whileHover={{ y: -8, scale: 1.02 }}
                                            onClick={() => setSelected(map)}
                                            className={`group relative rounded-[2rem] overflow-hidden border cursor-pointer transition-all duration-500
                                                ${isSelected ? 'border-[#f6cb02] ring-4 ring-[#f6cb02]/10 bg-zinc-900/80 shadow-[0_0_40px_rgba(246,203,2,0.15)]' : 'border-white/5 bg-zinc-950/40 hover:bg-zinc-900/60 hover:border-white/10'}
                                            `}
                                        >
                                            {/* Image & Overlays */}
                                            <div className="relative h-44 overflow-hidden">
                                                <motion.img
                                                    src={map.image}
                                                    alt={map.mapName}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/img/maps/Mirage.webp'; }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
                                                
                                                {/* Rank/Badge */}
                                                <div className="absolute top-4 left-4">
                                                    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-[0.2em] backdrop-blur-md border 
                                                        ${idx === 0 ? 'bg-[#f6cb02] text-black border-[#f6cb02]' : 'bg-black/40 text-zinc-300 border-white/10'}
                                                    `}>
                                                        #{idx + 1} {idx === 0 && 'Favorito'}
                                                    </span>
                                                </div>

                                                <div className="absolute top-4 right-4">
                                                    <div className="w-10 h-10 rounded-full bg-black/60 border border-white/10 backdrop-blur-md flex items-center justify-center">
                                                        <span className="text-[10px] font-black italic" style={{ color: winColor }}>{map.winRate}%</span>
                                                    </div>
                                                </div>

                                                <div className="absolute bottom-4 left-6">
                                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">{map.mapName}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Clock size={10} className="text-zinc-500" />
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{timeAgo(map.lastPlayed)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stats Row */}
                                            <div className="px-6 py-5 grid grid-cols-3 gap-4 border-t border-white/5">
                                                {[
                                                    { label: 'Plays', val: map.total },
                                                    { label: 'ADR',   val: map.avgAdr || '—' },
                                                    { label: 'KDR',   val: map.kdr > 0 ? map.kdr.toFixed(2) : '—' },
                                                ].map((s, i) => (
                                                    <div key={i}>
                                                        <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest mb-0.5">{s.label}</p>
                                                        <p className="text-sm font-black text-zinc-200">{s.val}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Win/Loss Bar */}
                                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-red-500/10">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${map.winRate}%` }}
                                                    className="h-full relative"
                                                    style={{ backgroundColor: winColor }}
                                                >
                                                    <div className="absolute inset-0 bg-white/20 blur-[2px]" />
                                                </motion.div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>

                {/* Detailed Analysis Section */}
                <AnimatePresence>
                    {selected && !loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="mt-16 relative group"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#f6cb02] to-orange-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000" />
                            <div className="relative bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                <div className="grid grid-cols-1 lg:grid-cols-2">
                                    {/* Left: Map Preview */}
                                    <div className="relative h-64 lg:h-auto min-h-[400px] overflow-hidden">
                                        <img
                                            src={selected.image}
                                            alt={selected.mapName}
                                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/img/maps/Mirage.webp'; }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]/30" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                                        
                                        <div className="absolute bottom-8 left-8">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="px-3 py-1 bg-[#f6cb02] text-black text-[10px] font-black uppercase rounded-lg italic">Relatório de Missão</div>
                                                <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                                    <Clock size={10} /> {timeAgo(selected.lastPlayed)}
                                                </span>
                                            </div>
                                            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none mb-2">{selected.mapName}</h2>
                                            <p className="text-zinc-500 text-xs font-medium uppercase tracking-[0.3em]">Sector {selected.mapName.toUpperCase()} Analyzed</p>
                                        </div>
                                    </div>

                                    {/* Right: Data Display */}
                                    <div className="p-8 lg:p-12 flex flex-col justify-between space-y-10">
                                        <div className="grid grid-cols-2 gap-6">
                                            {[
                                                { label: 'Partidas Totais', val: selected.total, icon: <BarChart3 className="text-[#f6cb02]" />, color: '#f6cb02' },
                                                { label: 'Taxa de Vitória', val: `${selected.winRate}%`, icon: <Trophy className="text-emerald-400" />, color: '#10b981' },
                                                { label: 'Dano Médio (ADR)', val: selected.avgAdr || '—', icon: <Target className="text-orange-400" />, color: '#fb923c' },
                                                { label: 'Eficiência (KDR)', val: selected.kdr > 0 ? selected.kdr.toFixed(2) : '—', icon: <Crosshair className="text-red-400" />, color: '#ef4444' },
                                            ].map((stat, i) => (
                                                <div key={i} className="relative p-6 bg-white/[0.02] border border-white/5 rounded-3xl group/stat hover:bg-white/[0.04] transition-colors overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/stat:opacity-20 transition-opacity">
                                                        {stat.icon}
                                                    </div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">{stat.label}</p>
                                                    <p className="text-3xl font-black italic tracking-tighter text-white">{stat.val}</p>
                                                    <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-transparent to-transparent group-hover/stat:via-[#f6cb02] transition-all duration-500 w-full" />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Distribuição de Resultados</h4>
                                                    <p className="text-xs text-zinc-400 mt-1">Eficiência tática nos últimos confrontos</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-emerald-400 font-black italic text-sm">{selected.wins}W</span>
                                                    <span className="text-zinc-700 mx-2">/</span>
                                                    <span className="text-red-400 font-black italic text-sm">{selected.losses}L</span>
                                                </div>
                                            </div>
                                            <div className="h-4 rounded-full bg-zinc-900 border border-white/5 overflow-hidden p-1">
                                                <div className="h-full rounded-full flex gap-1">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${selected.winRate}%` }}
                                                        transition={{ duration: 1, ease: "circOut" }}
                                                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                                                    />
                                                    <div className="flex-1 bg-red-500/20 rounded-full" />
                                                </div>
                                            </div>
                                            <div className="flex justify-between text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">
                                                <span>Sucesso Tático</span>
                                                <span>Área de Risco</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Nav Hint (if on mobile) */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
                    <Info size={14} className="text-[#f6cb02]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Toque nos cards para detalhes</span>
                </div>
            </div>
        </div>
    );
}
