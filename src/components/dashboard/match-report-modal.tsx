"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, Download, Calendar, Activity, Target, Zap, Clock, Shield, Search, RefreshCw, X, 
    AlertCircle, Crosshair, TrendingUp, Star, Flame, Eye, MapPin, Trophy, Swords, Info, Edit2, Check,
    Trash2, Heart, Calculator, LogOut, UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useSession } from 'next-auth/react';

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
    clutches: number | null;
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
    // New Advanced Stats
    enemiesFlashed?: number;
    ttd?: number;
    killDist?: number;
    totalDamage: number;
    isUser?: boolean;
    steamId?: string;
    team?: string;
    eloChange?: number | null;
    eloAfter?: number | null;
    isSub?: boolean;
    isLeaver?: boolean;
    metadata?: any;
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
    onSync?: () => void;
}

// ── COMPONENT ────────────────────────────────────────────────────────────────

const MatchReportModal: React.FC<Props> = ({
    match: initialMatch, matchId, isOpen, onClose, userSteamId, userNickname, onSync
}) => {
    const { data: session } = useSession();
    const [internalMatch, setInternalMatch] = useState<Match | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isEditingScore, setIsEditingScore] = useState(false);
    const [editScoreA, setEditScoreA] = useState(0);
    const [editScoreB, setEditScoreB] = useState(0);
    const [isSavingScore, setIsSavingScore] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [tab, setTab] = useState<'placar' | 'desempenho' | 'utilitarios' | 'armas' | 'confrontos' | 'linha-tempo' | 'duelos'>('placar');
    const [fetchError, setFetchError] = useState(false);
    const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

    const match = initialMatch || internalMatch;

    React.useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isOpen && matchId) {
            const isProcessing = (match as any)?.status === 'processing' || (match as any)?.is_processing;

            // Fetch if no match, no metadata, or if metadata is missing rich data (roundSummaries)
            if (!match || !match.metadata || !match.metadata.roundSummaries || match.id !== matchId || isProcessing) {
                // If it's a different match, clear the internal state first
                if (match?.id !== matchId) {
                    setInternalMatch(null);
                }
                setFetchError(false);
                fetchMatchData();

                // If currently processing, poll every 8 seconds
                if (isProcessing || (!match?.metadata?.roundSummaries && matchId)) {
                    interval = setInterval(() => {
                        setIsAutoRefreshing(true);
                        fetchMatchData().finally(() => setIsAutoRefreshing(false));
                    }, 8000);
                }
            }
        } else if (!isOpen) {
            setInternalMatch(null);
            setFetchError(false);
            setTab('placar');
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isOpen, matchId, (match as any)?.is_processing, (match as any)?.status]);


    const fetchMatchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/match/${matchId}${userSteamId ? `?profileSteamId=${userSteamId}` : ''}`);
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

    const handleUpdateScore = async () => {
        setIsSavingScore(true);
        try {
            // Determine user team with multiple ID format checks
            const meta = currentMatch?.metadata || {};
            const stats: any[] = meta.stats || currentMatch?.players || [];
            const userP = stats.find(p => {
                const sid = p.steam64_id || p.steamId || p.player_id || p.steamid64;
                return sid === userSteamId || String(sid) === String(userSteamId);
            });
            
            let myLogicalTeam = userP?.team || userP?.initial_team_number || 'A';
            
            // Normalize team identifiers - Consistent with isTeamA check in API and elsewhere
            const teamStr = String(myLogicalTeam).toUpperCase();
            const isA = teamStr === 'A' || teamStr === 'CT' || teamStr === '3';
            const normalizedTeam = isA ? 'A' : 'B';

            let finalLogicalA = editScoreA;
            let finalLogicalB = editScoreB;

            // If user is on Team B, their UI Score A (Left) corresponds to Logical B in the database
            if (normalizedTeam === 'B') {
                finalLogicalA = editScoreB;
                finalLogicalB = editScoreA;
            }

            console.log(`[ScoreUpdate] User=${userSteamId} Team=${normalizedTeam} LeftScore=${editScoreA} RightScore=${editScoreB} -> LogicalA=${finalLogicalA} LogicalB=${finalLogicalB}`);

            await axios.patch(`/api/match/${currentMatch.id}`, {
                scoreA: finalLogicalA,
                scoreB: finalLogicalB
            });
            
            toast.success("Resultado atualizado!");
            setIsEditingScore(false);
            window.location.reload();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar o placar.");
        } finally {
            setIsSavingScore(false);
        }
    };

    const handleRecalculateTropoints = async () => {
        if (isRecalculating || !currentMatch?.id) return;
        setIsRecalculating(true);
        try {
            const res = await axios.post('/api/admin/recalculate-match-elo', { matchId: currentMatch.id });
            toast.success(res.data.message || 'Tropoints recalculados com sucesso!');
            await fetchMatchData();
        } catch (error: any) {
            toast.error('Erro ao recalcular: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsRecalculating(false);
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

    const weaponImg = (name: string) => {
        if (!name) return '';
        let cleanName = name.toLowerCase().replace('weapon_', '').trim();
        
        if (cleanName === 'world' || cleanName === 'worldspawn') {
            return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="m12.5 17-.5-1-.5 1h1z"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/></svg>';
        }

        if (cleanName === 'smokegrenade' || cleanName === 'smoke') {
            return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7"/><path d="M17 21H9"/></svg>';
        }
        
        
        // Manual mapping for special cases to match the ChetdeJong/cs2-killfeed-generator naming
        const MAPPING: Record<string, string> = {
            'm4a1_s': 'm4a1_silencer',
            'm4a1-s': 'm4a1_silencer',
            'm4a1_silencer': 'm4a1_silencer',
            'm4a1': 'm4a1',
            'm4a1_silencer_off': 'm4a1_silencer_off',
            'usp_s': 'usp_silencer',
            'usp-s': 'usp_silencer',
            'usp_silencer': 'usp_silencer',
            'usp_silencer_off': 'usp_silencer_off',
            'deagle': 'deagle',
            'desert_eagle': 'deagle',
            'p2000': 'hkp2000',
            'hkp2000': 'hkp2000',
            'revolver': 'revolver',
            'r8': 'revolver',
            'scout': 'ssg08',
            'ssg08': 'ssg08',
            'hegrenade': 'hegrenade',
            'smokegrenade': 'smokegrenade',
            'smoke': 'smokegrenade',
            'flashbang': 'flashbang',
            'inferno': 'inferno',
            'molotov': 'molotov',
            'incgrenade': 'incgrenade',
            'decoy': 'decoy',
            'c4': 'planted_c4',
            'planted_c4': 'planted_c4',
            'zeus': 'taser',
            'taser': 'taser',
            'zeus27': 'taser',
            'bayonet': 'bayonet',
            'knife': 'knife',
            'knifegg': 'knifegg',
            'knife_t': 'knife_t',
            'knife_ct': 'knife',
            'knife_butterfly': 'knife_butterfly',
            'knife_karambit': 'knife_karambit',
            'knife_m9_bayonet': 'knife_m9_bayonet',
            'knife_flip': 'knife_flip',
            'knife_gut': 'knife_gut',
            'knife_falchion': 'knife_falchion',
            'knife_tactical': 'knife_tactical',
            'knife_survival_bowie': 'knife_survival_bowie',
            'knife_stiletto': 'knife_stiletto',
            'knife_ursus': 'knife_ursus',
            'knife_widowmaker': 'knife_widowmaker',
            'knife_canis': 'knife_canis',
            'knife_cord': 'knife_cord',
            'knife_outdoor': 'knife_outdoor',
            'knife_skeleton': 'knife_skeleton',
            'knife_kukri': 'knife_kukri',
            'knife_bowie': 'knife_bowie',
            'knife_css': 'knife_css',
            'knife_gypsy_jackknife': 'knife_gypsy_jackknife',
            'knife_push': 'knife_push',
            'knife_twinblade': 'knife_twinblade',
            'flashbang_assist': 'flashbang_assist',
        };



        const finalName = MAPPING[cleanName] || cleanName;
        return `https://raw.githubusercontent.com/ChetdeJong/cs2-killfeed-generator/master/public/weapons/${finalName}.svg`;
    };

    const getSideColor = (side: string) => {
        if (side === 'CT') return 'text-sky-400';
        if (side === 'T') return 'text-orange-400';
        return 'text-zinc-500';
    };

    const getSideBg = (side: string) => {
        if (side === 'CT') return 'bg-sky-500/10 border-sky-500/20';
        if (side === 'T') return 'bg-orange-500/10 border-orange-500/20';
        return 'bg-white/5 border-white/10';
    };



    const isUserP = (p: any) => {
        if (!p) return false;

        // Priority 1: Server-set flag (most reliable — set using profileSteamId query param)
        if (p.is_user === true || p.isUser === true) return true;

        // Priority 2: Direct SteamID match
        const pS = String(p.player_id || p.steam64_id || p.steamId || p.steam_id || p.steamid || '').trim();
        const uS = String(userSteamId || '').trim();
        if (uS && pS && pS === uS) return true;

        // Priority 3: Nickname match (case-insensitive)
        const pN = String(p.nickname || p.name || p.personaname || '').toLowerCase().trim();
        const uN = String(userNickname || '').toLowerCase().trim();
        if (uN && pN && (pN === uN || pN.includes(uN) || uN.includes(pN))) return true;

        return false;
    };

    const handleRemovePlayer = async (steamId: string) => {
        if (!window.confirm('Tem certeza que deseja remover este jogador da partida? Isso limpará as estatísticas dele deste registro.')) return;
        
        try {
            const res = await axios.delete(`/api/match/${matchId}?steamId=${steamId}`);
            if (res.data.success) {
                toast.success('Jogador removido com sucesso!');
                if (onSync) onSync();
                else window.location.reload();
            }
        } catch (error: any) {
            console.error('Error removing player:', error);
            toast.error('Erro ao remover jogador: ' + (error.response?.data?.error || error.message));
        }
    };

    const normalizeP = (p: any, isUser = false, team?: string): PlayerStats => {
        // Robust value searcher
        const m = (p.metadata && typeof p.metadata === 'object' && !Array.isArray(p.metadata)) ? p.metadata : {};
        const get = (...keys: string[]) => {
            for (const k of keys) {
                if (p[k] !== undefined && p[k] !== null && p[k] !== '') return p[k];
                if (m[k] !== undefined && m[k] !== null && m[k] !== '') return m[k];
            }
            return undefined;
        };

        const kills   = Number(get('kills', 'total_kills', 'totalKills') ?? 0);
        const deaths  = Number(get('deaths', 'total_deaths', 'totalDeaths') ?? 1);
        const assists = Number(get('assists', 'total_assists', 'totalAssists') ?? 0);
        const adr     = Number(get('adr', 'dpr', 'avg_damage', 'avgDamage') ?? 0);
        
        const hsRaw   = get('hsPercentage', 'accuracy_head', 'hs_percentage', 'hs_percent');
        const kast    = get('kast', 'kast_percent', 'kastPercent');
        
        const nickname = String(get('nickname', 'name', 'personaname', 'playerNickname', 'player_name') || p.user?.name || (isUser ? '[Você]' : 'Jogador'));
        const avatar   = String(get('avatar_url', 'avatar', 'image') || p.user?.image || '');

        return {
            id: String(p.id || p.steamId || p.steam64_id || ''),
            steamId: String(p.steamId || p.steam64_id || p.player_id || ''),
            nickname,
            avatar,
            kills,
            deaths,
            assists,
            adr,
            rating: Number(get('rating', 'leetify_rating', 'impact_rating') ?? 0),
            hs: Number(hsRaw !== undefined ? (Number(hsRaw) > 1 ? hsRaw : Number(hsRaw) * 100) : 0),
            kast: Number(kast !== undefined ? (Number(kast) < 1 ? Number(kast) * 100 : kast) : 0),
            mvps: Number(get('mvps', 'mvp_stars', 'mvp') ?? 0),
            fk: Number(get('fk', 'firstKills', 'first_kills', 'entry_kill_count') ?? 0),
            fd: Number(get('fd', 'firstDeaths', 'first_deaths', 'entry_death_count', 'fk_deaths') ?? 0),
            triples: Number(get('triples', 'multi3k', 'triple_kills', 'tripleKills') ?? 0),
            quads: Number(get('quads', 'multi4k', 'quad_kills', 'quadKills') ?? 0),
            aces: Number(get('aces', 'multi5k', 'penta_kills', 'pentaKills', 'ace_kills') ?? 0),
            trades: Number(get('trades', 'trade_kills_succeed', 'trade_count', 'tradeKills', 'trade_kill_count') ?? 0),
            tradeKillSucc: Number(get('trade_kills_succeed', 'tradeKillSucc', 'trade_kill_count') ?? 0),
            tradedDeathSucc: Number(get('traded_deaths_succeed', 'tradedDeathSucc', 'trade_death_count') ?? 0),
            tradeKillOpp: Number(get('trade_kill_opportunities', 'tradeKillOpp') ?? 0),
            tradedDeathOpp: Number(get('traded_death_opportunities', 'tradedDeathOpp') ?? 0),
            clutches: Number(get('clutches', 'clutch_count', 'clutches_won', 'clutchesWon') ?? 0),
            clutchesWon: Number(get('clutches_won', 'clutchesWon', 'clutch_count') ?? 0),
            flashAssists: Number(get('flash_assists', 'flashAssists', 'flash_assist') ?? 0),
            utilDmg: Number(get('utilDmg', 'util_damage', 'utility_damage', 'utilityDamage') ?? 0),
            blindTime: Number(get('blind_time', 'blindTime', 'total_blind_duration') ?? 0),
            heThrown: Number(get('he_thrown', 'heThrown') ?? 0),
            flashThrown: Number(get('flash_thrown', 'flashThrown', 'flashbang_thrown') ?? 0),
            smokesThrown: Number(get('smokes_thrown', 'smokesThrown', 'smoke_thrown') ?? 0),
            molotovThrown: Number(get('molotov_thrown', 'molotovThrown', 'molotovs_thrown') ?? 0),
            enemiesFlashed: Number(get('enemies_flashed', 'enemiesFlashed', 'flashbang_hit_foe') ?? 0),
            ttd: Number(get('ttd', 'avg_ttd', 'avgTtd') ?? 0),
            killDist: Number(get('killDist', 'avg_kill_distance', 'avgKillDist') ?? 0),
            totalDamage: Number(get('total_damage', 'totalDamage', 'rawDmg', 'raw_dmg', 'totalDamageDealt') ?? (adr * (Number(get('rounds_count', 'total_rounds')) || (currentMatch?.metadata?.roundSummaries ? Object.keys(currentMatch.metadata.roundSummaries).length : (currentMatch.scoreA || 0) + (currentMatch.scoreB || 0)) || 0))),
            eloChange: get('eloChange', 'elo_change') ?? null,
            eloAfter: get('eloAfter', 'elo_after') ?? null,
            isUser,
            team: team || String(p.team || p.team_id || ''),
            metadata: m,
            isSub: p.isSub ?? m.isSub ?? false,
            isLeaver: p.isLeaver ?? m.isLeaver ?? false,
        };
    };

    const handleUpdatePlayerStatus = async (steamId: string, field: 'isSub' | 'isLeaver', value: boolean) => {
        try {
            const res = await axios.post('/api/admin/match-player-status', {
                matchId: currentMatch?.id,
                steamId,
                field,
                value
            });
            if (res.data.success) {
                toast.success('Status do jogador atualizado!');
                await fetchMatchData();
            }
        } catch (error: any) {
            console.error('Error updating player status:', error);
            toast.error('Erro ao atualizar status: ' + (error.response?.data?.error || error.message));
        }
    };

    const getTeams = (): { t1: PlayerStats[]; t2: PlayerStats[] } => {
        const meta = currentMatch?.metadata || {};

        const byKills = (a: PlayerStats, b: PlayerStats) => b.kills - a.kills;
        if (meta.fullStats?.rounds?.[0]?.teams) {
            let [a, b] = meta.fullStats.rounds[0].teams;
            
            // Check if user is in team B to swap
            const playersB = b.players || [];
            if (playersB.some((p: any) => isUserP(p))) {
                [a, b] = [b, a];
            }

            return {
                t1: (a.players||[]).map((p:any)=>normalizeP(p,isUserP(p), a.side || a.teamSide || 'CT')).sort(byKills),
                t2: (b.players||[]).map((p:any)=>normalizeP(p,isUserP(p), b.side || b.teamSide || 'T')).sort(byKills)
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
                t1: t1.map((p:any)=>normalizeP(p,isUserP(p), 'CT')).sort(byKills),
                t2: t2.map((p:any)=>normalizeP(p,isUserP(p), 'T')).sort(byKills)
            };
        }
        const players = meta.stats || meta.players || currentMatch?.players || [];
        if (players && Array.isArray(players) && players.length > 0) {
            const teamMap: Record<string, any[]> = {};
            players.forEach((p: any) => {
                // Normalize team identifier
                let t = String(p.team || p.initial_team_number || p.team_id || 'x').toUpperCase();
                // Treat CT/A/3 as one group and T/B/2 as another
                if (['A', 'CT', '3'].includes(t)) t = 'TEAM_A';
                else if (['B', 'T', 'TR', '2', 'TERRORIST'].includes(t)) t = 'TEAM_B';
                
                if (!teamMap[t]) teamMap[t] = [];
                teamMap[t].push(p);
            });

            const teamIds = Object.keys(teamMap).filter(id => id !== 'x').sort();
            
            let t1Raw: any[] = [];
            let t2Raw: any[] = [];

            if (teamIds.length >= 2) {
                t1Raw = teamMap[teamIds[0]]; // Usually TEAM_A
                t2Raw = teamMap[teamIds[1]]; // Usually TEAM_B
            } else if (teamIds.length === 1) {
                // Only one team identified? Might be all on one side or others are 'x'
                t1Raw = teamMap[teamIds[0]];
                t2Raw = teamMap['x'] || [];
            } else {
                t1Raw = players.slice(0, Math.ceil(players.length / 2));
                t2Raw = players.slice(Math.ceil(players.length / 2));
            }

            if (t2Raw.some(isUserP)) {
                [t1Raw, t2Raw] = [t2Raw, t1Raw];
            }

            return {
                t1: t1Raw.map((p:any)=>normalizeP(p,isUserP(p), 'CT')).sort(byKills),
                t2: t2Raw.map((p:any)=>normalizeP(p,isUserP(p), 'T')).sort(byKills)
            };
        }
        return {
            t1: [
                normalizeP({nickname:'[Você]',kills:currentMatch?.kills,deaths:currentMatch?.deaths,assists:currentMatch?.assists,adr:currentMatch?.adr},true, 'CT'),
                normalizeP({nickname:'Aliado 1'},false, 'CT'),normalizeP({nickname:'Aliado 2'},false, 'CT'),
                normalizeP({nickname:'Aliado 3'},false, 'CT'),normalizeP({nickname:'Aliado 4'},false, 'CT'),
            ],
            t2: [normalizeP({nickname:'Inimigo 1'},false, 'T'),normalizeP({nickname:'Inimigo 2'},false, 'T'),
                 normalizeP({nickname:'Inimigo 3'},false, 'T'),normalizeP({nickname:'Inimigo 4'},false, 'T'),normalizeP({nickname:'Inimigo 5'},false, 'T')]
        };
    };

    const getScore = () => {
        if (!currentMatch) return { a: 0, e: 0 };
        const meta = currentMatch.metadata || {};
        const stats: any[] = meta.stats || [];

        // --- Step 1: Find the profile owner in the player stats ---
        const uP = stats.find(isUserP);
        const uT = uP?.initial_team_number != null ? String(uP.initial_team_number) : null;
        const eT = uT
            ? stats.find((s: any) => s.initial_team_number != null && String(s.initial_team_number) !== uT)
                  ?.initial_team_number != null
                ? String(stats.find((s: any) => s.initial_team_number != null && String(s.initial_team_number) !== uT)!.initial_team_number)
                : null
            : null;

        const gA = currentMatch.scoreA;
        const gB = currentMatch.scoreB;
        if (gA !== undefined && gB !== undefined) {
            const isTeamB = uT === '3' || uT === 'B' || uT?.toLowerCase() === 'b';
            return isTeamB ? { a: Number(gB), e: Number(gA) } : { a: Number(gA), e: Number(gB) };
        }

        const parts = (currentMatch.score || '').split(/[^\d]+/).map(Number).filter(n => !isNaN(n));
        if (parts.length >= 2) {
            const isTeamB = uT === '3' || uT === 'B' || uT?.toLowerCase() === 'b';
            return isTeamB ? { a: parts[1], e: parts[0] } : { a: parts[0], e: parts[1] };
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

    const isProcessing = (currentMatch as any)?.status === 'processing' || 
                         (currentMatch as any)?.is_processing || 
                         (!(currentMatch.metadata?.roundSummaries || currentMatch.metadata?.metadata?.roundSummaries || currentMatch.metadata?.round_summaries) && 
                          (currentMatch.source === 'Steam' || currentMatch.demo_url || currentMatch.metadata?.demoUrl));

    const { t1, t2 } = getTeams();

    // ── Compute score from teams perspective ──────────────────────────────
    // t1 is always the profile owner's team. We look up their team number
    // in the stats metadata and fetch their team score directly.
    const computeScore = (): { a: number; e: number } => {
        const meta = currentMatch?.metadata || {};
        const stats: any[] = meta.stats || [];

        // Find any t1 player in stats to learn their team number
        const t1StatEntry = t1.reduce<any>((found, p) => {
            if (found) return found;
            const sid = String(p.steamId || '');
            return sid ? stats.find((s: any) =>
                String(s.player_id || s.steam64_id || s.steamId || s.steam_id || '') === sid
            ) : null;
        }, null);

        const myTeam = t1StatEntry?.initial_team_number != null
            ? String(t1StatEntry.initial_team_number) : null;
        const enemyTeam = myTeam
            ? stats.find((s: any) =>
                s.initial_team_number != null && String(s.initial_team_number) !== myTeam
              )?.initial_team_number?.toString() ?? null
            : null;

        const teamScore = (num: string | null): number | null => {
            if (!num) return null;
            for (const k of [`team_${num}_score`, `team${num}Score`, `team${num}_score`]) {
                if (meta[k] !== undefined) return Number(meta[k]);
            }
            return null;
        };

        const getRawScores = (): { a: number; e: number } => {
            const my = teamScore(myTeam);
            const enemy = teamScore(enemyTeam);
            if (my !== null && enemy !== null) return { a: my, e: enemy };

            const gA = currentMatch?.scoreA, gB = currentMatch?.scoreB;
            if (gA !== undefined && gB !== undefined) {
                const isB = myTeam === '3' || myTeam?.toLowerCase() === 'b';
                return isB ? { a: Number(gB), e: Number(gA) } : { a: Number(gA), e: Number(gB) };
            }

            const parts = (currentMatch?.score || '').split(/[^\d]+/).map(Number).filter(n => !isNaN(n));
            if (parts.length >= 2) {
                const isB = myTeam === '3' || myTeam?.toLowerCase() === 'b';
                return isB ? { a: parts[1], e: parts[0] } : { a: parts[0], e: parts[1] };
            }
            return { a: 0, e: 0 };
        };

        const { a, e } = getRawScores();
        const res = (currentMatch.result || '').toLowerCase();
        const isW = res === 'win' || res === 'vitória' || res === 'vitoria';
        const isL = res === 'loss' || res === 'derrota';
        
        // Final safeguard: if official result contradicts score positions, swap them.
        if (isW && a < e) return { a: e, e: a };
        if (isL && a > e) return { a: e, e: a };
        
        return { a, e };
    };

    const { a: scoreA, e: scoreE } = computeScore();
    const resultLower = (currentMatch.result || '').toLowerCase();
    const isWin = resultLower === 'win' || resultLower === 'vitória' || resultLower === 'vitoria';
    const isLoss = resultLower === 'loss' || resultLower === 'derrota';
    const isTie = resultLower === 'tie' || resultLower === 'draw' || resultLower === 'empate' || (!isWin && !isLoss && scoreA === scoreE && scoreA > 0);
    
    const resultText = isWin ? 'VITÓRIA' 
                     : isLoss ? 'DERROTA'
                     : isTie ? 'EMPATE'
                     : 'PARTIDA';
    const mode = detectMode();
    const mapDisplay = (currentMatch.mapName?.replace('de_','') || '').split('_').map((w:string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ') || 'Mapa';
    const dateStr = currentMatch.matchDate ? new Date(currentMatch.matchDate).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' }) : 'Data desconhecida';
    const hasRichData = !!(
        currentMatch?.metadata?.fullStats || 
        currentMatch?.metadata?.roundSummaries || 
        currentMatch?.metadata?.round_summaries ||
        currentMatch?.metadata?.metadata?.roundSummaries ||
        currentMatch?.metadata?.metadata?.round_summaries ||
        currentMatch?.metadata?.match_details?.round_summaries ||
        currentMatch?.metadata?.metadata?.match_details?.round_summaries
    );
    const isVerified = hasRichData;
    const userData = t1.find(p => p.isUser) || t2.find(p => p.isUser);
    
    const RoundLog = () => {
        const allPlayers = [...t1, ...t2];
        const summaries = currentMatch?.metadata?.roundSummaries 
                       || currentMatch?.metadata?.round_summaries
                       || currentMatch?.metadata?.metadata?.roundSummaries
                       || currentMatch?.metadata?.metadata?.round_summaries
                       || currentMatch?.metadata?.match_details?.round_summaries;
        if (!summaries) return (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-600 bg-black/20 rounded-[32px] border border-white/[0.03]">
                <Clock size={48} strokeWidth={1} className="mb-4 text-yellow-500/20" />
                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Linha do tempo indisponível</h4>
                <p className="text-[10px] uppercase text-zinc-700 mt-2 font-bold tracking-widest">Requer análise profunda da demo</p>
            </div>
        );
        
        const rounds = Object.keys(summaries).map(Number).sort((a, b) => a - b);
        

        return (
            <div className="flex flex-col gap-8 mt-6 relative pb-10">
                {/* Linha vertical centralizada estilo battlelog */}
                <div className="absolute left-[24px] top-4 bottom-0 w-[2px] bg-gradient-to-b from-yellow-500/30 via-white/5 to-transparent hidden md:block" />

                {rounds.map((rNum, idx) => {
                    const r = summaries[rNum];
                    const kills = r.kills || [];
                    const winner = r.winner || "";
                    const reason = r.reason || "";
                    const survivors = allPlayers.filter(p => !kills.some((k: any) => k.victimName === p.nickname));

                    return (
                        <motion.div 
                            key={rNum}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.05 }}
                            className="relative md:pl-16 group"
                        >
                            {/* Marcador de Round Flutuante */}
                            <div className={`absolute left-0 top-0 w-12 h-12 rounded-[18px] border-2 flex flex-col items-center justify-center z-10 shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-yellow-500/10 ${
                                winner === 'CT' ? 'bg-[#0f172a] border-sky-500/40 text-sky-400' : 
                                winner === 'T' ? 'bg-[#1c1917] border-orange-500/40 text-orange-400' : 
                                'bg-zinc-900 border-white/10 text-zinc-500'
                            }`}>
                                <span className="text-[7px] font-black uppercase leading-none mb-0.5 tracking-tighter opacity-50">RD</span>
                                <span className="text-xl font-black italic leading-none">{rNum}</span>
                            </div>

                            <div className="bg-[#0c0f15] border border-white/[0.04] rounded-[32px] overflow-hidden shadow-xl transition-all group-hover:border-white/10">
                                {/* Round Header - Estilo Minimalista Premium */}
                                <div className="px-8 py-5 border-b border-white/[0.03] flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-white/[0.02] to-transparent">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-1">Resultado do Round</h4>
                                            <div className="flex items-center gap-3">
                                                <div className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 border ${getSideBg(winner)} ${getSideColor(winner)}`}>
                                                    {winner === 'CT' ? <Shield size={12} fill="currentColor" className="opacity-40" /> : <Target size={12} fill="currentColor" className="opacity-40" />}
                                                    {winner === 'CT' ? 'Counter-Terrorists' : 'Terrorists'}
                                                </div>
                                                {reason && (
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/[0.05]">
                                                        {String(reason).replace('ct_win_', '').replace('t_win_', '').replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-center">
                                            <span className="text-xl font-black italic text-zinc-300">{kills.length}</span>
                                            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Baixas</span>
                                        </div>
                                        <div className="w-px h-8 bg-white/5" />
                                        <div className="flex flex-col items-center">
                                            <span className="text-xl font-black italic text-zinc-300">{survivors.length}</span>
                                            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Vivos</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-black/10">
                                    {/* Kill Feed do Round */}
                                    <div className="space-y-1 mb-6">
                                        {kills.length === 0 ? (
                                            <div className="py-6 text-center">
                                                <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest italic">Nenhum evento registrado</p>
                                            </div>
                                        ) : (
                                            kills.map((k: any, kIdx: number) => {
                                                const attSide = k.attackerSide || (allPlayers.find(p => p.nickname === k.attackerName)?.team) || "unknown";
                                                const vicSide = k.victimSide || (allPlayers.find(p => p.nickname === k.victimName)?.team) || "unknown";
                                                const weapon = k.weapon?.replace("weapon_", "").replace("_", " ").toUpperCase() || "unknown";
                                                const dmg = k.damage || k.dmg || k.hp_dmg || null;
                                                
                                                return (
                                                    <div key={kIdx} className="group/kill relative flex items-center gap-4 px-6 py-2.5 rounded-2xl transition-all hover:bg-white/[0.03]">
                                                        {/* Atacante */}
                                                        <div className="flex-1 flex justify-end items-center gap-4">
                                                            <div className="flex flex-col items-end">
                                                                <span className={`text-[13px] font-black italic tracking-tight transition-all group-hover/kill:scale-105 ${getSideColor(attSide)}`}>
                                                                    {k.attackerName}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    {k.attackerHp !== undefined && (
                                                                        <span className="text-[9px] font-black text-emerald-500/80" title="HP no momento do confronto">{k.attackerHp} HP</span>
                                                                    )}
                                                                    <span className="text-[8px] font-black uppercase text-zinc-700 tracking-widest opacity-60">{attSide}</span>
                                                                </div>
                                                            </div>
                                                            <div className={`w-1.5 h-7 rounded-full ${attSide === 'CT' ? 'bg-sky-500 shadow-[0_0_12px_rgba(56,189,248,0.4)]' : 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)]'}`} />
                                                        </div>

                                                        {/* Weapon / Action */}
                                                        <div className="flex flex-col items-center gap-1 min-w-[180px]">
                                                            <div className="w-full px-4 py-2 rounded-xl bg-zinc-950/50 border border-white/[0.03] flex items-center justify-center gap-3 group-hover/kill:border-white/10 transition-all shadow-inner">
                                                                <img 
                                                                    src={weaponImg(k.weapon)} 
                                                                    alt={weapon}
                                                                    title="Arma do Atacante"
                                                                    className="h-[16px] w-auto brightness-0 invert opacity-60 group-hover/kill:opacity-100 transition-opacity drop-shadow-lg"
                                                                />
                                                                {k.isHeadshot && (
                                                                    <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20" title="Headshot">
                                                                        <Target size={12} strokeWidth={3} />
                                                                    </div>
                                                                )}
                                                                {k.victimWeapon && k.victimWeapon !== 'unknown' && (
                                                                    <>
                                                                        <span className="text-[9px] font-black text-zinc-700 italic">vs</span>
                                                                        <img 
                                                                            src={weaponImg(k.victimWeapon)} 
                                                                            alt="Arma da Vítima"
                                                                            title="Arma da Vítima (Pré-Duelo)"
                                                                            className="h-[14px] w-auto brightness-0 invert opacity-30 group-hover/kill:opacity-60 transition-opacity drop-shadow-lg"
                                                                        />
                                                                    </>
                                                                )}
                                                                {dmg && (
                                                                    <div className="flex items-center gap-1.5 ml-2 border-l border-white/5 pl-3">
                                                                        <span className="text-[10px] font-black text-emerald-400/80">{dmg}</span>
                                                                        <span className="text-[7px] font-black text-zinc-700 uppercase">dmg</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Vítima */}
                                                        <div className="flex-1 flex items-center gap-4">
                                                            <div className={`w-1.5 h-7 rounded-full ${vicSide === 'CT' ? 'bg-sky-500' : 'bg-orange-500'} opacity-20`} />
                                                            <div className="flex flex-col items-start">
                                                                <span className={`text-[13px] font-bold tracking-tight text-zinc-500 group-hover/kill:text-zinc-400 transition-all`}>
                                                                    {k.victimName}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[8px] font-bold uppercase text-zinc-800 tracking-widest">{vicSide}</span>
                                                                    {k.victimHp !== undefined && (
                                                                        <span className="text-[9px] font-black text-red-500/80" title="HP no momento do confronto">{k.victimHp} HP</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    
                                    {/* Dano e Sobreviventes - Seção Unificada e Minimalista */}
                                    {(r.damage || survivors.length > 0) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2 pt-4 border-t border-white/[0.03]">
                                            {r.damage && Object.keys(r.damage).length > 0 && (
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[8px] font-black uppercase text-zinc-600 tracking-[0.2em] px-2 flex items-center gap-2">
                                                        <Flame size={10} className="text-orange-500/50" /> Maiores Danos
                                                    </span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.entries(r.damage)
                                                            .sort(([, a], [, b]) => (b as any) - (a as any))
                                                            .slice(0, 5)
                                                            .map(([sid, dmg]) => {
                                                                const p = allPlayers.find(px => String(px.steamId) === sid);
                                                                if (!p || (dmg as number) <= 0) return null;
                                                                return (
                                                                    <div key={sid} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                                                                        <span className={`text-[10px] font-bold ${getSideColor(p.team || '')}`}>{p.nickname}</span>
                                                                        <div className="w-[1px] h-3 bg-white/10" />
                                                                        <span className="text-[10px] font-black text-orange-400">{dmg as number}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            )}
                                            {survivors.length > 0 && (
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[8px] font-black uppercase text-zinc-600 tracking-[0.2em] px-2 flex items-center gap-2">
                                                        <Eye size={10} className="text-zinc-600" /> Sobreviventes
                                                    </span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {survivors.map(s => {
                                                            const side = s.team || (t1.some(p => p.nickname === s.nickname) ? 'CT' : 'T');
                                                            return (
                                                                <div key={s.nickname} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${getSideBg(side)} border border-white/5`}>
                                                                    <div className={`w-1 h-1 rounded-full ${side === 'CT' ? 'bg-sky-500 shadow-[0_0_6px_rgba(56,189,248,0.5)]' : 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]'}`} />
                                                                    <span className={`text-[10px] font-bold ${getSideColor(side)}`}>{s.nickname}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        );
    };

    const DuelsLog = () => {
        const [selectedSid, setSelectedSid] = useState<string | null>(null);
        const allPlayers = [...t1, ...t2];
        const summaries = currentMatch?.metadata?.roundSummaries 
                       || currentMatch?.metadata?.round_summaries
                       || currentMatch?.metadata?.metadata?.roundSummaries
                       || currentMatch?.metadata?.metadata?.round_summaries
                       || currentMatch?.metadata?.match_details?.round_summaries;

        React.useEffect(() => {
            if (!selectedSid && allPlayers.length > 0) {
                const user = allPlayers.find(p => p.isUser);
                setSelectedSid(user?.steamId || allPlayers[0].steamId || null);
            }
        }, [allPlayers, selectedSid]);

        if (!summaries) return (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-600 bg-black/20 rounded-[32px] border border-white/[0.03]">
                <Swords size={48} strokeWidth={1} className="mb-4 text-yellow-500/20" />
                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Duelos indisponíveis</h4>
                <p className="text-[10px] uppercase text-zinc-700 mt-2 font-bold tracking-widest">Requer análise profunda da demo</p>
            </div>
        );

        const selectedPlayer = allPlayers.find(p => String(p.steamId) === String(selectedSid));
        
        const allEvents: any[] = [];
        Object.entries(summaries).forEach(([rNum, r]: [string, any]) => {
            if (r.kills) {
                r.kills.forEach((k: any) => {
                    if (k.attackerName === selectedPlayer?.nickname || k.victimName === selectedPlayer?.nickname) {
                        allEvents.push({ ...k, round: Number(rNum) });
                    }
                });
            }
        });

        const duelStats: Record<string, { myKills: number, myDeaths: number, headshots: number, events: any[] }> = {};
        allEvents.forEach(e => {
            const isAttacker = e.attackerName === selectedPlayer?.nickname;
            const opponentName = isAttacker ? e.victimName : e.attackerName;
            if (!opponentName || opponentName === selectedPlayer?.nickname) return;

            if (!duelStats[opponentName]) {
                duelStats[opponentName] = { myKills: 0, myDeaths: 0, headshots: 0, events: [] };
            }

            if (isAttacker) {
                duelStats[opponentName].myKills++;
                if (e.isHeadshot) duelStats[opponentName].headshots++;
            } else {
                duelStats[opponentName].myDeaths++;
            }
            duelStats[opponentName].events.push(e);
        });

        const sortedOpponents = Object.entries(duelStats).sort((a, b) => 
            (b[1].myKills + b[1].myDeaths) - (a[1].myKills + a[1].myDeaths)
        );

        return (
            <div className="flex flex-col lg:flex-row gap-8 mt-6">
                {/* Seleção de Jogador - Estilo Sidebar Premium */}
                <div className="lg:w-1/3 xl:w-1/4 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Selecionar Jogador</h4>
                        <span className="text-[9px] font-black text-zinc-700 bg-white/5 px-2 py-0.5 rounded-full">{allPlayers.length} total</span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 max-h-[640px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                        {allPlayers.map(p => (
                            <button
                                key={p.steamId}
                                onClick={() => setSelectedSid(p.steamId || null)}
                                className={`flex items-center gap-4 p-3 rounded-[24px] border transition-all relative overflow-hidden group ${
                                    selectedSid === p.steamId 
                                    ? 'bg-yellow-500/10 border-yellow-500/30 shadow-lg' 
                                    : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.04]'
                                }`}
                            >
                                <div className="relative shrink-0">
                                    <img src={p.avatar} alt="" className="w-10 h-10 rounded-2xl border border-white/10 group-hover:scale-105 transition-transform" />
                                    {p.isUser && <div className="absolute -top-1 -right-1 bg-yellow-500 text-black rounded-full p-1 shadow-lg border-2 border-[#0c0f15]"><Star size={8} fill="currentColor" /></div>}
                                </div>
                                <div className="flex flex-col items-start min-w-0 flex-1">
                                    <span className={`text-xs font-black italic truncate w-full ${selectedSid === p.steamId ? 'text-yellow-400' : 'text-zinc-300'}`}>
                                        {p.nickname}
                                    </span>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-black text-white/80">{p.kills}</span>
                                            <span className="text-[7px] font-bold text-zinc-600 uppercase">K</span>
                                        </div>
                                        <div className="w-px h-2 bg-white/10" />
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-black text-zinc-500">{p.deaths}</span>
                                            <span className="text-[7px] font-bold text-zinc-600 uppercase">D</span>
                                        </div>
                                    </div>
                                </div>
                                {selectedSid === p.steamId && (
                                    <motion.div layoutId="duel-active" className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Painel de Duelos - Estilo Grid de Combate */}
                <div className="lg:w-2/3 xl:w-3/4 flex flex-col gap-6">
                    {!selectedPlayer ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-24 bg-black/20 rounded-[40px] border border-dashed border-white/[0.03]">
                            <Swords size={40} className="text-zinc-800 mb-4" />
                            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Escolha um jogador para ver seus duelos</p>
                        </div>
                    ) : (
                        <>
                            {/* Header do Jogador Selecionado */}
                            <div className="flex items-center justify-between p-6 bg-gradient-to-br from-white/[0.03] to-transparent rounded-[32px] border border-white/[0.05] shadow-xl">
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <img src={selectedPlayer.avatar} className="w-16 h-16 rounded-[24px] border-2 border-yellow-500/40 shadow-2xl shadow-yellow-500/10" alt="" />
                                        <div className="absolute -bottom-2 -right-2 bg-[#0c0f15] border border-white/10 rounded-xl px-2 py-0.5 text-[8px] font-black text-yellow-500 uppercase">Pro</div>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-1">Histórico de Confrontos</h4>
                                        <span className="text-3xl font-black italic text-white tracking-tighter leading-none">{selectedPlayer.nickname}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-10 mr-4">
                                    <div className="flex flex-col items-center">
                                        <span className="text-3xl font-black italic text-emerald-400">{allEvents.filter(e => e.attackerName === selectedPlayer.nickname).length}</span>
                                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-1">Vitórias</span>
                                    </div>
                                    <div className="w-px h-10 bg-white/10" />
                                    <div className="flex flex-col items-center">
                                        <span className="text-3xl font-black italic text-red-500">{allEvents.filter(e => e.victimName === selectedPlayer.nickname).length}</span>
                                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-1">Derrotas</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                {sortedOpponents.length === 0 ? (
                                    <div className="col-span-full py-24 text-center bg-black/20 rounded-[40px] border border-white/[0.03]">
                                        <p className="text-zinc-700 text-[10px] font-black uppercase tracking-widest italic tracking-widest">Nenhum duelo registrado nesta partida.</p>
                                    </div>
                                ) : (
                                    sortedOpponents.map(([oppName, stats]) => {
                                        const oppPlayer = allPlayers.find(p => p.nickname === oppName);
                                        const side = oppPlayer?.team || 'unknown';
                                        const winRatio = stats.myKills / (stats.myKills + stats.myDeaths || 1);
                                        
                                        return (
                                            <motion.div 
                                                key={oppName}
                                                layout
                                                className="bg-zinc-950/40 border border-white/[0.04] rounded-[32px] overflow-hidden flex flex-col transition-all hover:border-white/10 hover:shadow-2xl hover:shadow-black group"
                                            >
                                                {/* VS Header */}
                                                <div className="px-6 py-5 bg-white/[0.02] border-b border-white/[0.04] flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-2 h-10 rounded-full ${side === 'CT' ? 'bg-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.5)]' : 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]'}`} />
                                                        <div className="flex flex-col">
                                                            <span className={`text-xl font-black italic tracking-tighter leading-none ${getSideColor(side)}`}>{oppName}</span>
                                                            <span className="text-[9px] font-black uppercase text-zinc-700 tracking-[0.2em] mt-1">{side}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-5">
                                                        <div className="flex flex-col items-end">
                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-3xl font-black italic ${stats.myKills > stats.myDeaths ? 'text-emerald-400' : stats.myKills < stats.myDeaths ? 'text-red-500' : 'text-zinc-500'}`}>
                                                                    {stats.myKills}
                                                                </span>
                                                                <span className="text-zinc-800 font-black italic text-xl">—</span>
                                                                <span className={`text-3xl font-black italic ${stats.myDeaths > stats.myKills ? 'text-emerald-400' : stats.myDeaths < stats.myKills ? 'text-red-500' : 'text-zinc-500'}`}>
                                                                    {stats.myDeaths}
                                                                </span>
                                                            </div>
                                                            <div className="w-24 h-1.5 bg-zinc-900 rounded-full mt-2 overflow-hidden flex shadow-inner">
                                                                <motion.div 
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${winRatio * 100}%` }}
                                                                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" 
                                                                />
                                                                <div className="h-full bg-red-500/30 flex-1" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
                                                    {stats.events.sort((a: any, b: any) => a.round - b.round).map((e: any, idx: number) => {
                                                        const isVictorious = e.attackerName === selectedPlayer.nickname;
                                                        return (
                                                            <div key={idx} className={`flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl border transition-all ${
                                                                isVictorious 
                                                                ? 'bg-emerald-500/[0.04] border-emerald-500/10 hover:bg-emerald-500/[0.08] hover:border-emerald-500/20' 
                                                                : 'bg-red-500/[0.04] border-red-500/10 hover:bg-red-500/[0.08] hover:border-red-500/20'
                                                            }`}>
                                                                <div className="flex items-center gap-5">
                                                                    <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border-2 ${
                                                                        isVictorious ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                                                                    }`}>
                                                                        <span className="text-[8px] font-black uppercase leading-none mb-0.5">RD</span>
                                                                        <span className="text-base font-black italic leading-none">{e.round}</span>
                                                                    </div>
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="flex items-center gap-3 mb-1">
                                                                            {(() => {
                                                                                const myWeaponStr = isVictorious ? e.weapon : e.victimWeapon;
                                                                                const oppWeaponStr = !isVictorious ? e.weapon : e.victimWeapon;
                                                                                
                                                                                return (
                                                                                    <>
                                                                                        {myWeaponStr && myWeaponStr !== 'unknown' ? (
                                                                                            <img src={weaponImg(myWeaponStr)} className="h-4 brightness-0 invert opacity-60" alt="" title={isVictorious ? "Sua Arma (Abate)" : "Sua Arma (Pré-Duelo)"} />
                                                                                        ) : (
                                                                                            <span className="text-[10px] font-bold text-zinc-600 italic">?</span>
                                                                                        )}
                                                                                        <span className="text-[10px] font-black text-zinc-500 italic">VS</span>
                                                                                        {oppWeaponStr && oppWeaponStr !== 'unknown' ? (
                                                                                            <img src={weaponImg(oppWeaponStr)} className="h-4 brightness-0 invert opacity-60" alt="" title={!isVictorious ? "Arma do Inimigo (Abate)" : "Arma do Inimigo (Pré-Duelo)"} />
                                                                                        ) : (
                                                                                            <span className="text-[10px] font-bold text-zinc-600 italic">?</span>
                                                                                        )}
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        <span className={`text-[11px] font-black uppercase italic ${isVictorious ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                            {isVictorious ? 'Win' : 'Loss'}
                                                                        </span>
                                                                        {e.damage && (
                                                                            <span className="text-[9px] font-black text-zinc-600 mt-0.5">
                                                                                {e.damage} DMG
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    {e.isHeadshot && (
                                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isVictorious ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400 shadow-inner'} mr-2`}>
                                                                            <Target size={14} strokeWidth={3} />
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* SEU HP */}
                                                                    <div className="flex flex-col items-center min-w-[50px]">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Heart size={10} className={isVictorious ? 'text-emerald-500' : 'text-zinc-500'} fill="currentColor" />
                                                                            <span className={`text-sm font-black italic leading-none ${isVictorious ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                                                                {isVictorious ? (e.attackerHp ?? '100') : (e.victimHp ?? '100')}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[7px] font-black text-zinc-600 uppercase tracking-tighter mt-1">
                                                                            Seu HP
                                                                        </span>
                                                                    </div>

                                                                    <div className="w-px h-6 bg-white/10" />

                                                                    {/* HP INIMIGO */}
                                                                    <div className="flex flex-col items-center min-w-[50px]">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className={`text-sm font-black italic leading-none ${!isVictorious ? 'text-red-400' : 'text-zinc-500'}`}>
                                                                                {!isVictorious ? (e.attackerHp ?? '100') : (e.victimHp ?? '100')}
                                                                            </span>
                                                                            <Heart size={10} className={!isVictorious ? 'text-red-500' : 'text-zinc-600'} fill="currentColor" />
                                                                        </div>
                                                                        <span className="text-[7px] font-black text-zinc-600 uppercase tracking-tighter mt-1">
                                                                            HP Inimigo
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    // ── TABS CONFIG ───────────────────────────────────────────────────────────
    const tabs: { id: 'placar'|'desempenho'|'utilitarios'|'armas'|'confrontos'|'linha-tempo'|'duelos'; label: string; icon: React.ReactNode }[] = [
        { id: 'placar',       label: 'Placar',       icon: <Shield size={12} /> },
        { id: 'desempenho',   label: 'Desempenho',   icon: <TrendingUp size={12} /> },
        { id: 'utilitarios',  label: 'Utilitários',  icon: <Zap size={12} /> },
        { id: 'armas',        label: 'Armas',        icon: <Swords size={12} /> },
        { id: 'confrontos',   label: 'Confrontos',   icon: <Crosshair size={12} /> },
        { id: 'linha-tempo',  label: 'Linha do Tempo', icon: <Clock size={12} /> },
        { id: 'duelos',       label: 'Duelos',       icon: <Swords size={12} /> },
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
                <div className="flex items-center gap-1.5 flex-wrap">
                    {p.isSub && (
                        <span className="px-1 py-0.5 rounded-[4px] bg-blue-500/20 text-blue-400 text-[7px] font-black uppercase tracking-tighter border border-blue-500/20" title="Substituto (Complete)">
                            SUB
                        </span>
                    )}
                    {p.isLeaver && (
                        <span className="px-1 py-0.5 rounded-[4px] bg-red-500/20 text-red-400 text-[7px] font-black uppercase tracking-tighter border border-red-500/20" title="Desistência (Leaver)">
                            SAIU
                        </span>
                    )}
                    {((p.eloChange !== undefined && p.eloChange !== null) || (p.eloAfter !== undefined && p.eloAfter !== null)) && (
                        <div className="flex items-center gap-1">
                            {p.eloChange !== undefined && p.eloChange !== null && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm flex items-center gap-0.5 ${
                                    p.eloChange > 0 
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                                    : p.eloChange < 0 
                                    ? 'bg-red-500/15 text-red-400 border border-red-500/20' 
                                    : 'bg-zinc-800/50 text-zinc-500 border border-white/5'
                                }`} title="Tropoints ganhos/perdidos nesta partida">
                                    {p.eloChange > 0 ? `+${p.eloChange}` : p.eloChange}
                                    <span className="text-[7px] opacity-50 font-bold ml-0.5">PTS</span>
                                </span>
                            )}
                            {p.eloAfter !== undefined && p.eloAfter !== null && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-zinc-800/40 text-zinc-400 border border-white/5 shadow-sm" title="Tropoints totais após esta partida">
                                    {p.eloAfter} <span className="text-[7px] opacity-40">TP</span>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </td>
    );

    /** Compact player row for main scoreboard */
    const ScoreRow = ({ p, isAlly, onRemove }: { p: PlayerStats; isAlly: boolean; onRemove: (sid: string) => void }) => {
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
                <td className="py-2.5 px-2 text-center">
                    <span className={`text-[11px] font-black italic ${p.totalDamage >= 3000 ? 'text-orange-400' : p.totalDamage >= 2000 ? 'text-yellow-400' : 'text-zinc-300'}`}>
                        {p.totalDamage > 0 ? Math.round(p.totalDamage).toLocaleString() : '—'}
                    </span>
                </td>
                <td className="py-2.5 px-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-[10px] font-bold ${p.hs>=50?'text-rose-400':p.hs>0?'text-zinc-400':'text-zinc-700'}`}>{Math.round(p.hs)}%</span>
                        <div className="h-0.5 w-10 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500/60 rounded-full" style={{width:`${Math.min(100,p.hs)}%`}} />
                        </div>
                    </div>
                </td>
                <td className="py-2.5 px-2 text-center">
                    {(p.mvps ?? 0) > 0
                        ? <span className="inline-flex items-center justify-center gap-1 text-[11px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md whitespace-nowrap">⭐ {p.mvps}</span>
                        : <span className="text-zinc-700 text-xs">—</span>
                    }
                </td>
                <td className="py-2.5 px-1 text-right">
                    {(session?.user as any)?.isAdmin && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdatePlayerStatus(p.steamId!, 'isSub', !p.isSub); }}
                                className={`p-1.5 rounded-lg border transition-all ${p.isSub ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-blue-400'}`}
                                title={p.isSub ? "Remover status de Substituto" : "Marcar como Substituto (Complete)"}
                            >
                                <UserPlus size={12} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdatePlayerStatus(p.steamId!, 'isLeaver', !p.isLeaver); }}
                                className={`p-1.5 rounded-lg border transition-all ${p.isLeaver ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/20' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-red-400'}`}
                                title={p.isLeaver ? "Remover status de Desistência" : "Marcar como Desistência (Leaver)"}
                            >
                                <LogOut size={12} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRemove(p.steamId!); }}
                                className="p-1.5 bg-white/5 border border-white/5 rounded-lg text-zinc-500 hover:text-red-500 transition-all"
                                title="Remover jogador desta partida"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    )}
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
                        <span className={`text-[10px] font-bold ${p.hs>=50?'text-rose-400':p.hs>0?'text-zinc-400':'text-zinc-700'}`}>{p.hs > 0 ? `${Math.round(p.hs)}%` : '—'}</span>
                        {p.hs > 0 && <div className="h-0.5 w-12 bg-zinc-900 rounded-full overflow-hidden"><div className="h-full bg-rose-500 rounded-full" style={{width:`${Math.min(100,p.hs)}%`}} /></div>}
                    </div>
                </td>
                <td className="py-2.5 px-2 text-center">
                    {p.clutches !== null
                        ? (p.clutches > 0 
                            ? <span className="text-xs font-black text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-lg">{p.clutches}×</span> 
                            : <span className="text-zinc-500 text-xs">0</span>)
                        : <span className="text-zinc-700 text-xs">—</span>}
                </td>
                <td className="py-2.5 px-2 text-center">
                    {p.trades > 0 ? <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-lg">{p.trades}</span> : <span className="text-zinc-700">—</span>}
                </td>
                <td className="py-2.5 px-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-[10px] font-black ${p.ttd && p.ttd > 0 ? (p.ttd < 400 ? 'text-emerald-400' : 'text-zinc-400') : 'text-zinc-700'}`}>
                            {p.ttd && p.ttd > 0 ? `${Math.round(p.ttd)}ms` : '—'}
                        </span>
                        <span className="text-[7px] font-black text-zinc-600 uppercase">TTD</span>
                    </div>
                </td>
                <td className="py-2.5 px-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-black text-zinc-400">
                            {p.killDist && p.killDist > 0 ? `${(p.killDist / 50).toFixed(1)}m` : '—'}
                        </span>
                        <span className="text-[7px] font-black text-zinc-600 uppercase">Dist.</span>
                    </div>
                </td>
                <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                        {p.triples > 0 && <span className="text-[8px] font-black text-amber-400 bg-amber-500/15 px-1 py-0.5 rounded">{p.triples}×3K</span>}
                        {p.quads > 0 && <span className="text-[8px] font-black text-orange-400 bg-orange-500/15 px-1 py-0.5 rounded">{p.quads}×4K</span>}
                        {p.aces > 0 && <span className="text-[8px] font-black text-purple-300 bg-purple-500/20 px-1 py-0.5 rounded animate-pulse">{p.aces}×ACE</span>}
                        {p.triples===0 && p.quads===0 && p.aces===0 && <span className="text-zinc-700 text-[10px]">—</span>}
                    </div>
                </td>
                <td className="py-2.5 px-1 text-right">
                    {(session?.user as any)?.isAdmin && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdatePlayerStatus(p.steamId!, 'isSub', !p.isSub); }}
                                className={`p-1 rounded-lg border transition-all ${p.isSub ? 'bg-blue-500 text-white border-blue-400' : 'bg-white/5 border-white/5 text-zinc-500'}`}
                                title="Marcar como Substituto"
                            >
                                <UserPlus size={10} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdatePlayerStatus(p.steamId!, 'isLeaver', !p.isLeaver); }}
                                className={`p-1 rounded-lg border transition-all ${p.isLeaver ? 'bg-red-500 text-white border-red-400' : 'bg-white/5 border-white/5 text-zinc-500'}`}
                                title="Marcar como Desistência"
                            >
                                <LogOut size={10} />
                            </button>
                        </div>
                    )}
                </td>
            </tr>
        );
    };

    const WeaponRow = ({ p }: { p: PlayerStats }) => {
        let playerWeapons: any[] = [];

        // Verifica o padrão da API Tracker (lista global)
        if (currentMatch?.metadata?.weapon_stats?.length > 0) {
            playerWeapons = currentMatch.metadata.weapon_stats.filter((ws: any) => String(ws.player_id) === String(p.steamId));
        } 
        // Verifica o padrão do processador local (dicionário dentro do metadata do jogador)
        else if (p.metadata?.weaponStats) {
            playerWeapons = Object.entries(p.metadata.weaponStats).map(([weaponName, stats]) => {
                // Retrocompatibilidade: se a demo foi processada antes do update (apenas número de kills)
                if (typeof stats === 'number') {
                    return {
                        weapon_name: weaponName,
                        kills: stats,
                        headshots: 0,
                        damage: 0
                    };
                }
                
                // Nova estrutura: objeto com kills, hs e damage
                const ws = stats as any;
                return {
                    weapon_name: weaponName,
                    kills: ws.kills || 0,
                    headshots: ws.hs || 0,
                    damage: ws.damage || 0
                };
            });
        }
        
        const sortedWeapons = [...playerWeapons].sort((a, b) => b.kills - a.kills);

        return (
            <tr className={`border-b border-white/[0.04] transition-colors ${p.isUser ? 'bg-yellow-500/[0.05]' : 'hover:bg-white/[0.02]'}`}>
                <PlayerCell p={p} />
                <td colSpan={6} className="py-4 px-6">
                    <div className="flex flex-wrap gap-3">
                        {sortedWeapons.length > 0 ? (
                            sortedWeapons.map((ws: any, idx: number) => {
                                const hsRate = ws.kills > 0 ? Math.round((ws.headshots / ws.kills) * 100) : 0;
                                const isMainWeapon = idx === 0;
                                
                                return (
                                    <div 
                                        key={idx} 
                                        className={`flex flex-col gap-2 p-3 rounded-2xl border transition-all hover:scale-105 ${
                                            isMainWeapon 
                                            ? 'bg-yellow-500/[0.05] border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.05)]' 
                                            : 'bg-black/40 border-white/[0.05] hover:border-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative group/w">
                                                    <img 
                                                        src={weaponImg(ws.weapon_name)} 
                                                        className={`h-5 brightness-0 invert transition-opacity ${isMainWeapon ? 'opacity-100' : 'opacity-40 group-hover/w:opacity-80'}`} 
                                                        alt={ws.weapon_name} 
                                                    />
                                                </div>
                                                <span className={`text-[11px] font-black italic ${isMainWeapon ? 'text-yellow-400' : 'text-zinc-400'}`}>
                                                    {String(ws.weapon_name || '').replace('weapon_', '').toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/40 border border-white/5">
                                                <span className="text-[11px] font-black text-white">{ws.kills}</span>
                                                <span className="text-[8px] font-black text-zinc-600 uppercase">Kills</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 mt-1">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <Target size={10} className={hsRate > 50 ? 'text-rose-500' : 'text-zinc-600'} />
                                                    <span className={`text-[10px] font-black ${hsRate > 50 ? 'text-rose-400' : 'text-zinc-400'}`}>{hsRate}%</span>
                                                </div>
                                                <span className="text-[7px] font-black text-zinc-700 uppercase tracking-tighter">Precisão HS</span>
                                            </div>
                                            <div className="w-px h-5 bg-white/5" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-emerald-400/80 leading-none">{Math.round(ws.damage)}</span>
                                                <span className="text-[7px] font-black text-zinc-700 uppercase tracking-tighter mt-1">Dano Total</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex items-center gap-2 py-2 opacity-30 italic">
                                <Activity size={12} className="text-zinc-600" />
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Nenhum dado detalhado</span>
                            </div>
                        )}
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
                    <div className="flex flex-col items-center gap-1">
                        <span className={`text-xs font-black leading-none ${p.enemiesFlashed && p.enemiesFlashed > 0 ? 'text-blue-400' : 'text-zinc-700'}`}>{p.enemiesFlashed || '—'}</span>
                        {p.enemiesFlashed && p.enemiesFlashed > 0 && <span className="text-[7px] font-bold text-zinc-600 uppercase">inimigos</span>}
                    </div>
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
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <a href={p.steamId?`/player/${p.steamId}`:'#'} onClick={e=>{if(!p.steamId)e.preventDefault();e.stopPropagation();}} className={`text-[11px] font-bold truncate max-w-[100px] hover:underline ${p.isUser?'text-yellow-400':'text-zinc-300 hover:text-yellow-300'}`}>{p.isUser?'★ ':''}{p.nickname}</a>
                            {((p.eloChange !== undefined && p.eloChange !== null) || (p.eloAfter !== undefined && p.eloAfter !== null)) && (
                                <div className="flex items-center gap-1">
                                    {p.eloChange !== undefined && p.eloChange !== null && (
                                        <span className={`text-[8px] font-black px-1 py-0.5 rounded border ${
                                            p.eloChange > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                            p.eloChange < 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                            'bg-zinc-800/50 text-zinc-500 border-white/5'
                                        }`}>
                                            {p.eloChange > 0 ? `+${p.eloChange}` : p.eloChange}
                                        </span>
                                    )}
                                    {p.eloAfter !== undefined && p.eloAfter !== null && (
                                        <span className="text-[8px] font-black px-1 py-0.5 rounded border bg-zinc-800/30 text-zinc-500 border-white/5">
                                            {p.eloAfter}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
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


    const TeamBlock = ({ players, title, scoreVal, ally, onRemovePlayer }: { players: PlayerStats[]; title: string; scoreVal: number; ally: boolean; onRemovePlayer: (sid: string) => void }) => {
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
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600" title="Nome do Jogador">Jogador</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Kills (Eliminações)">K</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Deaths (Mortes)">D</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Assists (Assistências)">A</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Kill/Death Ratio (Média de mortes por vida)">K/D</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Average Damage per Round (Dano médio por rodada)">ADR</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Total Damage (Dano total causado)">Dano</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Headshot Percentage (Porcentagem de tiros na cabeça)">HS%</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-amber-600/70 text-center whitespace-nowrap" title="MVPs (Estrelas de MVP ganhas na partida)">⭐ MVP</th>
                                        <th className="py-2 px-1 w-8"></th>
                                    </>}
                                    {tab === 'desempenho' && <>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600" title="Nome do Jogador">Jogador</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Performance Rating (Leetify Rating)">Rating</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Kill, Assist, Survived, or Traded (Impacto por round)">KAST</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Headshot Percentage (Porcentagem de tiros na cabeça)">HS%</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Tempo de Reação (Time to Damage)">TTD</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Média de Distância das Kills">Dist.</th>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600 text-center" title="Múltiplas eliminações no mesmo round (3k, 4k, Ace)">Multikills</th>
                                        <th className="py-2 px-1 w-8"></th>
                                    </>}
                                    {tab === 'utilitarios' && <>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600" title="Nome do Jogador">Jogador</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Dano total causado com granadas">Dano Util</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Eliminações de aliados facilitadas por suas flashbangs">Flash Ass.</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Tempo total que inimigos ficaram cegos por suas flashbangs">Cegueira</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Inimigos Cegados">Cegados</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Flashbangs lançadas">⚡ Flas.</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Smokes lançadas">💨 Smoke</th>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600 text-center" title="Molotovs lançadas">🔥 Molotov</th>
                                    </>}
                                    {tab === 'armas' && <>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600" title="Nome do Jogador">Jogador</th>
                                        <th colSpan={6} className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600">Breakdown por Arma (Kills, HS%, Dano)</th>
                                    </>}
                                    {tab === 'confrontos' && <>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600" title="Nome do Jogador">Jogador</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="First Kills (Primeira eliminação do round)">🎯 1ª Kill</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="First Deaths (Primeira morte do round)">💀 1ª Morte</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Saldo de duelos de abertura">Duelos</th>
                                        <th className="py-2 px-2 text-[9px] font-black uppercase text-zinc-600 text-center" title="Diferença total de aberturas">Saldo</th>
                                        <th className="py-2 px-3 text-[9px] font-black uppercase text-zinc-600 text-center" title="Trocas de kills realizadas">Trocas</th>
                                    </>}
                                </tr>
                            </thead>
                            <tbody>
                                {players.map((p, i) => tab === 'placar' ? <ScoreRow key={i} p={p} isAlly={ally} onRemove={onRemovePlayer} />
                                    : tab === 'desempenho' ? <PerfRow key={i} p={p} />
                                    : tab === 'utilitarios' ? <UtilRow key={i} p={p} maxUtil={maxUtil} />
                                    : tab === 'armas' ? <WeaponRow key={i} p={p} />
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
                        {isProcessing && (
                            <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-8">
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="relative w-24 h-24 mb-8">
                                        <div className="absolute inset-0 border-8 border-yellow-500/10 rounded-full" />
                                        <div className="absolute inset-0 border-8 border-t-yellow-500 rounded-full animate-spin" />
                                        <Activity className="absolute inset-0 m-auto text-yellow-500 animate-pulse" size={32} />
                                    </div>
                                    <h3 className="text-3xl font-black italic tracking-tighter text-white mb-4">
                                        ANALISANDO DEMO...
                                    </h3>
                                    <p className="text-zinc-400 max-w-md text-sm uppercase font-black tracking-widest leading-relaxed">
                                        O novo sistema <span className="text-yellow-500">TropaCS Demos</span> está processando esta partida em fila.
                                        <br />
                                        <span className="text-zinc-500 text-[10px] mt-2 block italic">Aguardando disponibilidade do analisador para extrair estatísticas avançadas.</span>
                                    </p>
                                    
                                    <div className="mt-8 flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 shadow-2xl">
                                        <RefreshCw size={16} className={`text-yellow-500 ${isAutoRefreshing ? 'animate-spin' : ''}`} />
                                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Sincronização Ativa</span>
                                    </div>
                                </motion.div>
                            </div>
                        )}
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
                                    <span className={`text-[8px] font-black uppercase tracking-[0.3em] mb-0.5 px-2 py-0.5 rounded-full border ${
                                        resultText === 'VITÓRIA' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 
                                        resultText === 'EMPATE' ? 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10' :
                                        'text-red-400 border-red-500/30 bg-red-500/10'
                                    }`}>
                                        {resultText}
                                    </span>
                                    <div className="flex items-center gap-2.5">
                                        {isEditingScore ? (
                                            <div className="flex items-center gap-2 bg-black/40 p-2 rounded-2xl border border-white/10">
                                                <input 
                                                    type="number" 
                                                    value={editScoreA} 
                                                    onChange={e => setEditScoreA(parseInt(e.target.value) || 0)}
                                                    className="w-12 bg-transparent text-2xl font-black text-center border-b border-yellow-500 focus:outline-none"
                                                />
                                                <span className="text-zinc-700 font-black">—</span>
                                                <input 
                                                    type="number" 
                                                    value={editScoreB} 
                                                    onChange={e => setEditScoreB(parseInt(e.target.value) || 0)}
                                                    className="w-12 bg-transparent text-2xl font-black text-center border-b border-zinc-500 focus:outline-none"
                                                />
                                                <button 
                                                    onClick={() => {
                                                        const tmp = editScoreA;
                                                        setEditScoreA(editScoreB);
                                                        setEditScoreB(tmp);
                                                    }}
                                                    className="mx-1 w-8 h-8 rounded-lg bg-white/5 text-zinc-400 flex items-center justify-center hover:bg-white/10"
                                                    title="Inverter placar"
                                                >
                                                    <RefreshCw size={14} />
                                                </button>
                                                <button 
                                                    onClick={handleUpdateScore}
                                                    disabled={isSavingScore}
                                                    className="ml-2 w-8 h-8 rounded-lg bg-emerald-500 text-black flex items-center justify-center hover:bg-emerald-400 disabled:opacity-50"
                                                >
                                                    {isSavingScore ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                                                </button>
                                                <button 
                                                    onClick={() => setIsEditingScore(false)}
                                                    className="w-8 h-8 rounded-lg bg-white/5 text-zinc-400 flex items-center justify-center hover:bg-white/10"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className={`text-4xl font-black italic tracking-tighter leading-none ${resultText === 'VITÓRIA' ? 'text-white' : resultText === 'EMPATE' ? 'text-zinc-200' : 'text-zinc-400'}`}>{scoreA}</span>
                                                <span className="text-xl font-black text-zinc-700 italic">—</span>
                                                <span className={`text-4xl font-black italic tracking-tighter leading-none ${resultText === 'DERROTA' ? 'text-white' : resultText === 'EMPATE' ? 'text-zinc-200' : 'text-zinc-600'}`}>{scoreE}</span>
                                                <button 
                                                    onClick={() => {
                                                        setEditScoreA(scoreA);
                                                        setEditScoreB(scoreE);
                                                        setIsEditingScore(true);
                                                    }}
                                                    className="ml-2 w-6 h-6 rounded bg-white/5 text-zinc-700 hover:text-white flex items-center justify-center hover:bg-white/10 transition-colors"
                                                    title="Corrigir placar/resultado manualmente"
                                                >
                                                    <Edit2 size={10} />
                                                </button>
                                            </>
                                        )}
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

                                    {/* Botão Recalcular Tropoints — apenas admin, apenas MIX */}
                                    {(session?.user as any)?.isAdmin && (currentMatch?.source || currentMatch?.gameMode || '').toLowerCase().includes('mix') && (
                                        <button
                                            onClick={handleRecalculateTropoints}
                                            disabled={isRecalculating}
                                            className="h-8 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 flex items-center gap-2 border border-amber-500/30 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Forçar recálculo dos Tropoints de todos os jogadores desta partida"
                                        >
                                            <Calculator size={12} className={isRecalculating ? "animate-spin" : ""} />
                                            <span className="hidden sm:inline">{isRecalculating ? 'Calculando...' : 'Tropoints'}</span>
                                        </button>
                                    )}

                                    {currentMatch && (() => {
                                            const meta = currentMatch.metadata || {};
                                            const shareCode = currentMatch.sharing_code || meta.sharingCode || meta.shareCode || (currentMatch.source === 'Steam' && !currentMatch.externalId?.includes('leetify') ? currentMatch.externalId : null);
                                            const canOpenInGame = !!shareCode;
                                            
                                            const handleDownloadClick = (e: React.MouseEvent) => {
                                                e.preventDefault();
                                                const meta = currentMatch.metadata || {};
                                                const shareCode = currentMatch.sharing_code || meta.sharingCode || meta.shareCode || (currentMatch.source === 'Steam' && !currentMatch.externalId?.includes('leetify') ? currentMatch.externalId : null);
                                                
                                                if (shareCode) {
                                                    window.location.href = `steam://rungame/730/76561202255233023/+csgo_download_match%20${shareCode}`;
                                                    return;
                                                }

                                                if (currentMatch.source?.toLowerCase().includes('faceit')) {
                                                    if (currentMatch.url && currentMatch.url.startsWith('http')) {
                                                        window.open(currentMatch.url, '_blank');
                                                        return;
                                                    }
                                                }
                                                
                                                const url = `/api/match/${match?.id}/demo`;
                                                window.open(url, '_blank');
                                            };

                                            return (
                                                <button
                                                    onClick={handleDownloadClick}
                                                    className="h-8 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 flex items-center gap-2 border border-sky-500/20 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest"
                                                    title={canOpenInGame ? "Abrir no CS2" : "Baixar demo da partida para assistir"}
                                                >
                                                    {canOpenInGame ? <Play size={12} /> : <Download size={12} />}
                                                    <span className="hidden lg:inline">{canOpenInGame ? 'Abrir no CS2' : 'Assistir Demo'}</span>
                                                </button>
                                            );
                                        })()}
                                    
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
                                        {!hasRichData && (t.id === 'utilitarios' || t.id === 'confrontos' || t.id === 'duelos') && (
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
                                    className="flex flex-col gap-3 items-stretch"
                                >
                                    {tab === 'linha-tempo' && (currentMatch?.metadata?.roundSummaries || currentMatch?.metadata?.metadata?.roundSummaries) ? (
                                        <RoundLog />
                                    ) : tab === 'duelos' && (currentMatch?.metadata?.roundSummaries || currentMatch?.metadata?.metadata?.roundSummaries) ? (
                                        <DuelsLog />
                                    ) : (
                                        <div className="flex gap-3 items-start">
                                            {(() => {
                                                const isMe = (session?.user as any)?.steamId === userSteamId;
                                                const allyTitle = isMe ? "Seu Time" : (userNickname ? `Time de ${userNickname}` : "Time do Jogador");
                                                return (
                                                    <>
                                                        <TeamBlock players={t1} title={allyTitle} scoreVal={scoreA} ally={true} onRemovePlayer={handleRemovePlayer} />
                                                        <TeamBlock players={t2} title="Adversários" scoreVal={scoreE} ally={false} onRemovePlayer={handleRemovePlayer} />
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
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
