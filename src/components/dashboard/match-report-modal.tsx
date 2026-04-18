"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Calendar, MapPin, Shield, Target, Activity,
    Zap, TrendingUp, Crosshair, Star, Flame, Eye, RefreshCw, AlertCircle,
    Clock
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
    // Campos extras do Leetify v2 para aba Confrontos
    tradeKillOpp: number;    // trade_kill_opportunities (oportunidades de abrir round com trade)
    tradedDeathOpp: number;  // traded_death_opportunities (oportunidades de morrer trocado)
    tradeKillSucc: number;   // trade_kills_succeed
    tradedDeathSucc: number; // traded_deaths_succeed
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
    const [isSyncing, setIsSyncing] = useState(false);
    const [tab, setTab] = useState<'placar' | 'desempenho' | 'utilitarios' | 'confrontos' | 'linha-tempo'>('placar');
    const [fetchError, setFetchError] = useState(false);

    const match = initialMatch || internalMatch;

    React.useEffect(() => {
        if (isOpen && matchId) {
            if (!match || !match.metadata || match.id !== matchId) {
                setInternalMatch(null);
                setFetchError(false);
                setTab('placar');
                fetchMatchData();
            }
        } else if (!isOpen) {
            setInternalMatch(null);
            setFetchError(false);
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
        } catch (e) { 
            console.error(e); 
            setFetchError(true);
        }
        finally { setLoading(false); }
    };

    const currentMatch = internalMatch?.metadata ? internalMatch : (initialMatch || internalMatch);
    
    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            // Sync all recent matches via the unified endpoint
            await axios.post('/api/sync/all');
            // Then refresh this match's detail
            await fetchMatchData();
        } catch (e: any) {
            console.error(e);
        } finally {
            setIsSyncing(false);
        }
    };

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
        const deaths  = p.deaths ?? p.total_deaths ?? parseInt(p.player_stats?.Deaths ?? '0') ?? 1; // avoid /0
        const assists = p.assists ?? p.total_assists ?? parseInt(p.player_stats?.Assists ?? '0') ?? 0;
        
        // adr: bot saves as p.dpr (alias adr), Leetify uses p.dpr or p.adr
        const adr     = p.adr ?? p.dpr ?? p.average_damage_per_round ?? parseFloat(p.player_stats?.ADR ?? '0') ?? (isUser ? currentMatch?.adr ?? 0 : 0);
        
        // rating: Bot (advancedMeta.rating), Leetify (leetify_rating)
        const rawRating = p.rating ?? p.leetify_rating ?? p.leetifyRating ?? p.ratingRatio ?? null;
        const rating  = rawRating !== null ? Number(rawRating) : (kills / deaths);
        
        // kast: Bot (0-100), Leetify (0-1 fraction or 0-100)
        let kast = 0;
        const rawKast = p.kast ?? p.kastControl ?? p.kast_percent ?? p.kast_percentage;
        if (rawKast !== undefined) {
             kast = rawKast > 1 ? rawKast : Math.round(rawKast * 100);
        }
        
        // hs: bot saves as hsPercentage (0-100), Leetify uses accuracy_head (0-1)
        const hsRaw   = p.accuracy_head !== undefined
            ? (p.accuracy_head > 1 ? Math.round(p.accuracy_head) : Math.round(p.accuracy_head * 100))
            : p.hs_percent ?? p.hs_percentage ?? p.hsPercentage
              ?? (isUser && currentMatch?.hsPercentage ? Math.round(Number(currentMatch.hsPercentage)) : 0);
        
        const avatar  = p.avatar_url || p.avatarUrl || p.avatar
                      || (isUser ? (currentMatch?.metadata?.steam_avatar ?? currentMatch?.metadata?.avatarUrl ?? '') : '')
                      || '';

        return {
            nickname: p.name || p.nickname || p.playerNickname || (isUser ? '[Você]' : 'Jogador'),
            avatar, kills, deaths, assists, adr, rating,
            hs: hsRaw, kast,
            // First Kills / Deaths — não disponível na Leetify v2, será 0
            fk: Number(p.fk ?? p.fk_count ?? p.fkd ?? p.firstKills ?? p.first_kill_count ?? 0),
            fd: Number(p.fd ?? p.fd_count ?? p.fk_deaths ?? p.firstDeaths ?? p.first_death_count ?? 0),
            // Multi-kills: Leetify v2 usa multi3k/multi4k/multi5k
            triples: Number(p.triples ?? p.multi3k ?? p.triple_kills ?? p.tripleKills ?? 0),
            quads: Number(p.quads ?? p.multi4k ?? p.quadro_kills ?? p.quad_kills ?? p.quadKills ?? 0),
            aces: Number(p.aces ?? p.multi5k ?? p.penta_kills ?? p.ace_kills ?? p.pentaKills ?? 0),
            // Misc
            clutches: Number(p.clutches ?? p.clutch_count ?? p.clutchesWon ?? 0),
            // Trades: Leetify v2 usa trade_kills_succeed
            trades: Number(p.trades ?? p.trade_kills_succeed ?? p.trade_count ?? p.tradeKills ?? 0),
            // Campos extra do Leetify v2 para aba Confrontos
            tradeKillOpp: Number(p.tradeKillOpp ?? p.trade_kill_opportunities ?? 0),
            tradedDeathOpp: Number(p.tradedDeathOpp ?? p.traded_death_opportunities ?? 0),
            tradeKillSucc: Number(p.tradeKillSucc ?? p.trade_kills_succeed ?? p.trades ?? 0),
            tradedDeathSucc: Number(p.tradedDeathSucc ?? p.traded_deaths_succeed ?? 0),
            // Utilities: Leetify v2 usa flash_assist (singular), flashbang_thrown, smoke_thrown, molotov_thrown
            utilDmg: Number(p.utilDmg ?? p.util_damage ?? p.utility_damage ?? p.utilityDamage ?? 0),
            flashAssists: Number(p.flashAssists ?? p.flash_assist ?? p.flash_assists ?? p.flashbang_assists ?? 0),
            blindTime: Number(p.blindTime ?? p.blind_time ?? p.flashbang_hit_foe_avg_duration ?? p.enemiesFlashedDuration ?? 0),
            heThrown: Number(p.heThrown ?? p.he_thrown ?? 0),
            flashThrown: Number(p.flashThrown ?? p.flash_thrown ?? p.flashbang_thrown ?? 0),
            smokesThrown: Number(p.smokesThrown ?? p.smokes_thrown ?? p.smoke_thrown ?? 0),
            molotovThrown: Number(p.molotovThrown ?? p.molotovs_thrown ?? p.molotov_thrown ?? 0),
            isUser,
            steamId: p.steam64_id || p.player_id || p.steamId || p.steam_id
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
    const hasRichData = allPlayers.some(p => p.utilDmg > 0 || p.flashAssists > 0 || p.fk > 0 || p.triples > 0 || p.smokesThrown > 0 || p.flashThrown > 0 || p.molotovThrown > 0 || p.trades > 0);


    const RoundLog = () => {
        const summaries = currentMatch?.metadata?.roundSummaries || currentMatch?.metadata?.metadata?.roundSummaries;
        if (!summaries) return null;

        const rounds = Object.keys(summaries).map(Number).sort((a, b) => a - b);

        return (
            <div className="flex flex-col gap-6 mt-2 relative">
                {/* Linha vertical central para o estilo de timeline */}
                <div className="absolute left-[21px] top-6 bottom-6 w-px bg-yellow-500/20 hidden lg:block" />

                <div className="flex items-center gap-3 px-2">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 italic">Timeline Detalhada da Partida</span>
                    <div className="h-px flex-1 bg-white/5" />
                </div>

                <div className="flex flex-col gap-6">
                    {rounds.map(rNum => {
                        const r = summaries[rNum];
                        const kills = r.kills || [];
                        const damage = r.damage || {};
                        const topDamagers = Object.entries(damage)
                            .map(([sid, d]) => ({ sid, dmg: Number(d) }))
                            .sort((a, b) => b.dmg - a.dmg)
                            .slice(0, 3);

                        return (
                            <motion.div 
                                key={rNum}
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="relative pl-0 lg:pl-12 flex flex-col gap-3 group"
                            >
                                {/* Marcador de round na timeline */}
                                <div className="absolute left-0 top-0 w-11 h-11 rounded-2xl bg-[#0c121d] border border-yellow-500/30 flex items-center justify-center z-10 hidden lg:flex group-hover:border-yellow-500 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                    <span className="text-xs font-black text-yellow-500 italic">{rNum}</span>
                                </div>

                                <div className="bg-zinc-950/40 border border-white/[0.05] rounded-3xl p-5 md:p-6 space-y-4 hover:border-white/10 transition-colors">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="lg:hidden text-xs font-black italic text-yellow-500 mr-2">R{rNum}</span>
                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-300">Resumo do Round</h4>
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-white/[0.03] px-3 py-1 rounded-full">{kills.length} Elasminaçõse</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Kills List */}
                                        <div className="space-y-2.5">
                                            <h5 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3">Confrontos</h5>
                                            {kills.length === 0 ? (
                                                <p className="text-[10px] text-zinc-700 italic">Sem eliminações registradas neste round.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {kills.map((k: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-3 text-[11px] bg-white/[0.01] p-2 rounded-xl border border-white/[0.03] hover:border-white/5 transition-colors">
                                                            <span className="text-zinc-200 font-bold truncate flex-1 text-right">{k.attackerName}</span>
                                                            <div className="flex flex-col items-center gap-0.5 shrink-0 px-2 border-x border-white/5">
                                                                {k.isHeadshot && <Target size={12} className="text-yellow-500" />}
                                                                <span className="text-[8px] font-black uppercase text-zinc-500">{k.weapon.replace("weapon_", "")}</span>
                                                            </div>
                                                            <span className="text-zinc-400 truncate flex-1">{k.victimName}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Damage Summary */}
                                        <div className="space-y-3">
                                            <h5 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3">Maiores Danos</h5>
                                            {topDamagers.length > 0 ? (
                                                <div className="space-y-2">
                                                    {topDamagers.map((d, idx) => {
                                                        const p = allPlayers.find(pl => pl.steamId === d.sid);
                                                        const pName = p?.nickname || "Jogador";
                                                        return (
                                                            <div key={d.sid} className="flex items-center justify-between bg-zinc-900/40 px-4 py-2.5 rounded-2xl border border-white/[0.02]">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${p?.team === 'CT' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                                                                    <span className="text-[11px] font-bold text-zinc-400">{pName}</span>
                                                                </div>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-sm font-black italic text-zinc-200">{d.dmg}</span>
                                                                    <span className="text-[8px] font-bold text-zinc-600 uppercase">HP</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-zinc-700 italic">Dados de dano não disponíveis.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ── TABS CONFIG ───────────────────────────────────────────────────────────
    const tabs: { id: 'placar'|'desempenho'|'utilitarios'|'confrontos'; label: string; icon: React.ReactNode }[] = [
        { id: 'placar',       label: 'Placar',       icon: <Shield size={12} /> },
        { id: 'desempenho',   label: 'Desempenho',   icon: <TrendingUp size={12} /> },
        { id: 'utilitarios',  label: 'Utilitários',  icon: <Zap size={12} /> },
        { id: 'confrontos',   label: 'Confrontos',   icon: <Crosshair size={12} /> },
        { id: 'linha-tempo',  label: 'Linha do Tempo', icon: <Clock size={12} /> },
    ];

    // ── SUB-COMPONENTS ────────────────────────────────────────────────────────

    /** Player cell with avatar + clickable profile link */
    const PlayerCell = ({ p, wide = false }: { p: PlayerStats; wide?: boolean }) => (
        <td className="py-2.5 px-3">
            <div className="flex items-center gap-2">
                <a
                    href={p.steamId ? `/player/${p.steamId}` : '#'}
                    onClick={e => { if (!p.steamId) e.preventDefault(); e.stopPropagation(); }}
                    className={`shrink-0 w-8 h-8 rounded-xl overflow-hidden border-2 block transition-opacity hover:opacity-80 ${
                        p.isUser ? 'border-yellow-500' : 'border-white/10'
                    }`}
                    title={p.steamId ? `Ver perfil de ${p.nickname}` : p.nickname}
                >
                    {p.avatar
                        ? <img src={p.avatar} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                        : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-500 font-black">{p.nickname.charAt(0)}</div>
                    }
                </a>
                <a
                    href={p.steamId ? `/player/${p.steamId}` : '#'}
                    onClick={e => { if (!p.steamId) e.preventDefault(); e.stopPropagation(); }}
                    className={`text-[11px] font-bold truncate hover:underline underline-offset-2 ${
                        wide ? 'max-w-[120px]' : 'max-w-[100px]'
                    } ${ p.isUser ? 'text-yellow-400' : 'text-white hover:text-yellow-300' }`}
                >
                    {p.isUser ? '★ ' : ''}{p.nickname}
                </a>
            </div>
        </td>
    );

    /** Compact player row for main scoreboard */
    const ScoreRow = ({ p, isAlly }: { p: PlayerStats; isAlly: boolean }) => {
        const kd = (p.kills / (p.deaths || 1)).toFixed(2);
        const mvpKills = p.kills === Math.max(...(isAlly ? t1 : t2).map(x => x.kills));
        const kdColor = parseFloat(kd) >= 1.5 ? 'text-emerald-300' : parseFloat(kd) >= 1 ? 'text-emerald-400' : 'text-red-400';
        return (
            <tr className={`border-b border-white/[0.04] group transition-colors ${p.isUser ? 'bg-yellow-500/[0.05]' : 'hover:bg-white/[0.02]'}`}>
                <PlayerCell p={p} wide />
                <td className="py-2.5 px-2 text-center"><span className={`text-sm font-black italic ${mvpKills ? 'text-yellow-400' : 'text-white'}`}>{p.kills}</span></td>
                <td className="py-2.5 px-2 text-center"><span className="text-sm font-black italic text-zinc-500">{p.deaths}</span></td>
                <td className="py-2.5 px-2 text-center"><span className="text-xs font-bold text-zinc-600">{p.assists}</span></td>
                <td className="py-2.5 px-2 text-center"><span className={`text-xs font-black px-1.5 py-0.5 rounded-lg bg-black/30 ${kdColor}`}>{kd}</span></td>
                <td className="py-2.5 px-2 text-center"><span className={`text-xs font-bold ${p.adr>=80?'text-yellow-400':p.adr>0?'text-yellow-500/60':'text-zinc-700'}`}>{p.adr > 0 ? Math.round(p.adr) : '—'}</span></td>
                <td className="py-2.5 px-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-[10px] font-bold ${p.hs>=50?'text-rose-400':p.hs>0?'text-zinc-400':'text-zinc-700'}`}>{p.hs}%</span>
                        <div className="h-0.5 w-10 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500/60 rounded-full" style={{width:`${Math.min(100,p.hs)}%`}} />
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

    /** Desempenho individual */
    const PerfRow = ({ p }: { p: PlayerStats }) => {
        const ratingC = p.rating >= 1.5 ? 'text-orange-400 bg-orange-500/10' : p.rating >= 1.2 ? 'text-yellow-400 bg-yellow-500/10' : p.rating >= 0.9 ? 'text-white bg-white/5' : 'text-red-400 bg-red-500/10';
        const kastC = p.kast >= 72 ? 'text-emerald-400' : p.kast >= 55 ? 'text-zinc-300' : 'text-red-400';
        return (
            <tr className={`border-b border-white/[0.04] ${p.isUser ? 'bg-yellow-500/[0.05]' : 'hover:bg-white/[0.02]'}`}>
                <PlayerCell p={p} />
                <td className="py-2.5 px-2 text-center">
                    <span className={`text-sm font-black italic px-1.5 py-0.5 rounded-lg ${ratingC}`}>{p.rating.toFixed(2)}</span>
                </td>
                <td className="py-2.5 px-2 text-center">
                    {p.kast > 0
                        ? <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-xs font-bold ${kastC}`}>{p.kast}%</span>
                            <div className="h-0.5 w-12 bg-zinc-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${p.kast>=72?'bg-emerald-500':p.kast>=55?'bg-zinc-400':'bg-red-500'}`} style={{width:`${Math.min(100,p.kast)}%`}} />
                            </div>
                          </div>
                        : <span className="text-zinc-700 text-xs">—</span>}
                </td>
                <td className="py-2.5 px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-[10px] font-bold ${p.hs>=50?'text-rose-400':p.hs>0?'text-zinc-400':'text-zinc-700'}`}>{p.hs > 0 ? `${p.hs}%` : '—'}</span>
                        {p.hs > 0 && <div className="h-0.5 w-12 bg-zinc-900 rounded-full overflow-hidden"><div className="h-full bg-rose-500 rounded-full" style={{width:`${Math.min(100,p.hs)}%`}} /></div>}
                    </div>
                </td>
                <td className="py-2.5 px-2 text-center">
                    {p.clutches > 0 ? <span className="text-xs font-black text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-lg">{p.clutches}×</span> : <span className="text-zinc-700">—</span>}
                </td>
                <td className="py-2.5 px-2 text-center">
                    {p.trades > 0 ? <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-lg">{p.trades}</span> : <span className="text-zinc-700">—</span>}
                </td>
                <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                        {p.triples > 0 && <span className="text-[8px] font-black text-amber-400 bg-amber-500/15 px-1 py-0.5 rounded">{p.triples}×3K</span>}
                        {p.quads > 0 && <span className="text-[8px] font-black text-orange-400 bg-orange-500/15 px-1 py-0.5 rounded">{p.quads}×4K</span>}
                        {p.aces > 0 && <span className="text-[8px] font-black text-purple-300 bg-purple-500/20 px-1 py-0.5 rounded animate-pulse">{p.aces}×ACE</span>}
                        {p.triples===0 && p.quads===0 && p.aces===0 && <span className="text-zinc-700 text-[10px]">—</span>}
                    </div>
                </td>
            </tr>
        );
    };

    /** Utilitários per player – com barras de progresso */
    const UtilRow = ({ p, maxUtil }: { p: PlayerStats; maxUtil: number }) => {
        const utilPct = maxUtil > 0 ? Math.round((p.utilDmg / maxUtil) * 100) : 0;
        const flashEff = p.flashThrown > 0 ? Math.round((p.flashAssists / p.flashThrown) * 100) : 0;
        return (
            <tr className={`border-b border-white/[0.04] ${p.isUser ? 'bg-yellow-500/[0.05]' : 'hover:bg-white/[0.02]'}`}>
                <PlayerCell p={p} />
                <td className="py-3 px-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-black italic leading-none ${p.utilDmg>=100?'text-yellow-400':p.utilDmg>0?'text-zinc-300':'text-zinc-700'}`}>{p.utilDmg>0?Math.round(p.utilDmg):'—'}</span>
                        {p.utilDmg>0&&<div className="h-0.5 w-14 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-yellow-500/70 rounded-full" style={{width:`${utilPct}%`}} /></div>}
                    </div>
                </td>
                <td className="py-3 px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs font-black leading-none ${flashEff>=50?'text-blue-400':p.flashAssists>0?'text-blue-400/60':'text-zinc-700'}`}>{p.flashAssists>0?p.flashAssists:'—'}</span>
                        {p.flashThrown>0&&<span className={`text-[8px] font-bold ${flashEff>=50?'text-blue-500/70':'text-zinc-700'}`}>{flashEff}% ef.</span>}
                    </div>
                </td>
                <td className="py-3 px-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span className={`text-xs font-bold ${p.blindTime>5?'text-cyan-400':p.blindTime>0?'text-zinc-400':'text-zinc-700'}`}>{p.blindTime>0?`${p.blindTime.toFixed(1)}s`:'—'}</span>
                        {p.blindTime>0&&<div className="h-0.5 w-12 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500/60 rounded-full" style={{width:`${Math.min(100,(p.blindTime/20)*100)}%`}} /></div>}
                    </div>
                </td>
                <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1"><span className="text-[9px]">💣</span><span className={`text-xs font-bold ${p.heThrown>0?'text-red-400':'text-zinc-700'}`}>{p.heThrown||'0'}</span></div>
                </td>
                <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1"><span className="text-[9px]">⚡</span><span className={`text-xs font-bold ${p.flashThrown>0?'text-blue-400':'text-zinc-700'}`}>{p.flashThrown||'0'}</span></div>
                </td>
                <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1"><span className="text-[9px]">💨</span><span className={`text-xs font-bold ${p.smokesThrown>0?'text-zinc-300':'text-zinc-700'}`}>{p.smokesThrown||'0'}</span></div>
                </td>
                <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1"><span className="text-[9px]">🔥</span><span className={`text-xs font-bold ${p.molotovThrown>0?'text-orange-400':'text-zinc-700'}`}>{p.molotovThrown||'0'}</span></div>
                </td>
            </tr>
        );
    };

    /** Confrontos (FK/FD) – visual duel bar */
    const DuelRow = ({ p }: { p: PlayerStats }) => {
        // FK/FD direto (parser Python) ou via oportunidades de abertura (Leetify v2)
        const hasFKFD = p.fk > 0 || p.fd > 0;
        // Quando não temos FK/FD, usamos oportunidades de trade do Leetify como proxy de agressividade
        const hasTradeData = p.tradeKillOpp > 0 || p.tradedDeathOpp > 0;
        const hasDuel = hasFKFD || hasTradeData;
        
        // Calcula duelo bar: FK vs FD, ou Trade Kills vs Traded Deaths como fallback
        const duelFk = hasFKFD ? p.fk : p.tradeKillSucc;
        const duelFd = hasFKFD ? p.fd : p.tradedDeathSucc;
        const total = duelFk + duelFd;
        const fkPct = total > 0 ? Math.round((duelFk / total) * 100) : 50;
        const saldo = duelFk - duelFd;
        
        // Badge de estilo
        const badge = hasFKFD
            ? (p.fk > p.fd ? '🥇 Abre Rounds' : p.fd > p.fk ? '💀 Vulnerável' : '= Neutro')
            : (p.tradeKillOpp > p.tradedDeathOpp ? '⚡ Agressivo' : p.tradedDeathOpp > p.tradeKillOpp ? '🛡 Reativo' : '= Neutro');
        const badgeColor = (saldo > 0 ? 'text-emerald-400 bg-emerald-500/10' : saldo < 0 ? 'text-red-400 bg-red-500/10' : 'text-zinc-500 bg-zinc-800/50');
        
        return (
            <tr className={`border-b border-white/[0.04] ${p.isUser ? 'bg-yellow-500/[0.05]' : 'hover:bg-white/[0.02]'}`}>
                <td className="py-3 px-3">
                    <div className="flex flex-col gap-0.5">
                        <a href={p.steamId?`/player/${p.steamId}`:'#'} onClick={e=>{if(!p.steamId)e.preventDefault();e.stopPropagation();}} className={`text-[11px] font-bold truncate max-w-[100px] hover:underline ${p.isUser?'text-yellow-400':'text-zinc-300 hover:text-yellow-300'}`}>{p.isUser?'★ ':''}{p.nickname}</a>
                        {hasDuel && <span className={`text-[8px] font-black px-1.5 py-0.5 rounded self-start ${badgeColor}`}>{badge}</span>}
                    </div>
                </td>
                {/* 1ª Kill */}
                <td className="py-3 px-2 text-center">
                    {hasFKFD
                        ? <span className={`text-sm font-black italic ${p.fk > p.fd ? 'text-emerald-400' : 'text-zinc-400'}`}>{p.fk}</span>
                        : hasTradeData
                            ? <div className="flex flex-col items-center">
                                <span className="text-xs font-black text-emerald-400/70">{p.tradeKillOpp}</span>
                                <span className="text-[7px] text-zinc-700 font-bold">oport.</span>
                              </div>
                            : <span className="text-zinc-700">—</span>}
                </td>
                {/* 1ª Morte */}
                <td className="py-3 px-2 text-center">
                    {hasFKFD
                        ? <span className={`text-sm font-black italic ${p.fd > p.fk ? 'text-red-400' : 'text-zinc-500'}`}>{p.fd}</span>
                        : hasTradeData
                            ? <div className="flex flex-col items-center">
                                <span className="text-xs font-black text-red-400/70">{p.tradedDeathOpp}</span>
                                <span className="text-[7px] text-zinc-700 font-bold">oport.</span>
                              </div>
                            : <span className="text-zinc-700">—</span>}
                </td>
                {/* Duelos bar */}
                <td className="py-3 px-2">
                    {hasDuel
                        ? <div className="flex flex-col items-center gap-1">
                            <div className="relative h-2.5 w-20 bg-zinc-900 rounded-full overflow-hidden flex">
                                <div className="h-full bg-emerald-500/70 rounded-l-full" style={{width:`${fkPct}%`}} />
                                <div className="h-full bg-red-500/70 rounded-r-full flex-1" />
                            </div>
                            <div className="flex justify-between w-20 text-[7px] font-black"><span className="text-emerald-600">{fkPct}%</span><span className="text-red-600">{100-fkPct}%</span></div>
                          </div>
                        : <span className="text-zinc-700 block text-center">—</span>}
                </td>
                {/* Saldo */}
                <td className="py-3 px-2 text-center">
                    {hasDuel
                        ? <span className={`text-xs font-black px-1.5 py-0.5 rounded-lg ${saldo>0?'text-emerald-400 bg-emerald-500/15':saldo<0?'text-red-400 bg-red-500/15':'text-zinc-500 bg-zinc-800/50'}`}>{saldo>0?`+${saldo}`:saldo}</span>
                        : <span className="text-zinc-700">—</span>}
                </td>
                {/* Trocas */}
                <td className="py-3 px-3 text-center">
                    {p.trades > 0
                        ? <div className="flex flex-col items-center">
                            <span className={`text-xs font-bold ${p.trades>=3?'text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-lg':'text-zinc-500'}`}>{p.trades}</span>
                          </div>
                        : <span className="text-zinc-700">—</span>}
                </td>
            </tr>
        );
    };


    const TeamBlock = ({ players, title, scoreVal, ally }: { players: PlayerStats[]; title: string; scoreVal: number; ally: boolean }) => {
        const maxUtil = Math.max(...players.map(x => x.utilDmg || 0), 1);
        const maxGrenades = Math.max(...players.map(x => (x.heThrown || 0) + (x.flashThrown || 0) + (x.smokesThrown || 0) + (x.molotovThrown || 0)), 1);

        const tabHasNoData = (tab === 'utilitarios' && players.every(p => p.utilDmg===0 && p.flashAssists===0 && p.flashThrown===0 && p.smokesThrown===0 && p.heThrown===0 && p.molotovThrown===0))
                          || (tab === 'confrontos'   && players.every(p => p.fk===0 && p.fd===0 && p.triples===0 && p.quads===0 && p.aces===0 && p.trades===0));

        return (
            <div className={`flex-1 min-w-0 rounded-2xl overflow-hidden border ${ally
                ? (isWin ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 'border-red-500/20 bg-red-500/[0.02]')
                : 'border-white/[0.06] bg-white/[0.01]'
            }`}>
                <div className={`flex items-center justify-between px-5 py-3 border-b shrink-0 ${ally
                    ? (isWin ? 'border-emerald-500/15 bg-emerald-500/[0.04]' : 'border-red-500/15 bg-red-500/[0.04]')
                    : 'border-white/5 bg-white/[0.02]'
                }`}>
                    <div className="flex items-center gap-2">
                        <Shield size={12} className={ally ? (isWin ? 'text-emerald-500' : 'text-red-400') : 'text-zinc-600'} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{title}</span>
                    </div>
                    <span className={`text-3xl font-black italic ${ally ? (isWin ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'}`}>{scoreVal}</span>
                </div>
                {tabHasNoData ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-3 p-6">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-xl">📊</div>
                        <p className="text-zinc-700 text-[10px] font-black uppercase tracking-widest text-center">
                            Dados não disponíveis<br />
                            <span className="text-zinc-800 normal-case font-normal">Requer demo analisada pelo bot</span>
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="border-b border-white/[0.05] bg-[#0c0f15]/95 backdrop-blur-sm">
                                    {tab === 'placar' && <>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600">Jogador</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">K</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">D</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">A</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">K/D</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">ADR</th>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600 text-center">HS%</th>
                                    </>}
                                    {tab === 'desempenho' && <>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600">Jogador</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">Rating</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">KAST</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">HS%</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">Clutch</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">Trade</th>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600 text-center">Multikills</th>
                                    </>}
                                    {tab === 'utilitarios' && <>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600">Jogador</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">Dano Util</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">⚡ Flash</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">👁 Cegos</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">💣 HE</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">⚡ Flas.</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">💨 Smoke</th>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600 text-center">🔥 Molotov</th>
                                    </>}
                                    {tab === 'confrontos' && <>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600">Jogador</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">🎯 1ª Kill</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">💀 1ª Morte</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">Duelos</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center">Saldo</th>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600 text-center">Trocas</th>
                                    </>}
                                </tr>
                            </thead>
                            <tbody>
                                {players.map((p, i) => tab === 'placar' ? <ScoreRow key={i} p={p} isAlly={ally} />
                                    : tab === 'desempenho' ? <PerfRow key={i} p={p} />
                                    : tab === 'utilitarios' ? <UtilRow key={i} p={p} maxUtil={maxUtil} />
                                    : <DuelRow key={i} p={p} />
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    // ── RENDER ────────────────────────────────────────────────────────────────

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-1 md:p-2">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 20 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-[1350px] bg-[#0c0f15] border border-white/10 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.85)] overflow-x-hidden overflow-y-auto flex flex-col"
                        style={{ maxHeight: 'calc(100vh - 12px)' }}
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
                                    <button
                                        onClick={handleSync}
                                        disabled={isSyncing}
                                        className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center gap-2 border border-white/10 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Atualizar partidas e recarregar dados"
                                    >
                                        <RefreshCw size={12} className={isSyncing ? "animate-spin text-yellow-500" : ""} />
                                        <span className="hidden sm:inline">{isSyncing ? 'Atualizando...' : 'Atualizar'}</span>
                                    </button>
                                    
                                    {userData && (
                                        <div className="hidden md:flex items-center gap-2.5 bg-black/30 border border-white/5 rounded-xl px-3 py-1.5">
                                            {[
                                                { label: 'K', value: userData.kills, color: 'text-white' },
                                                { label: 'D', value: userData.deaths, color: 'text-zinc-500' },
                                                { label: 'A', value: userData.assists, color: 'text-zinc-600' },
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
                        <div className="p-4 flex flex-col gap-3">
                            {fetchError ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 bg-red-500/[0.03] border border-red-500/10 rounded-3xl gap-4">
                                    <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-2 shadow-inner">
                                        <AlertCircle size={32} />
                                    </div>
                                    <h4 className="text-xl font-black uppercase italic tracking-tighter text-red-400">Falha ao Carregar Jogadores</h4>
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center max-w-lg leading-relaxed">
                                        Não foi possível obter os dados da partida. A API do provedor externo pode estar indisponível no momento, ou a partida expirou e não pôde ser recuperada.
                                    </p>
                                </div>
                            ) : loading && t1.length <= 1 && t1[0]?.nickname === '[Você]' ? (
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
                                    className="flex gap-3 items-start"
                                >
                                    <TeamBlock players={t1} title="Seu Time" scoreVal={scoreA} ally={true} />
                                    <TeamBlock players={t2} title="Adversários" scoreVal={scoreE} ally={false} />
                                </motion.div>
                            )}

                            {/* Footer summary bar */}
                            {!loading && !fetchError && (
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
