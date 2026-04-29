"use client";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
    Check,
    Shield,
    Play,
    Download,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import MatchReportModal from './match-report-modal';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

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
    kast?: number;
    impact?: number;
    rating2?: number;
    hsPercentage?: number;
    rank?: string;
    eloChange?: number;
    eloAfter?: number;
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
    variant?: 'full' | 'profile';
}

const MatchesDashboard: React.FC<MatchesDashboardProps> = ({ 
    matches, 
    onUpdateFaceit, 
    currentFaceit, 
    currentUserSteamId,
    onSync, 
    loading, 
    hasSteamCode, 
    syncError,
    variant = 'full'
}) => {
    const { data: session } = useSession();
    const [faceitInput, setFaceitInput] = useState(currentFaceit || '');
    const [isEditing, setIsEditing] = useState(!currentFaceit);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Last sync timestamp (persisted to localStorage)
    const SYNC_KEY = 'tropacs_last_sync';
    const [lastSync, setLastSync] = useState<Date | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem(SYNC_KEY);
        if (saved) setLastSync(new Date(saved));
    }, []);

    const handleSyncWithTimestamp = useCallback(() => {
        if (onSync) {
            onSync();
            const now = new Date();
            setLastSync(now);
            localStorage.setItem(SYNC_KEY, now.toISOString());
        }
    }, [onSync]);

    const formatLastSync = (date: Date | null): string => {
        if (!date) return 'Nunca atualizado';
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 10) return 'Agora mesmo';
        if (diff < 60) return `${diff}s atrás`;
        const m = Math.floor(diff / 60);
        if (m < 60) return `${m} min atrás`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h atrás`;
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    // Filters
    const [mapFilter, setMapFilter] = useState('all');
    const [modeFilter, setModeFilter] = useState('all');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Helper to detect the platform/mode of a match
    const detectMode = (m: Match): 'GamersClub' | 'Faceit' | 'Premier' | 'Mix' | 'Competitive' | 'Wingman' => {
        const src = (m.source || '').toLowerCase();
        const mode = (m.gameMode || '').toLowerCase();
        const meta = (m.metadata?.source || m.metadata?.data_source || '').toLowerCase();

        if (src.includes('gamersclub') || src.includes('gamers_club') || src.includes('gamers-club') || src === 'gc' ||
            mode.includes('gamersclub') || mode.includes('gamers_club') || mode.includes('gamers-club') || mode === 'gc') {
            return 'GamersClub';
        }
        if (src === 'faceit' || mode.includes('faceit') || meta.includes('faceit')) {
            return 'Faceit';
        }
        if (src.includes('wingman') || mode.includes('wingman') || meta.includes('wingman') || mode.includes('2v2')) {
            return 'Wingman';
        }
        if (src.includes('mix') || src.includes('demo') || src.includes('local') || mode.includes('mix') || meta.includes('mix')) {
            return 'Mix';
        }
        if (src.includes('premier') || mode.includes('premier') || meta.includes('premier') ||
            m.metadata?.rank_type === 11 ||
            (!isNaN(parseInt(m.rank || '')) && parseInt(m.rank || '') > 1000 && !src.includes('gamersclub'))) {
            return 'Premier';
        }
        return 'Competitive';
    };

    const handleDownloadDemo = (e: React.MouseEvent, match: any) => {
        e.stopPropagation();
        e.preventDefault();
        
        // 1. Extração robusta do Share Code
        const meta = match.metadata || {};
        const shareCode = meta.sharingCode || meta.shareCode || (match.source === 'Steam' && !match.externalId?.includes('leetify') ? match.externalId : null);
        
        console.log("Download Demo Click:", { id: match.id, source: match.source, shareCode });

        // 2. Se temos Share Code, abrimos no jogo (+csgo_download_match)
        if (shareCode) {
            const steamMatchLink = `steam://rungame/730/76561202255233023/+csgo_download_match%20${shareCode}`;
            window.location.href = steamMatchLink;
            return;
        }

        // 3. Se for Faceit, o protocolo é diferente ou precisa de download
        if (match.source?.toLowerCase().includes('faceit') || match.gameMode?.toLowerCase().includes('faceit')) {
            if (match.url && match.url.startsWith('http')) {
                window.open(match.url, '_blank');
                return;
            }
        }

        // 4. Fallback para Download da Demo (Proxy do Servidor/Mix)
        const demoProxyUrl = `/api/match/${match.id}/demo`;
        
        // Se for Leetify/Valve sem código, avisamos o usuário
        if ((match.source === 'Leetify' || match.source === 'Steam') && !shareCode) {
            const demoUrl = meta.demoUrl || meta.demo_url;
            if (!demoUrl || demoUrl.includes('leetify.com')) {
                toast.error("Este tipo de partida (Leetify/Valve antiga) só pode ser assistida se você sincronizar os dados novamente.");
                return;
            }
        }

        // Tenta abrir o proxy de download
        window.open(demoProxyUrl, '_blank');
    };

    const filteredMatches = useMemo(() => {
        // 1. Initial Filtering
        const baseFiltered = matches.filter(m => {
            const mapName = m.mapName || '';
            const nameLower = mapName.toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            const source = m.source || '';

            const matchesSearch = searchTerm === '' || nameLower.includes(searchLower) || source.toLowerCase().includes(searchLower);
            const matchesMap = mapFilter === 'all' || nameLower.includes(mapFilter.toLowerCase());
            const matchesMode = modeFilter === 'all' || detectMode(m) === modeFilter;
                
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
        if (total === 0) return { wr: 0, kills: 0, adr: '0.0', kd: '0.00', hs: '0', rating: '—' };
        
        const wins = filteredMatches.filter(m => {
            const r = (m.result || '').toLowerCase();
            return r === 'win' || r === 'vitoria' || r === 'vitória';
        }).length;
        const totalKills = filteredMatches.reduce((acc, m) => acc + (m.kills || 0), 0);
        const totalDeaths = filteredMatches.reduce((acc, m) => acc + (m.deaths || 0), 0);

        // Advanced metrics
        const adrMatches = filteredMatches.filter(m => (m.adr || (m as any).metadata?.adr) != null);
        const totalAdr = adrMatches.reduce((acc, m) => acc + (m.adr || (m as any).metadata?.adr || 0), 0);

        const kastMatches = filteredMatches.filter(m => (m.kast ?? m.metadata?.kast ?? m.metadata?.kast_percent ?? m.metadata?.kast_percentage) != null);
        const totalKast = kastMatches.reduce((acc, m) => {
            const k = Number(m.kast ?? m.metadata?.kast ?? m.metadata?.kast_percent ?? m.metadata?.kast_percentage ?? 0);
            return acc + (k > 1 ? k : k * 100);
        }, 0);

        const hsMatches = filteredMatches.filter(m => m.hsPercentage != null && m.hsPercentage > 0);
        const totalHs = hsMatches.reduce((acc, m) => acc + (m.hsPercentage ?? 0), 0);

        const getLeetifyRating = (m: Match): number | null => {
            const meta = m.metadata;
            if (!meta) return (m as any).rating2 || (m as any).rating || null;
            if (meta.leetify_rating !== undefined) return Number(meta.leetify_rating);
            if (meta.rating2 !== undefined) return Number(meta.rating2);
            return null;
        };

        const ratingMatches = filteredMatches.map(m => ({ m, r: getLeetifyRating(m) })).filter(x => x.r !== null);
        const kd = totalKills / (totalDeaths || 1);
        const ratingDisplay = ratingMatches.length > 0
            ? (ratingMatches.reduce((acc, x) => acc + x.r!, 0) / ratingMatches.length).toFixed(2)
            : kd.toFixed(2);

        return {
            wr: Math.round((wins / total) * 100),
            kills: totalKills,
            adr: adrMatches.length > 0 ? (totalAdr / adrMatches.length).toFixed(1) : '—',
            kast: kastMatches.length > 0 ? (totalKast / kastMatches.length).toFixed(1) : '—',
            kd: kd.toFixed(2),
            hs: hsMatches.length > 0 ? Math.round(totalHs / hsMatches.length).toString() : '—',
            rating: ratingDisplay,
            ratingIsLeetify: ratingMatches.length > 0,
        };
    }, [filteredMatches]);

    const getMapImage = (name: string) => {
        const CDN = 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images';
        const fallback = `${CDN}/de_mirage.png`;
        if (!name) return fallback;

        const raw = name.toLowerCase().trim();

        // Explicit full map table — covers all CS2 maps including cs_ and ar_ prefixes
        const MAP_TABLE: Record<string, string> = {
            // ── Aliases / short names ───────────────────────────────────────────
            'dust 2': 'de_dust2', 'dust2': 'de_dust2', 'dust ii': 'de_dust2', 'd2': 'de_dust2',
            'mirage': 'de_mirage', 'inferno': 'de_inferno', 'nuke': 'de_nuke',
            'overpass': 'de_overpass', 'vertigo': 'de_vertigo', 'ancient': 'de_ancient',
            'anubis': 'de_anubis', 'cache': 'de_cache', 'train': 'de_train',
            'cobblestone': 'de_cbble', 'cbble': 'de_cbble',
            'office': 'cs_office', 'italy': 'cs_italy', 'agency': 'cs_agency', 'alpine': 'cs_alpine',
            'assembly': 'de_assembly', 'basalt': 'de_basalt', 'brewery': 'de_brewery',
            'canals': 'de_canals', 'dogtown': 'de_dogtown', 'dust': 'de_dust',
            'edin': 'de_edin', 'golden': 'de_golden', 'grail': 'de_grail',
            'jura': 'de_jura', 'lake': 'de_lake', 'memento': 'de_memento',
            'mills': 'de_mills', 'palacio': 'de_palacio', 'palais': 'de_palais',
            'poseidon': 'de_poseidon', 'rooftop': 'de_rooftop', 'sanctum': 'de_sanctum',
            'stronghold': 'de_stronghold', 'sugarcane': 'de_sugarcane', 'thera': 'de_thera',
            'transit': 'de_transit', 'warden': 'de_warden', 'whistle': 'de_whistle',
            // ── Full prefixed names (map already includes prefix) ───────────────
            'de_dust2': 'de_dust2', 'de_mirage': 'de_mirage', 'de_inferno': 'de_inferno',
            'de_nuke': 'de_nuke', 'de_overpass': 'de_overpass', 'de_vertigo': 'de_vertigo',
            'de_ancient': 'de_ancient', 'de_anubis': 'de_anubis', 'de_cache': 'de_cache',
            'de_train': 'de_train', 'de_cbble': 'de_cbble', 'de_assembly': 'de_assembly',
            'de_basalt': 'de_basalt', 'de_brewery': 'de_brewery', 'de_canals': 'de_canals',
            'de_dogtown': 'de_dogtown', 'de_dust': 'de_dust', 'de_edin': 'de_edin',
            'de_golden': 'de_golden', 'de_grail': 'de_grail', 'de_jura': 'de_jura',
            'de_lake': 'de_lake', 'de_memento': 'de_memento', 'de_mills': 'de_mills',
            'de_palacio': 'de_palacio', 'de_palais': 'de_palais', 'de_poseidon': 'de_poseidon',
            'de_rooftop': 'de_rooftop', 'de_sanctum': 'de_sanctum', 'de_stronghold': 'de_stronghold',
            'de_sugarcane': 'de_sugarcane', 'de_thera': 'de_thera', 'de_transit': 'de_transit',
            'de_warden': 'de_warden', 'de_whistle': 'de_whistle',
            'cs_office': 'cs_office', 'cs_italy': 'cs_italy', 'cs_agency': 'cs_agency', 'cs_alpine': 'cs_alpine',
            'ar_baggage': 'ar_baggage', 'ar_pool_day': 'ar_pool_day', 'ar_shoots': 'ar_shoots',
        };

        if (MAP_TABLE[raw]) return `${CDN}/${MAP_TABLE[raw]}.png`;

        // If no exact match, try stripping de_/cs_/ar_ and look up the bare name
        const bare = raw.replace(/^(de_|cs_|ar_)/, '');
        if (MAP_TABLE[bare]) return `${CDN}/${MAP_TABLE[bare]}.png`;

        // If name already has a valid prefix, trust it
        if (/^(de_|cs_|ar_)/.test(raw)) return `${CDN}/${raw}.png`;

        // Final fallback: assume de_
        return `${CDN}/de_${bare}.png`;
    };

    const getRankInfo = (rank: any, source?: string, gameMode?: string, metadata?: any) => {
        const normMode = gameMode?.toLowerCase() || '';
        const normSource = source?.toLowerCase() || '';
        
        const isPremier = normSource.includes('premier') || 
                         normMode.includes('premier') || 
                         metadata?.data_source?.toLowerCase().includes('premier') ||
                         metadata?.rank_type === 11 || // Leetify Premier type
                         (normMode.includes('competitive') && !isNaN(parseInt(rank)) && parseInt(rank) > 500); // High numbers in competitive are Premier

        const isGC = normSource.includes('gamersclub') || 
                     normMode.includes('gamersclub') || 
                     normMode.includes('gamers_club') || 
                     normMode.includes('gamers-club') || 
                     normMode === 'gc';

        const isFaceit = normSource === 'faceit';

        // 1. Premier Logic (Numerical)
        if (isPremier && rank) {
            const rating = parseInt(rank);
            if (!isNaN(rating)) {
                let color = 'text-zinc-400';
                if (rating >= 30000) color = 'text-amber-400';
                else if (rating >= 25000) color = 'text-red-500';
                else if (rating >= 20000) color = 'text-pink-500';
                else if (rating >= 15000) color = 'text-purple-500';
                else if (rating >= 10000) color = 'text-blue-500';
                else if (rating >= 5000) color = 'text-yellow-400';
                
                return {
                    label: rating.toLocaleString(),
                    icon: null,
                    color,
                    isPremier: true
                };
            }
        }

        // 2. Faceit Logic
        if (isFaceit && rank) {
            const level = parseInt(rank) || 0;
            return {
                label: `Lvl ${rank}`,
                icon: level > 0 ? `/img/icone-faceit-level-${String(level).padStart(2, '0')}.png` : null,
                color: 'text-orange-400',
                isPremier: false
            };
        }

        // 3. Competitive Rank Logic (Mapping IDs 0-18)
        if (!isGC && !isPremier && rank !== null && rank !== undefined) {
            // First try ID based mapping
            const rankId = parseInt(rank);
            const isWingman = normMode.includes('wingman') || (metadata?.gameMode || '').toLowerCase().includes('wingman');
            const ranks: Record<number, { name: string, icon: number }> = {
                0: { name: 'Sem Patente', icon: 0 },
                1: { name: 'Prata I', icon: 1 },
                2: { name: 'Prata II', icon: 2 },
                3: { name: 'Prata III', icon: 3 },
                4: { name: 'Prata IV', icon: 4 },
                5: { name: 'Prata Elite', icon: 5 },
                6: { name: 'Prata Mestre', icon: 6 },
                7: { name: 'Ouro I', icon: 7 },
                8: { name: 'Ouro II', icon: 8 },
                9: { name: 'Ouro III', icon: 9 },
                10: { name: 'Ouro Mestre', icon: 10 },
                11: { name: 'AK I', icon: 11 },
                12: { name: 'AK II', icon: 12 },
                13: { name: 'AK Cruzada', icon: 13 },
                14: { name: 'Xerife', icon: 14 },
                15: { name: 'Águia I', icon: 15 },
                16: { name: 'Águia Mestre', icon: 16 },
                17: { name: 'Supremo', icon: 17 },
                18: { name: 'Global Elite', icon: 18 }
            };

            if (ranks[rankId] !== undefined) {
                const folder = isWingman ? 'wingman' : 'matchmaking';
                return {
                    label: ranks[rankId].name,
                    icon: `https://raw.githubusercontent.com/ItzArty/csgo-rank-icons/main/${folder}/${ranks[rankId].icon}.svg`,
                    color: isWingman ? 'text-emerald-400' : 'text-zinc-400',
                    isPremier: false
                };
            }

            // If not an ID, it might be the rank name itself
            if (isNaN(rankId) && rank.length > 3 && rank !== 'unranked') {
                return {
                    label: rank,
                    icon: null,
                    color: 'text-zinc-400',
                    isPremier: false
                };
            }
        }

        const isUnranked = !rank || rank === 'unranked' || rank === '0' || rank === 0;
        const folder = normMode.includes('wingman') ? 'wingman' : 'matchmaking';

        return {
            label: isUnranked ? 'Sem Patente' : ((rank && isNaN(parseInt(rank))) ? rank : 'Sem Patente'),
            icon: isUnranked ? `https://raw.githubusercontent.com/ItzArty/csgo-rank-icons/main/${folder}/0.svg` : null,
            color: 'text-zinc-600',
            isPremier: false
        };
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
        <div className={variant === 'full' ? "p-4 md:p-8 space-y-8 min-h-screen pb-24" : "bg-zinc-900/40 rounded-[40px] border border-white/5 p-4 md:p-8 backdrop-blur-xl flex flex-col h-full space-y-6 w-full"}>
            
            {variant === 'profile' && (
                <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 px-2">
                    <span className="w-1.5 h-6 bg-yellow-500 rounded-full" /> Histórico de Combate
                </h3>
            )}

            {variant === 'full' && (
                <>
                    {/* ── HERO HEADER ─────────────────────────────────────────────────── */}
                    <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 overflow-hidden">
                        {/* Background glow */}
                        <div className="pointer-events-none absolute -top-16 -left-16 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
                        <div className="pointer-events-none absolute -top-8 left-32 w-64 h-64 bg-yellow-500/[0.03] rounded-full blur-2xl" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-inner">
                                    <Swords className="text-yellow-500 w-7 h-7 drop-shadow-[0_0_8px_rgba(246,203,2,0.6)]" />
                                </div>
                                <div>
                                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">Histórico</span>
                                        <span className="text-yellow-500"> Combate</span>
                                    </h1>
                                    <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.5em] mt-1 flex items-center gap-2">
                                        <span className="w-4 h-px bg-yellow-500/40" />
                                        Elite Analytics
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-zinc-500">{matches.length} partidas sincronizadas</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="relative z-10 w-full md:w-auto flex flex-col md:flex-row items-stretch gap-0 bg-zinc-950/90 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 backdrop-blur-2xl">
                            <div className="relative flex-grow flex items-center border-b md:border-b-0 md:border-r border-white/[0.06]">
                                <Search className="absolute left-4 w-4 h-4 text-zinc-600" />
                                <input
                                    type="text"
                                    placeholder="Buscar mapa ou modo..."
                                    className="bg-transparent py-3.5 pl-12 pr-5 focus:outline-none text-sm w-full md:w-56 placeholder:text-zinc-700 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/[0.06]">
                                <button
                                    onClick={handleSyncWithTimestamp}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2.5 px-5 py-2.5 w-full bg-white/[0.03] hover:bg-yellow-500/10 hover:text-yellow-400 transition-all disabled:opacity-40 group"
                                >
                                    <RefreshCw className={`w-4 h-4 text-yellow-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-yellow-400 transition-colors">
                                        {loading ? 'Atualizando' : 'Atualizar'}
                                    </span>
                                </button>
                                <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest pb-1 leading-none">
                                    {formatLastSync(lastSync)}
                                </span>
                            </div>
                            <button
                                onClick={() => window.location.href = '/settings'}
                                className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-white/[0.03] hover:bg-white/[0.06] transition-all group border-b md:border-b-0 border-white/[0.06] md:border-r"
                            >
                                <Zap className="w-4 h-4 text-zinc-600 group-hover:text-yellow-500 transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-white transition-colors">Configurar</span>
                            </button>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`flex items-center justify-center gap-2.5 px-5 py-3.5 transition-all group ${isEditing ? 'bg-yellow-500 text-black' : 'bg-white/[0.03] hover:bg-white/[0.06] text-zinc-600 hover:text-white'}`}
                            >
                                <Users className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Contas</span>
                            </button>
                        </div>
                    </header>

            <AnimatePresence>
                {isEditing && variant === 'full' && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-1 border border-white/10 bg-zinc-900/40 rounded-[2rem] backdrop-blur-xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-500/20 shadow-inner">
                                    <Trophy className="text-yellow-500 w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-black italic text-xl uppercase tracking-tighter">PARTIDAS RECENTES</h3>
                                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Adicione seus perfis para carregar estatísticas avançadas.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <div className="relative flex-grow">
                                    <input
                                        type="text"
                                        placeholder="Seu Nickname no Faceit"
                                        className="bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-yellow-500/50 w-full md:w-72 font-bold transition-all"
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
                </>
            )}

            {/* ── STAT CARDS ────────────────────────────────────────────────── */}
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ${variant === 'profile' ? 'mb-2' : ''}`}>
                {([
                    {
                        label: 'Win Rate', value: `${stats.wr}%`,
                        bar: stats.wr, barMax: 100,
                        icon: <Trophy size={14} className="text-yellow-500" />,
                        color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/10',
                        glow: 'from-yellow-500/10'
                    },
                    {
                        label: 'KAST', value: stats.kast !== '—' ? `${stats.kast}%` : '—',
                        bar: stats.kast !== '—' ? parseFloat(stats.kast as string) : 0, barMax: 100,
                        icon: <Shield size={14} className="text-blue-400" />,
                        color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/10',
                        glow: 'from-blue-500/10'
                    },
                    {
                        label: 'ADR', value: stats.adr,
                        bar: stats.adr !== '—' ? parseFloat(stats.adr as string) : 0, barMax: 150,
                        icon: <Zap size={14} className="text-amber-400" />,
                        color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/10',
                        glow: 'from-amber-500/10'
                    },
                    {
                        label: 'K/D', value: stats.kd,
                        bar: parseFloat(stats.kd) * 50, barMax: 100,
                        icon: <TrendingUp size={14} className="text-emerald-400" />,
                        color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/10',
                        glow: 'from-emerald-500/10'
                    },
                    {
                        label: 'Headshot', value: stats.hs !== '—' ? `${stats.hs}%` : '—',
                        bar: stats.hs !== '—' ? parseFloat(stats.hs as string) : 0, barMax: 100,
                        icon: <Activity size={14} className="text-rose-400" />,
                        color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/10',
                        glow: 'from-rose-500/10'
                    },
                    {
                        label: 'Rating', value: stats.rating,
                        bar: Math.min(100, parseFloat(stats.rating) * 50), barMax: 100,
                        icon: <Target size={14} className="text-purple-400" />,
                        color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/10',
                        glow: 'from-purple-500/10'
                    },
                ] as any[]).map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, type: 'spring', stiffness: 120, damping: 14 }}
                        whileHover={{ y: -4, transition: { duration: 0.18 } }}
                        className={`relative bg-zinc-950/70 border ${stat.border} p-5 rounded-2xl flex flex-col gap-3 group hover:border-white/15 transition-all overflow-hidden shadow-xl`}
                    >
                        {/* top-right glow */}
                        <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${stat.glow} to-transparent rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
                        {/* label + icon */}
                        <div className="flex items-center justify-between relative z-10">
                            <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">{stat.label}</span>
                            <div className={`w-7 h-7 rounded-xl ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                                {stat.icon}
                            </div>
                        </div>
                        {/* value */}
                        <div className={`text-2xl font-black italic tracking-tighter ${stat.color} relative z-10`}>
                            {stat.value}
                        </div>
                        {/* progress bar */}
                        <div className="h-[3px] w-full bg-white/[0.04] rounded-full overflow-hidden relative z-10">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (stat.bar / stat.barMax) * 100)}%` }}
                                transition={{ delay: 0.3 + i * 0.06, duration: 0.8, ease: 'easeOut' }}
                                className={`h-full rounded-full ${stat.bg.replace('/10', '/60')}`}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── FILTROS ───────────────────────────────────────────────────── */}
            <div className={`flex flex-wrap items-center gap-3 ${variant === 'profile' ? 'bg-zinc-950/20 p-4 rounded-3xl border border-white/5' : ''}`}>
                {/* modo */}
                <div className="flex items-center gap-1 bg-zinc-950/60 border border-white/[0.06] p-1 rounded-xl">
                    {[
                        { id: 'all',         label: 'Todos' },
                        { id: 'Competitive', label: '🎮 Competitivo' },
                        { id: 'Premier',     label: '⭐ Premier' },
                        { id: 'Faceit',      label: '🔴 Faceit' },
                        { id: 'Wingman',     label: '👥 Braço Direito' },
                        { id: 'GamersClub',  label: '🛡 GC' },
                        { id: 'Mix',         label: '⚔️ Mix' },
                    ].map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setModeFilter(id)}
                            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all tracking-tight ${
                                modeFilter === id
                                ? 'bg-yellow-500 text-black shadow-[0_0_12px_rgba(246,203,2,0.3)]'
                                : 'text-zinc-600 hover:text-zinc-300'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="w-px h-5 bg-white/[0.06]" />

                {/* mapa */}
                <div className="flex flex-wrap gap-1.5">
                    {['all', 'mirage', 'inferno', 'ancient', 'nuke', 'dust', 'anubis', 'vertigo'].map(map => (
                        <button
                            key={map}
                            onClick={() => setMapFilter(map)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                                mapFilter === map
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                : 'bg-transparent text-zinc-700 border-transparent hover:text-zinc-400 hover:border-white/5'
                            }`}
                        >
                            {map === 'all' ? 'Todos Mapas' : map}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <main className={`overflow-hidden flex-grow ${variant === 'full' ? 'bg-zinc-950/60 border border-white/[0.07] shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl' : 'rounded-[20px]'}`}>
                {loading && filteredMatches.length === 0 ? (
                    <div className="py-48 flex flex-col items-center justify-center text-center">
                        <div className="relative w-20 h-20 mb-10">
                            <div className="absolute inset-0 border-2 border-yellow-500/10 rounded-full" />
                            <div className="absolute inset-0 border-2 border-t-yellow-500 rounded-full animate-spin shadow-[0_0_20px_rgba(246,203,2,0.4)]" />
                            <Swords className="absolute inset-0 m-auto w-7 h-7 text-yellow-500/40" />
                        </div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Buscando Partidas</h3>
                        <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando com Valve & Faceit...</p>
                    </div>
                ) : filteredMatches.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[9px] uppercase font-black text-zinc-600 tracking-[0.15em] border-b border-white/[0.05] bg-black/50 sticky top-0 z-10 backdrop-blur-md">
                                    <th className="w-1 p-0" />
                                    <th className="px-5 py-3.5" title="Nome do mapa jogado">Mapa</th>
                                    <th className="px-3 py-3.5 text-center" title={`Pontuação final da partida (${(session?.user as any)?.steamId === currentUserSteamId ? "Seu Time" : (currentFaceit || "Time do Jogador")} vs Adversários)`}>Placar</th>
                                    <th className="px-3 py-3.5 text-center" title="Patente ou Rating da partida">Patente</th>
                                    <th className="px-3 py-3.5 text-center" title="Alteração de Tropoints nesta partida">Tropoints</th>
                                    <th className="px-3 py-3.5 text-center" title="Modo de jogo (Competitivo, Premier, Faceit, etc)">Modo</th>
                                    <th className="px-2 py-3.5 text-center" title="ID único da partida">ID</th>
                                    <th className="px-3 py-3.5 text-center" title="Kills (Eliminações)">K</th>
                                    <th className="px-3 py-3.5 text-center" title="Deaths (Mortes)">D</th>
                                    <th className="px-3 py-3.5 text-center" title="Assists (Assistências)">A</th>
                                    <th className="px-3 py-3.5 text-center" title="Average Damage per Round (Dano médio por rodada)">ADR</th>
                                    <th className="px-3 py-3.5 text-center" title="Headshot Percentage (Porcentagem de eliminações com tiro na cabeça)">HS%</th>
                                    <th className="px-3 py-3.5 text-center" title="Kill, Assist, Survived, or Traded (Porcentagem de rounds com impacto direto)">KAST</th>
                                    <th className="px-3 py-3.5 text-center" title="Performance Rating (Leetify Rating ou K/D)">Rating</th>
                                    <th className="px-3 py-3.5 text-center" title="Assistir replay da partida (Demo)">Replay</th>
                                    <th className="px-5 py-3.5 text-right" title="Data e hora da partida">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMatches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((match, i) => {
                                    const matchMode = detectMode(match);
                                    const resultLower = (match.result || '').toLowerCase();
                                    const isWin = resultLower === 'win' || resultLower === 'vitoria' || resultLower === 'vitória';
                                    const isLoss = resultLower === 'loss' || resultLower === 'derrota';

                                    const isGamersClub = matchMode === 'GamersClub';
                                    const isPremier = matchMode === 'Premier';
                                    const isFaceit = matchMode === 'Faceit';
                                    const isMix = matchMode === 'Mix';
                                    
                                    return (
                                        <motion.tr
                                                                        key={match.id || match.externalId || Math.random().toString()}
                                                                        initial={{ opacity: 0, y: 6 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        transition={{ delay: i * 0.025, type: 'spring', stiffness: 200, damping: 24 }}
                                                                        className="group relative border-b border-white/[0.04] transition-colors cursor-pointer hover:bg-white/[0.02]"
                                                                        onClick={() => handleViewMatch(match)}
                                                                    >
                                                                {/* Result accent strip */}
                                                                <td className="p-0 w-1">
                                                                    <div className={`h-full w-[3px] rounded-r transition-all duration-300 ${
                                                                        isWin ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' :
                                                                        isLoss ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                                                        'bg-zinc-700'
                                                                    } opacity-0 group-hover:opacity-100`} />
                                                                </td>
                                                                {/* Mapa */}
                                                                <td className="px-5 py-3.5">
                                                                    <div className="flex items-center gap-3.5">
                                                                        <div className="relative w-16 h-10 overflow-hidden rounded-xl border border-white/[0.08] shrink-0 group-hover:border-white/20 transition-all shadow-lg">
                                                                            <img
                                                                                src={getMapImage(match.mapName)}
                                                                                className="w-full h-full object-cover brightness-50 group-hover:brightness-90 transition-all duration-500 group-hover:scale-110"
                                                                                alt={match.mapName}
                                                                            />
                                                                            <div className={`absolute inset-0 ${
                                                                                isWin ? 'bg-gradient-to-t from-emerald-900/60 to-transparent' :
                                                                                isLoss ? 'bg-gradient-to-t from-red-900/60 to-transparent' :
                                                                                'bg-gradient-to-t from-black/60 to-transparent'
                                                                            }`} />
                                                                        </div>
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="font-black text-[13px] text-zinc-200 uppercase italic tracking-tight group-hover:text-yellow-400 transition-colors leading-none">
                                                                                {match.mapName.toLowerCase().includes('dust') ? 'Dust 2' :
                                                                                 match.mapName.replace('de_', '').replace(/_/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                                            </span>
                                                                            <span className={`self-start px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.15em] rounded-md ${
                                                                                isWin ? 'bg-emerald-500/15 text-emerald-400' :
                                                                                isLoss ? 'bg-red-500/15 text-red-400' :
                                                                                'bg-zinc-800/60 text-zinc-500'
                                                                            }`}>
                                                                                {isWin ? '✓ Vitória' : isLoss ? '✗ Derrota' : '= Empate'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-4 text-center">
                                                                    <div className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-xl border font-black italic text-base tracking-tighter ${
                                                                        isWin ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                                                                        isLoss ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                                                                        'bg-zinc-800/30 border-white/5 text-zinc-500'
                                                                    }`}>
                                                                        {match.score || '—'}
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-4 text-center">
                                                                     <div className="flex justify-center flex-col items-center gap-0.5 group/rank">
                                                                         {(() => {
                                                                             const rankInfo = getRankInfo(match.rank, match.source, match.gameMode, match.metadata);
                                                                             return (
                                                                                 <>
                                                                                     {rankInfo.icon ? (
                                                                                         <div className="flex flex-col items-center" title={rankInfo.label}>
                                                                                             <img 
                                                                                                 src={rankInfo.icon} 
                                                                                                 className="w-14 h-auto filter drop-shadow-[0_0_8px_rgba(255,255,255,0.15)] group-hover/rank:scale-110 transition-transform duration-300" 
                                                                                                 alt={rankInfo.label}
                                                                                             />
                                                                                         </div>
                                                                                     ) : rankInfo.isPremier ? (
                                                                                         <div className={`text-base font-black italic tracking-tighter ${rankInfo.color}`}>
                                                                                             {rankInfo.label}
                                                                                         </div>
                                                                                     ) : (
                                                                                         <span className="text-zinc-700 font-black italic text-[9px]">—</span>
                                                                                     )}
                                                                                 </>
                                                                             );
                                                                         })()}
                                                                     </div>
                                                                  </td>
                                                                 <td className="px-3 py-4 text-center">
                                                                     {match.eloChange !== undefined && match.eloChange !== null ? (
                                                                         <div className="flex flex-col items-center">
                                                                             <div className={`flex items-center gap-0.5 text-xs font-black tracking-tighter ${match.eloChange > 0 ? 'text-emerald-400' : match.eloChange < 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                                                                                 {match.eloChange > 0 ? `+${match.eloChange}` : match.eloChange}
                                                                             </div>
                                                                             {match.eloAfter !== undefined && (
                                                                                 <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none mt-0.5">{match.eloAfter} TP</span>
                                                                             )}
                                                                         </div>
                                                                     ) : (
                                                                         <span className="text-zinc-800 font-black italic text-[9px]">—</span>
                                                                     )}
                                                                 </td>
                                                                <td className="px-3 py-4 text-center">
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wide ${
                                                                            isGamersClub ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                            isFaceit ? 'bg-orange-600/10 text-orange-400 border-orange-600/20' :
                                                                            isPremier ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                                            matchMode === 'Wingman' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                            isMix ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                                                                            'bg-yellow-500/5 text-yellow-500/70 border-yellow-500/15'
                                                                        }`}>
                                                                            <span>{isGamersClub ? '🛡' : isFaceit ? '🔴' : isPremier ? '⭐' : matchMode === 'Wingman' ? '👥' : isMix ? '⚔️' : '🎮'}</span>
                                                                            <span>{isGamersClub ? 'GC' : isFaceit ? 'Faceit' : isPremier ? 'Premier' : matchMode === 'Wingman' ? 'Braço Direito' : isMix ? 'Mix' : 'Competitivo'}</span>
                                                                        </div>
                                                    {isPremier && match.metadata?.rank_delta && (
                                                        <div className={`flex items-center gap-0.5 text-[8px] font-black ${match.metadata.rank_delta > 0 ? 'text-yellow-500' : 'text-red-400'}`}>
                                                            {match.metadata.rank_delta > 0 ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                                                            {Math.abs(match.metadata.rank_delta)}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-1 py-4 text-center">
                                                 {match.externalId ? (
                                                     <button
                                                         onClick={(e) => {
                                                              e.stopPropagation();
                                                              const cleanId = match.externalId?.replace('leetify-', '') || '';
                                                             navigator.clipboard.writeText(cleanId);
                                                         }}
                                                         className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.03] hover:bg-emerald-500 text-zinc-700 hover:text-black transition-all active:scale-90 border border-white/5"
                                                         title={`Copiar ID (${match.source})`}
                                                     >
                                                         <Copy size={11} />
                                                     </button>
                                                 ) : (
                                                     <div className="w-8 h-8 flex items-center justify-center text-zinc-800" title="Sem ID">
                                                         <Lock size={10} />
                                                     </div>
                                                 )}
                                             </td>
                                            {/* K */}
                                            <td className="px-3 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`font-black text-lg italic leading-none tracking-tighter ${match.kills > 0 ? 'text-white' : 'text-zinc-700'}`}>
                                                        {match.kills > 0 ? match.kills : '—'}
                                                    </span>
                                                    {((match.metadata?.quadro_kills || match.metadata?.quadroKills || 0) > 0 || (match.metadata?.penta_kills || match.metadata?.pentaKills || 0) > 0) && (
                                                        <div className="flex gap-0.5 mt-1">
                                                            {(match.metadata?.quadro_kills || match.metadata?.quadroKills || 0) > 0 && <span className="text-[7px] font-black text-orange-400 bg-orange-500/10 px-1 rounded">4K</span>}
                                                            {(match.metadata?.penta_kills || match.metadata?.pentaKills || 0) > 0 && <span className="text-[7px] font-black text-purple-400 bg-purple-500/10 px-1 rounded animate-pulse">ACE</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            {/* D */}
                                            <td className="px-3 py-4 text-center">
                                                <span className={`font-black text-lg italic leading-none tracking-tighter ${match.deaths > 0 ? 'text-zinc-500' : 'text-zinc-700'}`}>
                                                    {match.deaths > 0 ? match.deaths : '—'}
                                                </span>
                                            </td>
                                            {/* A */}
                                            <td className="px-3 py-4 text-center">
                                                <span className={`font-black text-base italic leading-none tracking-tighter ${match.assists > 0 ? 'text-zinc-600' : 'text-zinc-700'}`}>
                                                    {match.assists > 0 ? match.assists : '—'}
                                                </span>
                                            </td>
                                            {/* ADR */}
                                            <td className="px-3 py-4 text-center">
                                                <span className={`font-black text-base italic tracking-tighter ${
                                                    (match.adr || match.metadata?.adr) && Math.round(match.adr || match.metadata?.adr) >= 80 ? 'text-yellow-400' :
                                                    (match.adr || match.metadata?.adr) ? 'text-yellow-500/60' : 'text-zinc-700'
                                                }`}>
                                                    {(match.adr || match.metadata?.adr) ? Math.round(match.adr || match.metadata?.adr) : '—'}
                                                </span>
                                            </td>
                                            {/* HS% */}
                                            <td className="px-3 py-4 text-center">
                                                {(() => {
                                                    const hs = match.hsPercentage !== null && match.hsPercentage !== undefined ? Math.round(match.hsPercentage)
                                                             : match.metadata?.headshot_pct ? Math.round(Number(match.metadata.headshot_pct))
                                                             : match.metadata?.hs_percentage ? Math.round(Number(match.metadata.hs_percentage)) : null;
                                                    return hs !== null ? (
                                                        <span className={`font-bold text-sm ${ hs >= 50 ? 'text-rose-400' : hs >= 30 ? 'text-zinc-400' : 'text-zinc-600'}`}>{hs}%</span>
                                                    ) : <span className="text-zinc-700">—</span>;
                                                })()}
                                            </td>
                                            {/* KAST */}
                                            <td className="px-3 py-4 text-center">
                                                {(() => {
                                                    const kast = match.kast ?? match.metadata?.kast ?? match.metadata?.kast_percent ?? match.metadata?.kast_percentage;
                                                    const val = kast != null ? (kast > 1 ? Math.round(kast) : Math.round(kast * 100)) : null;
                                                    return val !== null ? (
                                                        <span className={`font-bold text-sm ${ val >= 75 ? 'text-blue-400' : val >= 65 ? 'text-zinc-400' : 'text-zinc-600'}`}>{val}%</span>
                                                    ) : <span className="text-zinc-700">—</span>;
                                                })()}
                                            </td>
                                            {/* Rating */}
                                            <td className="px-3 py-4 text-center">
                                                {(() => {
                                                    const leetifyR = match.metadata?.leetify_rating;
                                                    const rating2 = match.rating2 || (match as any).metadata?.rating2;
                                                    const impact = match.impact || (match as any).metadata?.impact;
                                                    
                                                    const kd = match.kills / (match.deaths || 1);

                                                    if (rating2) {
                                                        const r = Number(rating2);
                                                        const color = r >= 1.2 ? 'text-emerald-400' : r >= 1.0 ? 'text-yellow-400' : 'text-rose-400';
                                                        return (
                                                            <div className="flex flex-col items-center gap-0.5" title={`Impacto: ${impact?.toFixed(2) || '—'}`}>
                                                                <span className={`font-black text-base italic tracking-tight ${color}`}>{r.toFixed(2)}</span>
                                                                <span className="text-[7px] font-black text-zinc-700 uppercase tracking-widest">Rating 2.0</span>
                                                            </div>
                                                        );
                                                    } else if (leetifyR !== undefined && leetifyR !== null) {
                                                        const r = Number(leetifyR);
                                                        const color = r >= 0.5 ? 'text-orange-400' : r >= 0 ? 'text-yellow-400' : r >= -0.3 ? 'text-zinc-400' : 'text-red-400';
                                                        return (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className={`font-black text-base italic tracking-tight ${color}`}>
                                                                    {r > 0 ? '+' : ''}{r.toFixed(2)}
                                                                </span>
                                                                <span className="text-[7px] font-black text-zinc-700 uppercase tracking-widest">Leetify</span>
                                                            </div>
                                                        );
                                                    } else {
                                                        const color = kd >= 1.2 ? 'text-emerald-400' : kd >= 1.0 ? 'text-zinc-400' : 'text-rose-400';
                                                        return (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span className={`font-black text-base italic tracking-tight ${color}`}>{kd.toFixed(2)}</span>
                                                                <span className="text-[7px] font-black text-zinc-700 uppercase tracking-widest">Ratio K/D</span>
                                                            </div>
                                                        );
                                                    }
                                                })()}
                                            </td>
                                            {/* Replay 2D */}
                                            <td className="px-3 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    
                                                    {(() => {
                                                        const meta = match.metadata || {};
                                                        const shareCode = meta.sharingCode || meta.shareCode || (match.source === 'Steam' && !match.externalId?.includes('leetify') ? match.externalId : null);
                                                        const canOpenInGame = !!shareCode;
                                                        
                                                        return (
                                                            <button 
                                                                onClick={(e) => handleDownloadDemo(e, match)}
                                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-sky-500/10 hover:bg-sky-500 text-sky-500 hover:text-white transition-all group/download shadow-lg shadow-sky-500/5 active:scale-90 border border-sky-500/10 hover:border-sky-500"
                                                                title={canOpenInGame ? "Abrir no CS2" : "Baixar Demo"}
                                                            >
                                                                {canOpenInGame ? <Play size={16} /> : <Download size={16} />}
                                                            </button>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-[10px] font-black text-zinc-400 group-hover:text-yellow-400 transition-colors uppercase tracking-widest whitespace-nowrap">
                                                        {formatTimeAgo(match.matchDate)}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest">
                                                        {new Date(match.matchDate).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })}
                                                    </span>
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
                            <div className="w-24 h-24 bg-gradient-to-tr from-yellow-500/20 to-amber-500/10 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl relative z-10">
                                <Lock className="w-10 h-10 text-yellow-500/50" />
                            </div>
                            <div className="absolute -inset-4 bg-yellow-500/5 blur-3xl rounded-full" />
                        </div>

                        {hasSteamCode ? (
                            // User has credentials but no matches — probably first sync timed out
                            <>
                                <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Credenciais Salvas ✓</h3>
                                <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-12 leading-relaxed max-w-md mx-auto">
                                    Seus dados estão configurados! Clique em <span className="text-yellow-400">Sincronizar</span> para carregar suas partidas. A primeira sincronização pode demorar um pouco.
                                </p>
                                <button
                                    onClick={onSync}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-4 mx-auto bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-sm tracking-widest py-5 px-12 rounded-3xl transition-all active:scale-95 shadow-xl shadow-yellow-500/30 disabled:opacity-50"
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
                                    Para ver suas partidas Steam, você precisa configurar o <span className="text-yellow-400">Auth Code</span> e o <span className="text-yellow-400">Código da Última Partida</span> nas configurações.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <a
                                        href="https://help.steampowered.com/en/wizard/HelpWithGameIssue/?appid=730&issueid=128"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase text-[10px] tracking-widest py-5 rounded-3xl border border-white/5 transition-all flex flex-col items-center justify-center gap-3 active:scale-95"
                                    >
                                        <ExternalLink size={20} className="text-zinc-600 group-hover:text-yellow-500 transition-colors" />
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
                                        className="group bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-[10px] tracking-widest py-5 rounded-3xl transition-all flex flex-col items-center justify-center gap-3 active:scale-95 shadow-xl shadow-yellow-500/20"
                                    >
                                        <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
                                        3. Configurações
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── PAGINAÇÃO ─────────────────────────────────────────────── */}
                {filteredMatches.length > itemsPerPage && !loading && (
                    <footer className="bg-black/30 px-6 py-5 border-t border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-5">
                        {/* items per page */}
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-700 text-[9px] font-black uppercase tracking-widest mr-1">Exibir:</span>
                            {[10, 25, 50].map(n => (
                                <button
                                    key={n}
                                    onClick={() => { setItemsPerPage(n); setCurrentPage(1); }}
                                    className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${
                                        itemsPerPage === n
                                        ? 'bg-yellow-500 text-black shadow-[0_0_12px_rgba(246,203,2,0.3)]'
                                        : 'bg-white/5 text-zinc-600 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>

                        {/* page indicator */}
                        <div className="flex items-center gap-2 bg-black/40 px-2 py-1.5 rounded-2xl border border-white/[0.06]">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-zinc-500 disabled:opacity-20 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                            >
                                <ChevronDown className="rotate-90" size={16} />
                            </button>
                            <div className="px-4 text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2">
                                <span className="text-yellow-500">{currentPage}</span>
                                <span className="text-zinc-800">/</span>
                                <span className="text-zinc-600">{Math.ceil(filteredMatches.length / itemsPerPage)}</span>
                            </div>
                            <button
                                disabled={currentPage >= Math.ceil(filteredMatches.length / itemsPerPage)}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-zinc-500 disabled:opacity-20 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                            >
                                <ChevronDown className="-rotate-90" size={16} />
                            </button>
                        </div>

                        <span className="text-zinc-700 text-[9px] font-black uppercase tracking-[0.3em]">
                            {filteredMatches.length} <span className="text-zinc-800">partidas</span>
                        </span>
                    </footer>
                )}
            </main>

            <MatchReportModal
                match={null}
                matchId={selectedMatch?.externalId?.replace('leetify-', '') || selectedMatch?.id || null}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedMatch(null);
                }}
                userSteamId={currentUserSteamId}
                userNickname={currentFaceit}
            />
        </div>
    );
};

export default MatchesDashboard;
