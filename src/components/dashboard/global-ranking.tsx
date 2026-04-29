"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Search, Trophy, Crown,
    Star, ExternalLink, Shield, Users, Zap, Target, Crosshair,
    SortAsc, Filter, TrendingUp, Flame
} from 'lucide-react';

interface RankUser {
    rank: number;
    steamId: string;
    nickname: string;
    avatar: string;
    rating: number;
    winRate: string;
    adr: number;
    hsPercentage: number;
    kdr: number;
    matchesPlayed: number;
    trend: 'up' | 'down' | 'neutral';
    gcLevel: number;
    faceitLevel: number;
    faceitElo: number;
    hasSync?: boolean;
    mixMatches?: number;
    rankingPoints?: number;
    mixLevel?: number;
    stats?: {
        [key in PlatformFilter]: {
            matchesPlayed: number;
            kdr: number;
            adr: number;
            hsPercentage: number;
            winRate: string;
        }
    };
}

interface CommunityStats {
    totalPlayers: number;
    avgRating: number;
    topRating: number;
    topPlayer: string;
    mostActiveName: string;
    mostActiveMatches: number;
}

type SortKey = 'rating' | 'kdr' | 'adr' | 'hsPercentage' | 'faceitElo' | 'gcLevel' | 'matchesPlayed' | 'rankingPoints' | 'mixLevel';
type PlatformFilter = 'all' | 'premier' | 'faceit' | 'gc' | 'mix';

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
    { key: 'rating',       label: 'SR Premier',  icon: <Trophy size={11} /> },
    { key: 'faceitElo',    label: 'Faceit ELO',  icon: <Star size={11} /> },
    { key: 'gcLevel',      label: 'GC Level',    icon: <Shield size={11} /> },
    { key: 'kdr',          label: 'KDR',         icon: <Crosshair size={11} /> },
    { key: 'adr',          label: 'ADR',         icon: <Target size={11} /> },
    { key: 'hsPercentage', label: 'Headshot %',  icon: <Flame size={11} /> },
    { key: 'matchesPlayed',label: 'Partidas',    icon: <Zap size={11} /> },
    { key: 'rankingPoints', label: 'Tropoints',   icon: <Flame size={11} className="text-amber-500" /> },
    { key: 'mixLevel',      label: 'Nível Mix',  icon: <Trophy size={11} className="text-amber-500" /> },
    { key: 'winRate' as any, label: 'Win Rate',    icon: <TrendingUp size={11} /> },
];

const PLATFORM_FILTERS: { key: PlatformFilter; label: string }[] = [
    { key: 'all',     label: 'Todos' },
    { key: 'premier', label: 'Premier' },
    { key: 'faceit',  label: 'Faceit' },
    { key: 'gc',      label: 'GC' },
    { key: 'mix',     label: 'Mix (Tropoints)' },
];

const PODIUM_CONFIG = [
    {
        pos: 0, label: '1º', crown: true, size: 'w-24 h-24',
        borderColor: 'border-yellow-500',
        cardBg: 'from-yellow-500/15 to-yellow-500/5',
        cardBorder: 'border-yellow-500/30',
        glow: 'shadow-[0_0_60px_rgba(246,203,2,0.2)]',
        glowRing: 'shadow-[0_0_0_3px_rgba(246,203,2,0.3)]',
        textColor: 'text-yellow-400',
        badgeBg: 'bg-yellow-500', badgeText: 'text-black',
        order: 'md:order-2', scale: 'md:scale-110', zIndex: 'z-10',
    },
    {
        pos: 1, label: '2º', crown: false, size: 'w-20 h-20',
        borderColor: 'border-zinc-400',
        cardBg: 'from-zinc-500/10 to-zinc-500/5',
        cardBorder: 'border-zinc-500/20',
        glow: 'shadow-[0_0_40px_rgba(160,160,160,0.1)]',
        glowRing: 'shadow-[0_0_0_2px_rgba(160,160,160,0.2)]',
        textColor: 'text-zinc-300',
        badgeBg: 'bg-zinc-400', badgeText: 'text-black',
        order: 'md:order-1', scale: '', zIndex: 'z-0',
    },
    {
        pos: 2, label: '3º', crown: false, size: 'w-20 h-20',
        borderColor: 'border-amber-700',
        cardBg: 'from-amber-700/10 to-amber-700/5',
        cardBorder: 'border-amber-700/20',
        glow: 'shadow-[0_0_40px_rgba(180,100,20,0.1)]',
        glowRing: '',
        textColor: 'text-amber-600',
        badgeBg: 'bg-amber-700', badgeText: 'text-white',
        order: 'md:order-3', scale: '', zIndex: 'z-0',
    },
];

// ── CS2 PREMIER TIER SYSTEM ─────────────────────────────────────────────────
const PREMIER_TIERS = [
    {
        name: 'Gray',
        min: 0, max: 4999,
        color: '#8a9ba8',
        text: 'text-[#8a9ba8]',
        bar: 'bg-[#8a9ba8]',
        glow: 'shadow-[0_0_12px_rgba(138,155,168,0.4)]',
        border: 'border-[#8a9ba8]/40',
        bg: 'bg-[#8a9ba8]/10',
        badge: 'bg-[#8a9ba8]/20 text-[#8a9ba8] border-[#8a9ba8]/30',
        shimmer: 'from-[#8a9ba8]/20',
    },
    {
        name: 'Light Blue',
        min: 5000, max: 9999,
        color: '#4fc3f7',
        text: 'text-[#4fc3f7]',
        bar: 'bg-[#4fc3f7]',
        glow: 'shadow-[0_0_12px_rgba(79,195,247,0.5)]',
        border: 'border-[#4fc3f7]/40',
        bg: 'bg-[#4fc3f7]/10',
        badge: 'bg-[#4fc3f7]/20 text-[#4fc3f7] border-[#4fc3f7]/30',
        shimmer: 'from-[#4fc3f7]/20',
    },
    {
        name: 'Blue',
        min: 10000, max: 14999,
        color: '#2962ff',
        text: 'text-[#6b8fff]',
        bar: 'bg-[#2962ff]',
        glow: 'shadow-[0_0_14px_rgba(41,98,255,0.5)]',
        border: 'border-[#2962ff]/40',
        bg: 'bg-[#2962ff]/10',
        badge: 'bg-[#2962ff]/20 text-[#6b8fff] border-[#2962ff]/30',
        shimmer: 'from-[#2962ff]/20',
    },
    {
        name: 'Purple',
        min: 15000, max: 19999,
        color: '#9c27b0',
        text: 'text-[#ce93d8]',
        bar: 'bg-[#9c27b0]',
        glow: 'shadow-[0_0_14px_rgba(156,39,176,0.5)]',
        border: 'border-[#9c27b0]/40',
        bg: 'bg-[#9c27b0]/10',
        badge: 'bg-[#9c27b0]/20 text-[#ce93d8] border-[#9c27b0]/30',
        shimmer: 'from-[#9c27b0]/20',
    },
    {
        name: 'Pink',
        min: 20000, max: 24999,
        color: '#e91e8c',
        text: 'text-[#f06292]',
        bar: 'bg-[#e91e8c]',
        glow: 'shadow-[0_0_16px_rgba(233,30,140,0.5)]',
        border: 'border-[#e91e8c]/40',
        bg: 'bg-[#e91e8c]/10',
        badge: 'bg-[#e91e8c]/20 text-[#f06292] border-[#e91e8c]/30',
        shimmer: 'from-[#e91e8c]/20',
    },
    {
        name: 'Red',
        min: 25000, max: 29999,
        color: '#d32f2f',
        text: 'text-[#d32f2f]',
        bar: 'bg-[#d32f2f]',
        glow: 'shadow-[0_0_16px_rgba(211,47,47,0.5)]',
        border: 'border-[#d32f2f]/40',
        bg: 'bg-[#d32f2f]/10',
        badge: 'bg-[#d32f2f]/20 text-[#d32f2f] border-[#d32f2f]/30',
        shimmer: 'from-[#d32f2f]/20',
    },
    {
        name: 'Gold',
        min: 30000, max: Infinity,
        color: '#f5c518',
        text: 'text-[#f5c518]',
        bar: 'bg-gradient-to-r from-[#f5c518] to-[#ff9800] shadow-[0_0_16px_rgba(245,197,24,0.7)]',
        glow: 'shadow-[0_0_24px_rgba(245,197,24,0.6)]',
        border: 'border-[#f5c518]/50',
        bg: 'bg-[#f5c518]/10',
        badge: 'bg-[#f5c518]/20 text-[#f5c518] border-[#f5c518]/40',
        shimmer: 'from-[#f5c518]/25',
    },
] as const;

function getPremierTier(rating: number) {
    if (rating <= 0) return PREMIER_TIERS[0];
    return PREMIER_TIERS.find(t => rating >= t.min && rating <= t.max) ?? PREMIER_TIERS[PREMIER_TIERS.length - 1];
}

// Legacy helper (kept for sortKey bars outside of premier)
function getRatingTierColor(rating: number) {
    const tier = getPremierTier(rating);
    return { bar: tier.bar, text: tier.text, glow: tier.glow };
}

function PremierBadge({ rating, size = 'sm' }: { rating: number; size?: 'xs' | 'sm' | 'lg' }) {
    if (rating <= 0) return null;
    const tier = getPremierTier(rating);
    const sizeClass = size === 'xs'
        ? 'text-[8px] px-1.5 py-px'
        : size === 'lg'
        ? 'text-[11px] px-3 py-1'
        : 'text-[9px] px-2 py-0.5';
    return (
        <span
            className={`inline-flex items-center gap-1 font-black uppercase tracking-widest rounded-md border ${tier.badge} ${sizeClass}`}
            style={{ textShadow: `0 0 8px ${tier.color}60` }}
        >
            <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: tier.color, boxShadow: `0 0 4px ${tier.color}` }}
            />
            {tier.name}
        </span>
    );
}

function AnimatedNumber({ value, duration = 1.2 }: { value: number; duration?: number }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const end = value || 0;
        if (end === 0) {
            setDisplay(0);
            return;
        }
        let start = 0;
        const step = end / (duration * 60);
        const timer = setInterval(() => {
            start += step;
            if (start >= end) {
                setDisplay(end);
                clearInterval(timer);
            } else {
                setDisplay(Math.floor(start));
            }
        }, 1000 / 60);
        return () => clearInterval(timer);
    }, [value, duration]);
    return <>{display.toLocaleString()}</>;
}

const GlobalRanking: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<RankUser[]>([]);
    const [community, setCommunity] = useState<CommunityStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [sortKey, setSortKey] = useState<SortKey>('rating');
    const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
    const [syncingSteamId, setSyncingSteamId] = useState<string | null>(null);

    const maxRating = users.length > 0 ? Math.max(...users.map(u => u.rating)) : 30000;

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                const res = await fetch('/api/ranking');
                const data = await res.json();
                if (data.players && Array.isArray(data.players)) {
                    setUsers(data.players);
                    setCommunity(data.community || null);
                } else if (Array.isArray(data)) {
                    // Fallback legado
                    setUsers(data);
                }
            } catch (error) {
                console.error("Failed to fetch rankings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRankings();
    }, []);

    const handleSyncPlayer = async (e: React.MouseEvent, steamId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (syncingSteamId) return;

        setSyncingSteamId(steamId);
        try {
            const res = await fetch('/api/sync/player', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ steamId })
            });
            const data = await res.json();
            if (data.success) {
                // Refresh data
                const refreshRes = await fetch('/api/ranking');
                const refreshData = await refreshRes.json();
                if (refreshData.players) setUsers(refreshData.players);
                alert(`Sincronizado com sucesso! ${data.count} novas partidas processadas.`);
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (error) {
            console.error("Sync error:", error);
            alert("Erro ao sincronizar jogador.");
        } finally {
            setSyncingSteamId(null);
        }
    };

    const filteredAndSorted = useMemo(() => {
        let result = users.filter(user =>
            user.nickname.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Se o filtro for mix/faceit/gc/premier, filtramos quem tem pelo menos 1 partida nessa plataforma
        if (platformFilter !== 'all') {
            result = result.filter(u => (u.stats?.[platformFilter]?.matchesPlayed || 0) > 0);
        }

        return [...result].sort((a, b) => {
            const getVal = (u: RankUser) => {
                const s = platformFilter !== 'all' ? (u.stats?.[platformFilter] || u) : u;
                let v = (s as any)[sortKey] ?? (u as any)[sortKey] ?? 0;
                if (sortKey === 'winRate' as any) {
                    v = parseInt(String(v || '0').replace('%', ''));
                    if (isNaN(v)) v = 0;
                }
                return typeof v === 'number' ? v : 0;
            };
            const valB = getVal(b);
            const valA = getVal(a);
            return valB - valA;
        });
    }, [users, searchTerm, sortKey, platformFilter]);

    const top3 = filteredAndSorted.slice(0, 3);
    const rest = filteredAndSorted.slice(3);

    return (
        <div className="space-y-8">

            {/* ── COMMUNITY STATS ─────────────────────────────────────────── */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[0,1,2,3].map(i => (
                        <div key={i} className="h-24 bg-zinc-900/50 rounded-2xl border border-white/5 animate-pulse" />
                    ))}
                </div>
            ) : community && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3"
                >
                    {[
                        {
                            icon: <Users size={16} className="text-yellow-500" />,
                            label: 'Jogadores',
                            value: community.totalPlayers.toLocaleString(),
                            sub: 'no ranking',
                            accent: 'border-yellow-500/20 bg-yellow-500/5',
                        },
                        {
                            icon: <TrendingUp size={16} className="text-sky-400" />,
                            label: 'SR Médio',
                            value: community.avgRating.toLocaleString(),
                            sub: 'da tropa',
                            accent: 'border-sky-500/20 bg-sky-500/5',
                        },
                        {
                            icon: <Crown size={16} className="text-yellow-500" />,
                            label: 'Maior SR',
                            value: community.topRating.toLocaleString(),
                            sub: community.topPlayer,
                            accent: 'border-yellow-500/20 bg-yellow-500/5',
                        },
                        {
                            icon: <Zap size={16} className="text-emerald-400" />,
                            label: 'Mais Ativo',
                            value: `${community.mostActiveMatches}`,
                            sub: community.mostActiveName || 'partidas',
                            accent: 'border-emerald-500/20 bg-emerald-500/5',
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
                            <span className="text-[10px] text-zinc-600 truncate">{card.sub}</span>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* ── PÓDIO ──────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-3 px-4">
                {loading ? (
                    [0, 1, 2].map(i => (
                        <div key={i} className="flex-1 max-w-xs h-56 bg-zinc-900/50 rounded-3xl border border-white/5 animate-pulse" />
                    ))
                ) : top3.length === 0 ? (
                    <div className="text-zinc-600 font-black uppercase tracking-widest text-sm py-16">
                        Nenhum jogador no ranking ainda.
                    </div>
                ) : (
                    PODIUM_CONFIG.slice(0, top3.length).map((cfg) => {
                        const user = top3[cfg.pos];
                        if (!user) return null;
                        const podiumTier = getPremierTier(user.rating);
                        return (
                            <motion.div
                                key={user.steamId}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: cfg.pos * 0.12, type: 'spring', stiffness: 100 }}
                                className={`flex-1 max-w-sm relative rounded-3xl p-6 flex flex-col items-center text-center ${cfg.order} ${cfg.scale} transition-transform`}
                                style={{
                                    background: `linear-gradient(to bottom, ${podiumTier.color}18, ${podiumTier.color}06)`,
                                    border: `1px solid ${podiumTier.color}40`,
                                    boxShadow: `0 0 ${cfg.pos === 0 ? 60 : 30}px ${podiumTier.color}25`,
                                }}
                            >
                                {/* Badge posição */}
                                <div
                                    className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg"
                                    style={{ background: podiumTier.color, color: '#000', boxShadow: `0 0 10px ${podiumTier.color}80` }}
                                >
                                    {cfg.pos === 0 ? <Crown size={14} /> : cfg.label}
                                </div>

                                {cfg.crown && (
                                    <div className="mb-1">
                                        <Crown className="w-6 h-6" style={{ color: podiumTier.color, filter: `drop-shadow(0 0 8px ${podiumTier.color})` }} />
                                    </div>
                                )}

                                {/* Avatar */}
                                <div className={`relative mb-4 ${cfg.crown ? 'mt-0' : 'mt-4'}`}>
                                    <img
                                        src={user.avatar}
                                        className={`${cfg.size} rounded-full object-cover transition-all`}
                                        style={{
                                            border: `2px solid ${podiumTier.color}`,
                                            boxShadow: cfg.pos === 0 ? `0 0 0 3px ${podiumTier.color}40, 0 0 20px ${podiumTier.color}30` : `0 0 0 2px ${podiumTier.color}30`,
                                        }}
                                        alt={user.nickname}
                                    />
                                    {cfg.crown && (
                                        <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: `${podiumTier.color}15` }} />
                                    )}
                                </div>

                                {/* Nome */}
                                <Link href={`/player/${user.steamId}`} className="group">
                                    <h3
                                        className="text-base font-black italic uppercase tracking-tight group-hover:underline truncate max-w-[180px]"
                                        style={{ color: podiumTier.color }}
                                    >
                                        {user.nickname}
                                    </h3>
                                </Link>

                                {/* Rating animado + badge tier */}
                                <div className="mt-3 flex flex-col items-center gap-2">
                                    <span
                                        className="text-3xl font-black italic tracking-tighter"
                                        style={{ color: podiumTier.color, textShadow: `0 0 20px ${podiumTier.color}80` }}
                                    >
                                        <AnimatedNumber value={sortKey === 'rankingPoints' ? (user.rankingPoints || 0) : sortKey === 'mixLevel' ? (user.mixLevel || 0) : user.rating} />
                                    </span>
                                    {sortKey === 'rankingPoints' ? (
                                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">Tropoints</span>
                                    ) : sortKey === 'mixLevel' ? (
                                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">Nível Mix</span>
                                    ) : (
                                        <PremierBadge rating={user.rating} size="sm" />
                                    )}
                                </div>

                                {/* Mini-stats do pódio */}
                                <div className="grid grid-cols-3 gap-2 mt-4 w-full">
                                    <div className="flex flex-col items-center rounded-xl p-2" style={{ background: `${podiumTier.color}12` }}>
                                        <span className="text-[9px] text-zinc-600 uppercase font-black tracking-wider">Partidas</span>
                                        <span className="text-sm font-black text-zinc-300">{user.matchesPlayed || '—'}</span>
                                    </div>
                                    <div className="flex flex-col items-center rounded-xl p-2" style={{ background: `${podiumTier.color}12` }}>
                                        <span className="text-[9px] text-zinc-600 uppercase font-black tracking-wider">KDR</span>
                                        <span className="text-sm font-black text-zinc-300">{user.kdr > 0 ? user.kdr.toFixed(2) : '—'}</span>
                                    </div>
                                    <div className="flex flex-col items-center rounded-xl p-2" style={{ background: `${podiumTier.color}12` }}>
                                        <span className="text-[9px] text-zinc-600 uppercase font-black tracking-wider">ADR</span>
                                        <span className="text-sm font-black text-zinc-300">{user.adr > 0 ? user.adr : '—'}</span>
                                    </div>
                                </div>

                                {/* Badges GC / Faceit */}
                                <div className="flex gap-2 mt-3">
                                    {user.gcLevel > 0 && (
                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 tracking-widest">
                                            GC {user.gcLevel}
                                        </span>
                                    )}
                                    {user.faceitLevel > 0 && (
                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20">
                                            <img 
                                                src={`/img/icone-faceit-level-${String(user.faceitLevel).padStart(2, '0')}.png`}
                                                className="w-3 h-3 object-contain"
                                                alt=""
                                            />
                                            <span className="text-[8px] font-black uppercase text-orange-400 tracking-widest">
                                                {user.faceitElo > 0 ? user.faceitElo.toLocaleString('pt-BR') : `LVL ${user.faceitLevel}`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* ── CONTROLES: BUSCA + SORT + FILTRO ───────────────────────── */}
            <div className="flex flex-col gap-3">
                {/* Linha 1: busca + contador */}
                <div className="flex items-center justify-between gap-4">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input
                            type="text"
                            placeholder="Buscar jogador..."
                            className="w-full bg-zinc-950/70 border border-white/[0.07] rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-yellow-500/40 placeholder:text-zinc-700 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">
                        {filteredAndSorted.length} jogadores
                    </span>
                </div>

                {/* Linha 2: Ordenação */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-zinc-700">
                        <SortAsc size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Ordenar</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                        {SORT_OPTIONS.map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setSortKey(opt.key)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                                    sortKey === opt.key
                                        ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_10px_rgba(246,203,2,0.3)]'
                                        : 'bg-white/[0.03] text-zinc-500 border-white/[0.05] hover:border-white/[0.1] hover:text-zinc-300'
                                }`}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Linha 3: Filtro por plataforma */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-zinc-700">
                        <Filter size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Plataforma</span>
                    </div>
                    <div className="flex gap-1.5">
                        {PLATFORM_FILTERS.map(pf => (
                            <button
                                key={pf.key}
                                onClick={() => setPlatformFilter(pf.key)}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                                    platformFilter === pf.key
                                        ? 'bg-zinc-200 text-black border-zinc-200'
                                        : 'bg-white/[0.03] text-zinc-500 border-white/[0.05] hover:border-white/[0.1] hover:text-zinc-300'
                                }`}
                            >
                                {pf.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── TABELA ─────────────────────────────────────────────────── */}
            <div className="bg-zinc-950/60 border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl shadow-black/50 backdrop-blur-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-[9px] uppercase font-black text-zinc-600 tracking-[0.15em] border-b border-white/[0.05] bg-black/40 backdrop-blur-md">
                            <th className="px-5 py-3.5 w-16">#</th>
                            <th className="px-4 py-3.5">Jogador</th>
                            <th className="px-4 py-3.5">
                                {sortKey === 'faceitElo' ? 'Faceit ELO' : 
                                 sortKey === 'gcLevel' ? 'GC Level' : 
                                 sortKey === 'rankingPoints' ? 'Tropoints' :
                                 sortKey === 'mixLevel' ? 'Nível Mix' :
                                 'SR Premier'}
                            </th>
                            <th className="px-4 py-3.5 text-center hidden lg:table-cell">
                                {platformFilter === 'mix' ? 'Mixes' : 'Partidas'}
                            </th>
                            <th className="px-4 py-3.5 text-center hidden lg:table-cell">KDR</th>
                            <th className="px-4 py-3.5 text-center hidden md:table-cell">ADR</th>
                            <th className="px-4 py-3.5 text-center hidden md:table-cell">HS%</th>
                            <th className="px-4 py-3.5 text-center hidden md:table-cell">Mix LV</th>
                            <th className="px-4 py-3.5 text-center hidden md:table-cell">Tropoints</th>
                            <th className="px-4 py-3.5 text-right"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [1, 2, 3, 4, 5].map(i => (
                                <tr key={i} className="border-b border-white/[0.04] animate-pulse">
                                    <td colSpan={10} className="px-5 py-4">
                                        <div className="h-8 bg-white/[0.03] rounded-xl" />
                                    </td>
                                </tr>
                            ))
                        ) : filteredAndSorted.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Trophy className="w-10 h-10 text-zinc-800" />
                                        <span className="text-zinc-600 font-black uppercase text-[10px] tracking-widest">
                                            Nenhum jogador encontrado
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredAndSorted.map((user, idx) => {
                                const isTop1 = user.rank === 1;
                                const isTop3 = user.rank <= 3;
                                
                                // Dados dinâmicos baseados na plataforma
                                const pStats = user.stats?.[platformFilter] || {
                                    kdr: user.kdr,
                                    adr: user.adr,
                                    hsPercentage: user.hsPercentage,
                                    matchesPlayed: user.matchesPlayed,
                                    winRate: user.winRate
                                };

                                const sortVal = (pStats[sortKey as keyof typeof pStats] ?? user[sortKey as keyof typeof user]) as number;
                                const maxSortVal = Math.max(...filteredAndSorted.map(u => {
                                    const us = u.stats?.[platformFilter] || u;
                                    return (us[sortKey as keyof typeof us] ?? u[sortKey as keyof typeof u]) as number;
                                }));
                                
                                const pct = Math.min(maxSortVal > 0 ? (sortVal / maxSortVal) * 100 : 0, 100);
                                const tier = getPremierTier(user.rating);
                                const tierColor = getRatingTierColor(user.rating);

                                return (
                                    <motion.tr
                                        key={user.steamId}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.025, type: 'spring', stiffness: 200 }}
                                        className={`group border-b border-white/[0.04] transition-all cursor-pointer
                                            hover:bg-gradient-to-r hover:${tier.shimmer} hover:to-transparent
                                            ${isTop1 ? tier.bg : ''}
                                        `}
                                    >
                                        {/* Posição */}
                                        <td className="px-5 py-3.5">
                                            <div
                                                className="flex items-center justify-center w-8 h-8 rounded-xl text-[11px] font-black"
                                                style={user.rank <= 3 ? {
                                                    background: user.rank === 1 ? tier.color : user.rank === 2 ? '#9ca3af' : '#92400e',
                                                    color: '#000',
                                                    boxShadow: user.rank === 1 ? `0 0 12px ${tier.color}60` : 'none',
                                                } : { background: 'rgba(255,255,255,0.05)', color: '#71717a' }}
                                            >
                                                {idx === 0 && searchTerm === '' ? <Crown size={13} /> : (idx + 1) < 10 ? `0${idx + 1}` : (idx + 1)}
                                            </div>
                                        </td>

                                        {/* Jogador */}
                                        <td className="px-4 py-3.5">
                                            <Link href={`/player/${user.steamId}`} className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img
                                                        src={user.avatar}
                                                        className="w-9 h-9 rounded-full object-cover transition-all"
                                                        style={{
                                                            border: `2px solid ${isTop1 ? tier.color : isTop3 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
                                                            boxShadow: isTop1 ? `0 0 8px ${tier.color}60` : 'none',
                                                        }}
                                                        alt={user.nickname}
                                                    />
                                                    {isTop1 && (
                                                        <div
                                                            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                                                            style={{ background: tier.color, boxShadow: `0 0 6px ${tier.color}` }}
                                                        >
                                                            <Crown size={7} className="text-black" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span
                                                        className="font-black text-sm italic tracking-tight transition-colors truncate max-w-[140px]"
                                                        style={{ color: isTop1 ? tier.color : '#e4e4e7' }}
                                                    >
                                                        {user.nickname}
                                                    </span>
                                                    {pStats.winRate !== 'N/A' && (
                                                        <span className="text-[9px] text-zinc-600 font-bold">WR {pStats.winRate}</span>
                                                    )}
                                                </div>
                                            </Link>
                                        </td>

                                        {/* Rating / Sort value + barra de tier + badge */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="font-black text-base italic tracking-tighter"
                                                        style={{ color: tier.color, textShadow: `0 0 10px ${tier.color}60` }}
                                                    >
                                                        {sortKey === 'kdr' ? sortVal.toFixed(2) :
                                                         sortKey === 'hsPercentage' ? `${sortVal}%` :
                                                         sortKey === 'mixLevel' ? `LV ${sortVal}` :
                                                         sortVal.toLocaleString()}
                                                    </span>
                                                    {sortKey === 'rating' && user.rating > 0 && (
                                                        <span
                                                            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                                            style={{ background: tier.color, boxShadow: `0 0 4px ${tier.color}` }}
                                                        />
                                                    )}
                                                </div>
                                                {(sortKey === 'rating' || sortKey === 'rankingPoints') && (
                                                    <div className="w-20 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${pct}%` }}
                                                            transition={{ delay: 0.3 + idx * 0.02, duration: 0.6, ease: 'easeOut' }}
                                                            className={`h-full rounded-full ${sortKey === 'rankingPoints' ? 'bg-amber-500' : tierColor.bar}`}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                                            <span className="text-[11px] font-black text-zinc-400">
                                                {pStats.matchesPlayed > 0 ? pStats.matchesPlayed : <span className="text-zinc-800">—</span>}
                                            </span>
                                        </td>

                                        {/* KDR */}
                                        {/* KDR */}
                                        <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                                            <span className={`text-[11px] font-black ${
                                                pStats.kdr >= 1.5 ? 'text-emerald-400' :
                                                pStats.kdr >= 1.0 ? 'text-zinc-300' :
                                                pStats.kdr > 0 ? 'text-red-400' : 'text-zinc-800'
                                            }`}>
                                                {pStats.kdr > 0 ? pStats.kdr.toFixed(2) : '—'}
                                            </span>
                                        </td>
                                        
                                        {/* ADR */}
                                        <td className="px-4 py-3.5 text-center hidden md:table-cell">
                                            <span className={`text-[11px] font-black ${
                                                pStats.adr >= 90 ? 'text-emerald-400' :
                                                pStats.adr >= 70 ? 'text-zinc-300' :
                                                pStats.adr > 0 ? 'text-zinc-500' : 'text-zinc-800'
                                            }`}>
                                                {pStats.adr > 0 ? pStats.adr : '—'}
                                            </span>
                                        </td>
                                        
                                        {/* HS% */}
                                        <td className="px-4 py-3.5 text-center hidden md:table-cell">
                                            <span className={`text-[11px] font-black ${
                                                pStats.hsPercentage >= 60 ? 'text-orange-400' :
                                                pStats.hsPercentage >= 40 ? 'text-zinc-300' :
                                                pStats.hsPercentage > 0 ? 'text-zinc-500' : 'text-zinc-800'
                                            }`}>
                                                {pStats.hsPercentage > 0 ? `${pStats.hsPercentage}%` : '—'}
                                            </span>
                                        </td>

                                        {/* Mix Level */}
                                        <td className="px-4 py-3.5 text-center hidden md:table-cell">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[11px] font-black text-amber-500">
                                                    LV {user.mixLevel || 5}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Tropoints */}
                                        <td className="px-4 py-3.5 text-center hidden md:table-cell">
                                            <span className="text-[11px] font-black text-white">
                                                {(user.rankingPoints || 500).toLocaleString()}
                                            </span>
                                        </td>

                                        {/* Faceit */}
                                        <td className="px-4 py-3.5 text-center hidden md:table-cell">
                                            {user.faceitLevel > 0 ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <img 
                                                        src={`/img/icone-faceit-level-${String(user.faceitLevel).padStart(2, '0')}.png`}
                                                        className="w-5 h-5 object-contain"
                                                        alt={`Lvl ${user.faceitLevel}`}
                                                    />
                                                    {user.faceitElo > 0 && (
                                                        <span className="text-[11px] font-black text-white italic tracking-tighter">
                                                            {user.faceitElo.toLocaleString('pt-BR')}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : <span className="text-zinc-800">—</span>}
                                        </td>

                                        {/* Link & Sync */}
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {user.hasSync && (
                                                    <button
                                                        onClick={(e) => handleSyncPlayer(e, user.steamId)}
                                                        disabled={syncingSteamId === user.steamId}
                                                        className={`p-2 rounded-lg transition-all ${
                                                            syncingSteamId === user.steamId 
                                                                ? 'bg-yellow-500/20 text-yellow-500 animate-spin' 
                                                                : 'hover:bg-yellow-500/10 text-zinc-600 hover:text-yellow-500'
                                                        }`}
                                                        title="Sincronizar Partidas"
                                                    >
                                                        <Flame size={14} className={syncingSteamId === user.steamId ? 'animate-pulse' : ''} />
                                                    </button>
                                                )}
                                                <Link href={`/player/${user.steamId}`}>
                                                    <div className="p-2 rounded-lg hover:bg-white/5 text-zinc-700 hover:text-white transition-all">
                                                        <ExternalLink size={13} />
                                                    </div>
                                                </Link>
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GlobalRanking;
