"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Calendar, MapPin, Shield, Target, Activity,
    Zap, TrendingUp, Crosshair, Star, Flame, Eye
} from 'lucide-react';
import axios from 'axios';

// ── TYPES ────────────────────────────────────────────────────────────────────

interface PlayerStats {
    nickname: string;
    avatar: string;
    kills: number;
    deaths: number;
    assists: number;
    adr: number;
    hs: number;          // raw number 0-100
    kast: number;        // raw number 0-100
    rating: number;
    // Extended
    fk: number;          // first kills
    fd: number;          // first deaths
    triples: number;
    quads: number;
    aces: number;
    clutches: number;
    trades: number;
    utilDmg: number;
    flashAssists: number;
    blindTime: number;   // seconds
    heThrown: number;
    flashThrown: number;
    smokesThrown: number;
    molotovThrown: number;
    isUser?: boolean;
    steamId?: string;
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
    rank?: string;
    matchDate: string;
    result: string;
    score: string;
    url?: string;
    externalId?: string;
    metadata?: any;
    adr?: number;
    hsPercentage?: number;
}

interface Props {
    match: Match | null;
    matchId?: string | null;
    isOpen: boolean;
    onClose: () => void;
    userSteamId?: string;
    userNickname?: string;
}

// ── COMPONENT ────────────────────────────────────────────────────────────────

const MatchReportModal: React.FC<Props> = ({
    match: initialMatch, matchId, isOpen, onClose, userSteamId, userNickname
}) => {
    const [internalMatch, setInternalMatch] = useState<Match | null>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<'placar' | 'desempenho' | 'utilitarios' | 'confrontos'>('placar');

    const match = initialMatch || internalMatch;

    React.useEffect(() => {
        if (isOpen && matchId) {
            if (!match || !match.metadata || match.id !== matchId) {
                setInternalMatch(null);
                setTab('placar');
                fetchMatchData();
            }
        } else if (!isOpen) {
            setInternalMatch(null);
            setTab('placar');
        }
    }, [isOpen, matchId]);

    const fetchMatchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/match/${matchId}`);
            const data = res.data;
            const scoreFromAPI = (data.team_2_score !== undefined && data.team_3_score !== undefined)
                ? `${data.team_2_score}-${data.team_3_score}` : null;

            setInternalMatch({
                id: data.match_id || matchId!,
                // Always trust the source/gameMode from the match list (set during sync),
                // since the Leetify API returns generic values like "valve" / "matchmaking"
                source: initialMatch?.source || data.data_source || 'Leetify',
                gameMode: initialMatch?.gameMode || data.game_mode || 'Competitive',
                mapName: data.map_name || initialMatch?.mapName || 'de_mirage',
                kills: data.stats?.find((p: any) => p.is_user)?.total_kills || initialMatch?.kills || 0,
                deaths: data.stats?.find((p: any) => p.is_user)?.total_deaths || initialMatch?.deaths || 0,
                assists: data.stats?.find((p: any) => p.is_user)?.total_assists || initialMatch?.assists || 0,
                matchDate: data.match_date || initialMatch?.matchDate || new Date().toISOString(),
                result: data.result || initialMatch?.result || 'Loss',
                score: scoreFromAPI && scoreFromAPI !== '0-0' ? scoreFromAPI : (initialMatch?.score || '0-0'),
                url: data.demo_url || initialMatch?.url,
                externalId: data.match_id || initialMatch?.externalId,
                metadata: { ...initialMatch?.metadata, ...data },
                adr: data.stats?.find((p: any) => p.is_user)?.dpr || data.stats?.find((p: any) => p.is_user)?.adr || initialMatch?.adr,
                hsPercentage: (data.stats?.find((p: any) => p.is_user)?.accuracy_head * 100) || initialMatch?.hsPercentage
            });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const currentMatch = internalMatch?.metadata ? internalMatch : (initialMatch || internalMatch);
    if (!isOpen) return null;

    // ── HELPERS ───────────────────────────────────────────────────────────────

    const mapImg = (name: string) => {
        const CDN = 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images';
        if (!name) return `${CDN}/de_mirage.png`;
        const raw = name.toLowerCase().trim();
        const MAP_TABLE: Record<string, string> = {
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
        const bare = raw.replace(/^(de_|cs_|ar_)/, '');
        if (MAP_TABLE[bare]) return `${CDN}/${MAP_TABLE[bare]}.png`;
        if (/^(de_|cs_|ar_)/.test(raw)) return `${CDN}/${raw}.png`;
        return `${CDN}/de_${bare}.png`;
    };

    const isUserP = (p: any) => {
        if (!p) return false;
        const metaN = currentMatch?.metadata?.playerNickname || currentMatch?.metadata?.metadata?.playerNickname;
        const metaS = currentMatch?.metadata?.metadata?.steamId || currentMatch?.metadata?.steam64Id;
        const pS = p.player_id || p.steam64_id || p.steamId || p.steam_id;
        const pN = p.nickname || p.name;
        return (userSteamId && pS === userSteamId) ||
               (userNickname && pN === userNickname) ||
               p.is_user === true || p.isUser === true ||
               (metaN && pN === metaN) ||
               (metaS && pS === metaS) || false;
    };

    const normalizeP = (p: any, isUser = false): PlayerStats => {
        const kills   = p.kills ?? p.total_kills ?? parseInt(p.player_stats?.Kills ?? '0') ?? 0;
        const deaths  = p.deaths ?? p.total_deaths ?? parseInt(p.player_stats?.Deaths ?? '0') ?? 0;
        const assists = p.assists ?? p.total_assists ?? parseInt(p.player_stats?.Assists ?? '0') ?? 0;
        const adr     = p.dpr ?? p.adr ?? parseFloat(p.player_stats?.ADR ?? '0') ?? (isUser ? currentMatch?.adr ?? 70 : 70);
        const rating  = p.rating ?? p.leetify_rating ?? parseFloat(p.player_stats?.['K/D Ratio'] ?? '1.0') ?? 1.0;
        const hsRaw   = p.accuracy_head !== undefined ? p.accuracy_head > 1 ? Math.round(p.accuracy_head) : Math.round(p.accuracy_head * 100)
                      : p.hs_percent ?? p.hs_percentage ?? (isUser && currentMatch?.hsPercentage ? Math.round(Number(currentMatch.hsPercentage)) : 0);
        const kastRaw = p.kast !== undefined
            ? typeof p.kast === 'string' ? parseFloat(p.kast) : (p.kast > 1 ? p.kast : Math.round(p.kast * 100))
            : (currentMatch?.result === 'Win' ? 72 : 60);
        const avatar  = p.avatar_url || p.avatarUrl || p.avatar
                      || (isUser ? currentMatch?.metadata?.steam_avatar ?? '' : '')
                      || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';

        return {
            nickname: p.name || p.nickname || (isUser ? '[Você]' : 'Jogador'),
            avatar, kills, deaths, assists, adr, rating,
            hs: hsRaw, kast: kastRaw,
            fk: p.fk_count ?? p.fkd ?? 0,
            fd: p.fd_count ?? p.fk_deaths ?? 0,
            triples: p.triple_kills ?? 0,
            quads: p.quadro_kills ?? p.quad_kills ?? 0,
            aces: p.penta_kills ?? p.ace_kills ?? 0,
            clutches: p.clutch_count ?? p.clutches ?? 0,
            trades: p.trade_count ?? p.trades ?? 0,
            utilDmg: p.util_damage ?? p.utility_damage ?? p.utilityDamage ?? 0,
            flashAssists: p.flash_assists ?? p.flashbang_assists ?? 0,
            blindTime: p.blind_time ?? p.blindTime ?? 0,
            heThrown: p.he_thrown ?? 0,
            flashThrown: p.flash_thrown ?? 0,
            smokesThrown: p.smokes_thrown ?? 0,
            molotovThrown: p.molotovs_thrown ?? p.molotov_thrown ?? 0,
            isUser,
            steamId: p.player_id || p.steamId || p.steam64_id
        };
    };

    const getTeams = (): { t1: PlayerStats[]; t2: PlayerStats[] } => {
        const meta = currentMatch?.metadata || {};

        const byKills = (a: PlayerStats, b: PlayerStats) => b.kills - a.kills;
        if (meta.fullStats?.rounds?.[0]?.teams) {
            const [a, b] = meta.fullStats.rounds[0].teams;
            return {
                t1: (a.players||[]).map((p:any)=>normalizeP(p,isUserP(p))).sort(byKills),
                t2: (b.players||[]).map((p:any)=>normalizeP(p,isUserP(p))).sort(byKills)
            };
        }
        if (meta.stats && Array.isArray(meta.stats)) {
            const map: Record<string, any[]> = {};
            meta.stats.forEach((s: any) => {
                const k = String(s.initial_team_number || s.team_id || 'x');
                if (!map[k]) map[k] = [];
                map[k].push(s);
            });
            const ids = Object.keys(map).filter(k => k !== 'x');
            let t1: any[] = [], t2: any[] = [];
            if (ids.length >= 2) { ids.sort(); t1 = map[ids[0]]; t2 = map[ids[1]]; }
            else { t1 = meta.stats.slice(0,5); t2 = meta.stats.slice(5,10); }
            if (t2.some(isUserP)) { [t1, t2] = [t2, t1]; }
            return {
                t1: t1.map((p:any)=>normalizeP(p,isUserP(p))).sort(byKills),
                t2: t2.map((p:any)=>normalizeP(p,isUserP(p))).sort(byKills)
            };
        }
        if (meta.players && Array.isArray(meta.players)) {
            return {
                t1: meta.players.slice(0,5).map((p:any)=>normalizeP(p,isUserP(p))).sort(byKills),
                t2: meta.players.slice(5,10).map((p:any)=>normalizeP(p,isUserP(p))).sort(byKills)
            };
        }
        return {
            t1: [
                normalizeP({nickname:'[Você]',kills:currentMatch?.kills,deaths:currentMatch?.deaths,assists:currentMatch?.assists,adr:currentMatch?.adr},true),
                normalizeP({nickname:'Aliado 1'}),normalizeP({nickname:'Aliado 2'}),
                normalizeP({nickname:'Aliado 3'}),normalizeP({nickname:'Aliado 4'}),
            ],
            t2: [normalizeP({nickname:'Inimigo 1'}),normalizeP({nickname:'Inimigo 2'}),
                 normalizeP({nickname:'Inimigo 3'}),normalizeP({nickname:'Inimigo 4'}),normalizeP({nickname:'Inimigo 5'})]
        };
    };

    const getScore = () => {
        if (!currentMatch) return { a: 0, e: 0 };
        const meta = currentMatch.metadata || {};
        const stats: any[] = meta.stats || [];
        const uP = stats.find(isUserP);
        const uT = uP?.initial_team_number;
        const eT = stats.find((s: any) => s.initial_team_number && s.initial_team_number !== uT)?.initial_team_number;
        const sc = (t: any) => {
            if (!t) return null;
            if (meta[`team_${t}_score`] !== undefined) return meta[`team_${t}_score`];
            if (meta[`team${t}Score`] !== undefined) return meta[`team${t}Score`];
            return null;
        };
        const s1 = sc(uT), s2 = sc(eT);
        if (s1 !== null && s2 !== null) return { a: s1, e: s2 };
        const parts = (currentMatch.score || '').split(/[^\d]+/).map(Number).filter(n => !isNaN(n));
        if (parts.length >= 2) {
            const win = currentMatch.result === 'Win';
            return { a: win ? Math.max(...parts) : Math.min(...parts), e: win ? Math.min(...parts) : Math.max(...parts) };
        }
        return { a: 0, e: 0 };
    };

    const detectMode = (): 'Faceit' | 'Premier' | 'GamersClub' | 'Competitivo' => {
        const m = currentMatch;
        if (!m) return 'Competitivo';

        const src  = (m.source    || '').toLowerCase();
        const mode = (m.gameMode  || '').toLowerCase();
        const meta = (m.metadata?.source || m.metadata?.data_source || '').toLowerCase();
        const rank    = m.rank || m.metadata?.rank || '';
        const rankNum = parseInt(String(rank));

        // GamersClub
        if (src.includes('gamersclub') || src.includes('gamers_club') || src === 'gc' ||
            mode.includes('gamersclub') || mode.includes('gamers_club') || mode === 'gc' ||
            meta.includes('gamersclub')) return 'GamersClub';

        // Faceit
        if (src === 'faceit' || mode.includes('faceit') || meta.includes('faceit')) return 'Faceit';

        // Premier — same heuristics as the match list:
        // rank_type 11 = Premier in Leetify, or numeric rank > 1000 in a competitive context
        if (src.includes('premier') || mode.includes('premier') || meta.includes('premier') ||
            m.metadata?.rank_type === 11 ||
            (!isNaN(rankNum) && rankNum > 1000 && !src.includes('gamersclub'))) return 'Premier';

        return 'Competitivo';
    };

    const modeLabel: Record<string, string> = {
        Faceit:'🔴 Faceit', Premier:'⭐ Premier', GamersClub:'🛡 Gamers Club', Competitivo:'🎮 Competitivo'
    };

    if (!currentMatch && loading) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 border-4 border-yellow-500/10 rounded-full" />
                    <div className="absolute inset-0 border-4 border-t-yellow-500 rounded-full animate-spin" />
                </div>
            </div>
        );
    }
    if (!currentMatch) return null;

    const { t1, t2 } = getTeams();
    const { a: scoreA, e: scoreE } = getScore();
    const isWin = currentMatch.result === 'Win' || scoreA > scoreE;
    const mode = detectMode();
    const mapDisplay = currentMatch.mapName?.replace('de_','').split('_').map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ') || 'Mapa';
    const dateStr = new Date(currentMatch.matchDate).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
    const userData = t1.find(p=>p.isUser) || t2.find(p=>p.isUser) || t1[0];
    const allPlayers = [...t1, ...t2];
    const isVerified = !!currentMatch.metadata?.stats || currentMatch.source === 'Faceit';
    const hasRichData = allPlayers.some(p => p.utilDmg > 0 || p.flashAssists > 0 || p.fk > 0 || p.triples > 0);

    // ── TABS CONFIG ───────────────────────────────────────────────────────────
    const tabs: { id: 'placar'|'desempenho'|'utilitarios'|'confrontos'; label: string; icon: React.ReactNode }[] = [
        { id: 'placar',       label: 'Placar',       icon: <Shield size={12} /> },
        { id: 'desempenho',   label: 'Desempenho',   icon: <TrendingUp size={12} /> },
        { id: 'utilitarios',  label: 'Utilitários',  icon: <Zap size={12} /> },
        { id: 'confrontos',   label: 'Confrontos',   icon: <Crosshair size={12} /> },
    ];

    // ── SUB-COMPONENTS ────────────────────────────────────────────────────────

    /** Compact player row for main scoreboard */
    const ScoreRow = ({ p, isAlly }: { p: PlayerStats; isAlly: boolean }) => {
        const kd = (p.kills / (p.deaths || 1)).toFixed(2);
        const mvpKills = p.kills === Math.max(...(isAlly ? t1 : t2).map(x => x.kills));
        return (
            <tr className={`border-b border-white/[0.04] group transition-colors ${p.isUser ? 'bg-yellow-500/[0.05]' : 'hover:bg-white/[0.02]'}`}>
                <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg overflow-hidden border shrink-0 ${p.isUser ? 'border-yellow-500/50' : 'border-white/10'}`}>
                            {p.avatar ? (
                                <img src={p.avatar} alt="" className="w-full h-full object-cover" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
                            ) : (
                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-500 font-black">{p.nickname.charAt(0)}</div>
                            )}
                        </div>
                        <span className={`text-[11px] font-bold truncate max-w-[110px] ${p.isUser ? 'text-yellow-400' : 'text-white'}`}>
                            {p.isUser ? '★ ' : ''}{p.nickname}
                        </span>
                    </div>
                </td>
                <td className="py-2 px-2 text-center"><span className={`text-sm font-black italic ${mvpKills ? 'text-yellow-400' : 'text-white'}`}>{p.kills}</span></td>
                <td className="py-2 px-2 text-center"><span className="text-sm font-black italic text-zinc-500">{p.deaths}</span></td>
                <td className="py-2 px-2 text-center"><span className="text-xs font-bold text-zinc-600">{p.assists}</span></td>
                <td className="py-2 px-2 text-center"><span className={`text-xs font-black ${parseFloat(kd)>=1?'text-emerald-400':'text-red-400'}`}>{kd}</span></td>
                <td className="py-2 px-2 text-center"><span className="text-xs font-bold text-yellow-500/70">{p.adr > 0 ? Math.round(p.adr) : '—'}</span></td>
                <td className="py-2 px-3 text-center"><span className="text-xs text-zinc-600">{p.hs}%</span></td>
            </tr>
        );
    };

    /** Desempenho individual - rating, kast, multi-kills */
    const PerfRow = ({ p }: { p: PlayerStats }) => {
        const kd = (p.kills / (p.deaths || 1)).toFixed(2);
        const multiStr = [
            p.triples > 0 ? `${p.triples}×3K` : null,
            p.quads > 0 ? `${p.quads}×4K` : null,
            p.aces > 0 ? `${p.aces}×ACE` : null,
        ].filter(Boolean).join(' ');
        return (
            <tr className={`border-b border-white/[0.04] ${p.isUser ? 'bg-yellow-500/[0.05]' : 'hover:bg-white/[0.02]'}`}>
                <td className="py-2 px-3">
                    <span className={`text-[11px] font-bold truncate max-w-[100px] block ${p.isUser ? 'text-yellow-400' : 'text-zinc-300'}`}>
                        {p.isUser ? '★ ' : ''}{p.nickname}
                    </span>
                </td>
                <td className="py-2 px-2 text-center">
                    <span className={`text-sm font-black italic ${p.rating >= 1.2 ? 'text-yellow-400' : p.rating >= 0.9 ? 'text-white' : 'text-red-400'}`}>
                        {p.rating.toFixed(2)}
                    </span>
                </td>
                <td className="py-2 px-2 text-center">
                    <span className={`text-xs font-bold ${p.kast >= 72 ? 'text-emerald-400' : p.kast >= 60 ? 'text-zinc-300' : 'text-red-400'}`}>
                        {p.kast}%
                    </span>
                </td>
                <td className="py-2 px-2 text-center">
                    <div className="flex justify-center">
                        <div className="relative h-1.5 w-20 bg-zinc-900 rounded-full overflow-hidden">
                            <div className="absolute inset-y-0 left-0 bg-rose-500 rounded-full" style={{ width: `${Math.min(100, p.hs)}%` }} />
                        </div>
                    </div>
                    <span className="text-[9px] text-zinc-600 mt-0.5 block text-center">{p.hs}%</span>
                </td>
                <td className="py-2 px-2 text-center">
                    {p.clutches > 0
                        ? <span className="text-xs font-black text-purple-400">{p.clutches}</span>
                        : <span className="text-zinc-700">—</span>}
                </td>
                <td className="py-2 px-2 text-center">
                    {p.trades > 0
                        ? <span className="text-xs font-bold text-blue-400">{p.trades}</span>
                        : <span className="text-zinc-700">—</span>}
                </td>
                <td className="py-2 px-3 text-center">
                    {multiStr
                        ? <span className="text-[10px] font-black text-amber-400 whitespace-nowrap">{multiStr}</span>
                        : <span className="text-zinc-700 text-[10px]">—</span>}
                </td>
            </tr>
        );
    };

    /** Utilitários per player */
    const UtilRow = ({ p }: { p: PlayerStats }) => (
        <tr className={`border-b border-white/[0.04] ${p.isUser ? 'bg-yellow-500/[0.05]' : 'hover:bg-white/[0.02]'}`}>
            <td className="py-2 px-3">
                <span className={`text-[11px] font-bold truncate max-w-[100px] block ${p.isUser ? 'text-yellow-400' : 'text-zinc-300'}`}>
                    {p.isUser ? '★ ' : ''}{p.nickname}
                </span>
            </td>
            <td className="py-2 px-2 text-center"><span className={`text-sm font-black italic ${p.utilDmg > 50 ? 'text-yellow-400' : 'text-zinc-400'}`}>{p.utilDmg > 0 ? Math.round(p.utilDmg) : '—'}</span></td>
            <td className="py-2 px-2 text-center"><span className={`text-xs font-black ${p.flashAssists > 0 ? 'text-blue-400' : 'text-zinc-700'}`}>{p.flashAssists > 0 ? p.flashAssists : '—'}</span></td>
            <td className="py-2 px-2 text-center"><span className="text-xs text-zinc-500">{p.blindTime > 0 ? `${p.blindTime.toFixed(1)}s` : '—'}</span></td>
            <td className="py-2 px-2 text-center"><span className="text-xs text-red-400/70">{p.heThrown > 0 ? p.heThrown : '—'}</span></td>
            <td className="py-2 px-2 text-center"><span className="text-xs text-blue-400/70">{p.flashThrown > 0 ? p.flashThrown : '—'}</span></td>
            <td className="py-2 px-2 text-center"><span className="text-xs text-zinc-500/70">{p.smokesThrown > 0 ? p.smokesThrown : '—'}</span></td>
            <td className="py-2 px-3 text-center"><span className="text-xs text-orange-400/70">{p.molotovThrown > 0 ? p.molotovThrown : '—'}</span></td>
        </tr>
    );

    /** Confrontos (FK/FD) per player */
    const DuelRow = ({ p }: { p: PlayerStats }) => {
        const total = p.fk + p.fd;
        const fkPct = total > 0 ? Math.round((p.fk / total) * 100) : 50;
        return (
            <tr className={`border-b border-white/[0.04] ${p.isUser ? 'bg-yellow-500/[0.05]' : 'hover:bg-white/[0.02]'}`}>
                <td className="py-2 px-3">
                    <span className={`text-[11px] font-bold truncate max-w-[100px] block ${p.isUser ? 'text-yellow-400' : 'text-zinc-300'}`}>
                        {p.isUser ? '★ ' : ''}{p.nickname}
                    </span>
                </td>
                <td className="py-2 px-2 text-center">
                    <span className={`text-sm font-black italic ${p.fk > p.fd ? 'text-emerald-400' : p.fk === p.fd ? 'text-zinc-400' : 'text-red-400'}`}>{p.fk > 0 || p.fd > 0 ? p.fk : '—'}</span>
                </td>
                <td className="py-2 px-2 text-center">
                    <span className="text-sm font-black italic text-red-500/70">{p.fk > 0 || p.fd > 0 ? p.fd : '—'}</span>
                </td>
                <td className="py-2 px-2 text-center">
                    {(p.fk > 0 || p.fd > 0) ? (
                        <div className="flex flex-col items-center gap-0.5">
                            <div className="relative h-1.5 w-20 bg-red-900/40 rounded-full overflow-hidden">
                                <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full" style={{ width: `${fkPct}%` }} />
                            </div>
                            <span className="text-[9px] text-zinc-600">{fkPct}% ganhos</span>
                        </div>
                    ) : <span className="text-zinc-700">—</span>}
                </td>
                <td className="py-2 px-2 text-center">
                    <span className={`text-xs font-bold ${p.fk - p.fd > 0 ? 'text-emerald-400' : p.fk - p.fd === 0 ? 'text-zinc-500' : 'text-red-400'}`}>
                        {p.fk > 0 || p.fd > 0 ? (p.fk - p.fd > 0 ? `+${p.fk - p.fd}` : p.fk - p.fd) : '—'}
                    </span>
                </td>
                <td className="py-2 px-3 text-center">
                    <span className={`text-xs font-bold ${p.trades >= 3 ? 'text-blue-400' : 'text-zinc-600'}`}>{p.trades > 0 ? p.trades : '—'}</span>
                </td>
            </tr>
        );
    };

    const TeamBlock = ({ players, title, scoreVal, ally }: { players: PlayerStats[]; title: string; scoreVal: number; ally: boolean }) => (
        <div className={`flex-1 min-w-0 rounded-2xl overflow-hidden border ${ally
            ? (isWin ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 'border-red-500/20 bg-red-500/[0.02]')
            : 'border-white/[0.06] bg-white/[0.01]'
        }`}>
            <div className={`flex items-center justify-between px-4 py-2 border-b ${ally
                ? (isWin ? 'border-emerald-500/15 bg-emerald-500/[0.04]' : 'border-red-500/15 bg-red-500/[0.04]')
                : 'border-white/5 bg-white/[0.02]'
            }`}>
                <div className="flex items-center gap-2">
                    <Shield size={11} className={ally ? (isWin ? 'text-emerald-500' : 'text-red-400') : 'text-zinc-600'} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{title}</span>
                </div>
                <span className={`text-2xl font-black italic ${ally ? (isWin ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'}`}>{scoreVal}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/[0.05] bg-black/20">
                            {tab === 'placar' && <>
                                <th className="py-1.5 px-3 text-[9px] font-black uppercase text-zinc-700">Jogador</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">K</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">D</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">A</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">K/D</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">ADR</th>
                                <th className="py-1.5 px-3 text-[9px] font-black uppercase text-zinc-700 text-center">HS%</th>
                            </>}
                            {tab === 'desempenho' && <>
                                <th className="py-1.5 px-3 text-[9px] font-black uppercase text-zinc-700">Jogador</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">Rating</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">KAST</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">HS%</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">Clutch</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">Trade</th>
                                <th className="py-1.5 px-3 text-[9px] font-black uppercase text-zinc-700 text-center">Multikills</th>
                            </>}
                            {tab === 'utilitarios' && <>
                                <th className="py-1.5 px-3 text-[9px] font-black uppercase text-zinc-700">Jogador</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">Dano Util</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">Flash Ast</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">Cegos</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">HE</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">Flash</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">Smoke</th>
                                <th className="py-1.5 px-3 text-[9px] font-black uppercase text-zinc-700 text-center">Molotov</th>
                            </>}
                            {tab === 'confrontos' && <>
                                <th className="py-1.5 px-3 text-[9px] font-black uppercase text-zinc-700">Jogador</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">1ª Kill</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">1ª Morte</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">Win Rate</th>
                                <th className="py-1.5 px-2 text-[9px] font-black uppercase text-zinc-700 text-center">Saldo</th>
                                <th className="py-1.5 px-3 text-[9px] font-black uppercase text-zinc-700 text-center">Trocas</th>
                            </>}
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((p, i) => tab === 'placar' ? <ScoreRow key={i} p={p} isAlly={ally} />
                            : tab === 'desempenho' ? <PerfRow key={i} p={p} />
                            : tab === 'utilitarios' ? <UtilRow key={i} p={p} />
                            : <DuelRow key={i} p={p} />
                        )}
                        {Array.from({ length: Math.max(0, 5 - players.length) }).map((_, i) => (
                            <tr key={`pad-${i}`} className="border-b border-white/[0.02]">
                                <td colSpan={8} className="py-2 px-3"><span className="text-zinc-800 text-[10px]">—</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // ── RENDER ────────────────────────────────────────────────────────────────

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-5">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/85 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 16 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-5xl bg-[#0c0f15] border border-white/10 rounded-3xl shadow-[0_40px_80px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col"
                        style={{ maxHeight: 'calc(100vh - 40px)' }}
                    >
                        {/* ── HEADER ────────────────────────────────────── */}
                        <div className="relative shrink-0">
                            <img src={mapImg(currentMatch.mapName)} className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm opacity-25" alt="" />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-[#0c0f15]/60 to-[#0c0f15]" />

                            <div className="relative z-10 px-5 pt-4 pb-0 flex items-center justify-between gap-3">
                                {/* Map + mode */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-11 h-7 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                        <img src={mapImg(currentMatch.mapName)} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-black uppercase tracking-widest text-white">{mapDisplay}</span>
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-zinc-400">{modeLabel[mode]}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
                                            <span className="flex items-center gap-1"><Calendar size={8}/>{dateStr}</span>
                                            <span className="flex items-center gap-1">
                                                <div className={`w-1.5 h-1.5 rounded-full ${isVerified ? 'bg-yellow-500 animate-pulse' : 'bg-zinc-700'}`} />
                                                {isVerified ? 'Verificado' : 'Estimado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Score */}
                                <div className="flex flex-col items-center shrink-0">
                                    <span className={`text-[8px] font-black uppercase tracking-[0.3em] mb-0.5 px-2 py-0.5 rounded-full border ${isWin ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>
                                        {isWin ? 'VITÓRIA' : 'DERROTA'}
                                    </span>
                                    <div className="flex items-center gap-2.5">
                                        <span className={`text-4xl font-black italic tracking-tighter leading-none ${isWin ? 'text-white' : 'text-zinc-400'}`}>{scoreA}</span>
                                        <span className="text-xl font-black text-zinc-700 italic">—</span>
                                        <span className={`text-4xl font-black italic tracking-tighter leading-none ${!isWin ? 'text-white' : 'text-zinc-600'}`}>{scoreE}</span>
                                    </div>
                                </div>

                                {/* User quick stats + close */}
                                <div className="flex items-center gap-3">
                                    {userData && (
                                        <div className="hidden md:flex items-center gap-2.5 bg-black/30 border border-white/5 rounded-xl px-3 py-1.5">
                                            {[
                                                { label: 'K', value: userData.kills, color: 'text-white' },
                                                { label: 'D', value: userData.deaths, color: 'text-zinc-500' },
                                                { label: 'A', value: userData.assists, color: 'text-zinc-600' },
                                            ].map((s, i) => (
                                                <React.Fragment key={s.label}>
                                                    {i > 0 && <div className="w-px h-5 bg-white/5" />}
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-base font-black italic leading-none ${s.color}`}>{s.value}</span>
                                                        <span className="text-[8px] font-black text-zinc-700 uppercase">{s.label}</span>
                                                    </div>
                                                </React.Fragment>
                                            ))}
                                            {currentMatch.adr && Number(currentMatch.adr) > 0 && (
                                                <>
                                                    <div className="w-px h-5 bg-white/5" />
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-base font-black italic leading-none text-yellow-500/80">{Math.round(Number(currentMatch.adr))}</span>
                                                        <span className="text-[8px] font-black text-zinc-700 uppercase">ADR</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="w-8 h-8 rounded-xl bg-black/50 hover:bg-red-500/80 flex items-center justify-center border border-white/10 group active:scale-95 transition-all shrink-0"
                                    >
                                        <X size={14} className="text-white group-hover:rotate-90 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* TABS */}
                            <div className="relative z-10 flex items-center gap-1 px-5 mt-3 border-b border-white/[0.06]">
                                {tabs.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTab(t.id)}
                                        className={`relative flex items-center gap-1.5 px-4 py-2.5 transition-all group text-[10px] font-black uppercase tracking-widest ${tab === t.id ? 'text-yellow-400' : 'text-zinc-600 hover:text-zinc-300'}`}
                                    >
                                        <span className={tab === t.id ? 'text-yellow-500' : 'text-zinc-600 group-hover:text-zinc-400'}>{t.icon}</span>
                                        {t.label}
                                        {!hasRichData && (t.id === 'utilitarios' || t.id === 'confrontos') && (
                                            <span className="ml-0.5 text-[8px] text-zinc-700 normal-case font-bold tracking-normal">(limitado)</span>
                                        )}
                                        {tab === t.id && (
                                            <motion.div layoutId="tab-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500 rounded-t-full shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className={`h-[1px] w-full ${isWin ? 'bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent' : 'bg-gradient-to-r from-transparent via-red-500/20 to-transparent'}`} />
                        </div>

                        {/* ── BODY ──────────────────────────────────────── */}
                        <div className="flex-1 p-4 flex flex-col gap-3 min-h-0 overflow-hidden">
                            {loading && t1.length <= 1 && t1[0]?.nickname === '[Você]' ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                    <div className="relative w-10 h-10">
                                        <div className="absolute inset-0 border-4 border-yellow-500/10 rounded-full" />
                                        <div className="absolute inset-0 border-4 border-t-yellow-500 rounded-full animate-spin" />
                                    </div>
                                    <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest animate-pulse">Carregando dados da partida...</p>
                                </div>
                            ) : (
                                <motion.div
                                    key={tab}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex gap-3 flex-1 min-h-0"
                                >
                                    <TeamBlock players={t1} title="Seu Time" scoreVal={scoreA} ally={true} />
                                    <TeamBlock players={t2} title="Adversários" scoreVal={scoreE} ally={false} />
                                </motion.div>
                            )}

                            {/* Footer summary bar */}
                            {!loading && (
                                <div className="flex items-center justify-between px-1 shrink-0">
                                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-zinc-700">
                                        <span className="flex items-center gap-1"><Target size={9} className="text-yellow-500/40" /> Kills: <span className="text-zinc-500">{t1.reduce((s,p)=>s+p.kills,0)}</span></span>
                                        <span className="flex items-center gap-1"><Activity size={9} /> ADR: <span className="text-zinc-500">{t1.length>0?Math.round(t1.reduce((s,p)=>s+p.adr,0)/t1.length):'—'}</span></span>
                                        {tab === 'utilitarios' && <span className="flex items-center gap-1"><Zap size={9} className="text-yellow-500/40"/> Util: <span className="text-zinc-500">{Math.round(t1.reduce((s,p)=>s+p.utilDmg,0))}</span></span>}
                                        {tab === 'confrontos' && <span className="flex items-center gap-1"><Crosshair size={9} className="text-yellow-500/40"/> FK: <span className="text-zinc-500">{t1.reduce((s,p)=>s+p.fk,0)}</span></span>}
                                    </div>
                                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-zinc-700">
                                        {tab === 'confrontos' && <span className="flex items-center gap-1"><Crosshair size={9} className="text-zinc-700"/> FK: <span className="text-zinc-500">{t2.reduce((s,p)=>s+p.fk,0)}</span></span>}
                                        {tab === 'utilitarios' && <span className="flex items-center gap-1"><Zap size={9} className="text-zinc-700"/> Util: <span className="text-zinc-500">{Math.round(t2.reduce((s,p)=>s+p.utilDmg,0))}</span></span>}
                                        <span className="flex items-center gap-1"><Activity size={9} /> ADR: <span className="text-zinc-500">{t2.length>0?Math.round(t2.reduce((s,p)=>s+p.adr,0)/t2.length):'—'}</span></span>
                                        <span className="flex items-center gap-1"><Target size={9} className="text-yellow-500/40" /> Kills: <span className="text-zinc-500">{t2.reduce((s,p)=>s+p.kills,0)}</span></span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default MatchReportModal;
