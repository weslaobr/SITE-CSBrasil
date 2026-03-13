"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Target, TrendingUp, Calendar, ExternalLink, Download, BarChart2, BarChart3, Zap, Shield, Sword, Activity, ChevronDown, ChevronUp } from 'lucide-react';

import axios from 'axios';

interface PlayerStats {
    nickname: string;
    avatar: string;
    rank: string;
    kills: number;
    deaths: number;
    assists: number;
    diff: number;
    kd: number;
    adr: number;
    hs: string;
    kast: string;
    rating: number;
    fkd: number;
    fkd_deaths: number;
    trades: number;
    onevx: number;
    onevx_attempts: number;
    multikills: string;
    // Utility stats
    util_damage: number;
    flash_assists: number;
    util_thrown: number;
    blind_time: number;
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
    matchDate: string;
    duration?: string;
    result: string;
    score: string;
    url?: string;
    externalId?: string;
    metadata?: any;
    adr?: number;
    hsPercentage?: number;
}

interface MatchReportModalProps {
    match: Match | null;
    matchId?: string | null;
    isOpen: boolean;
    onClose: () => void;
    // Explicit user identifiers for accurate identification
    userSteamId?: string;
    userNickname?: string;
}

const MatchReportModal: React.FC<MatchReportModalProps> = ({ 
    match: initialMatch, 
    matchId, 
    isOpen, 
    onClose,
    userSteamId,
    userNickname
}) => {
    const [mainTab, setMainTab] = useState('seu-jogo');
    const [subTab, setSubTab] = useState('geral');
    const [internalMatch, setInternalMatch] = useState<Match | null>(null);
    const [loading, setLoading] = useState(false);

    const match = initialMatch || internalMatch;

    React.useEffect(() => {
        if (isOpen && matchId) {
            // Se mudou o matchId ou se o match atual não tem os dados completos (metadata), busca
            if (!match || !match.metadata || match.id !== matchId) {
                setInternalMatch(null); // Limpa anterior
                fetchMatchData();
            }
        } else if (!isOpen) {
            setInternalMatch(null);
        }
    }, [isOpen, matchId]);

    const fetchMatchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/match/${matchId}`);
            const data = res.data;
            
            // Map API data to Match interface, preserving initial data where needed
            const scoreFromAPI = (data.team_2_score !== undefined && data.team_3_score !== undefined) 
                ? `${data.team_2_score}-${data.team_3_score}` 
                : null;

            const fetchedMatch: Match = {
                id: data.match_id || matchId!,
                source: data.data_source || initialMatch?.source || 'Leetify',
                gameMode: data.game_mode || initialMatch?.gameMode || 'Competitive',
                mapName: data.map_name || initialMatch?.mapName || 'de_mirage',
                kills: data.stats?.find((p: any) => p.is_user)?.total_kills || initialMatch?.kills || 0,
                deaths: data.stats?.find((p: any) => p.is_user)?.total_deaths || initialMatch?.deaths || 0,
                assists: data.stats?.find((p: any) => p.is_user)?.total_assists || initialMatch?.assists || 0,
                matchDate: data.match_date || initialMatch?.matchDate || new Date().toISOString(),
                result: data.result || initialMatch?.result || (data.team_2_score > data.team_3_score ? 'Win' : 'Loss'),
                score: scoreFromAPI && scoreFromAPI !== "0-0" ? scoreFromAPI : (initialMatch?.score || "0-0"),
                url: data.demo_url || initialMatch?.url,
                externalId: data.match_id || initialMatch?.externalId,
                metadata: {
                    ...initialMatch?.metadata, // Preserve initial metadata (like playerNickname)
                    ...data,
                },
                adr: data.stats?.find((p: any) => p.is_user)?.adr || initialMatch?.adr,
                hsPercentage: (data.stats?.find((p: any) => p.is_user)?.accuracy_head * 100) || initialMatch?.hsPercentage
            };
            setInternalMatch(fetchedMatch);
        } catch (error) {
            console.error("Error fetching match in modal:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!match && loading) {
        return (
            <AnimatePresence>
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative bg-[#0b0e13] border border-white/10 rounded-[40px] p-20 flex flex-col items-center gap-8 shadow-2xl"
                    >
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
                            <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-2">Analisando Partida</h3>
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Cruzando dados do Leetify...</p>
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>
        );
    }

    // Determine the most complete version of the match data
    const currentMatch = internalMatch?.metadata ? internalMatch : (initialMatch || internalMatch);
    
    // Final safety check
    if (!currentMatch) return null;

    // Helper to normalize any player object to our standard PlayerStats
    const normalizePlayerData = (p: any, isUser: boolean = false): PlayerStats => {
        // Leetify often uses snake_case, Faceit uses camelCase or specific names
        const kills = p.kills !== undefined ? p.kills : 
                     (p.total_kills !== undefined ? p.total_kills : 
                     (p.player_stats?.Kills ? parseInt(p.player_stats.Kills) : 
                     (p.Kills ? parseInt(p.Kills) : 0)));
                     
        const deaths = p.deaths !== undefined ? p.deaths : 
                      (p.total_deaths !== undefined ? p.total_deaths : 
                      (p.player_stats?.Deaths ? parseInt(p.player_stats.Deaths) : 
                      (p.Deaths ? parseInt(p.Deaths) : 0)));
                      
        const assists = p.assists !== undefined ? p.assists : 
                       (p.total_assists !== undefined ? p.total_assists : 
                       (p.player_stats?.Assists ? parseInt(p.player_stats.Assists) : 
                       (p.Assists ? parseInt(p.Assists) : 0)));

        const adr = p.adr !== undefined ? p.adr : 
                   (p.player_stats?.ADR ? parseFloat(p.player_stats.ADR) : 
                   (p.ADR ? parseFloat(p.ADR) : 0));

        const hsValue = p.accuracy_head !== undefined ? `${(p.accuracy_head * 100).toFixed(0)}%` : 
                        (p.hs_percent !== undefined ? `${p.hs_percent}%` : 
                        (p.player_stats?.["Headshots %"] ? `${p.player_stats["Headshots %"]}%` : 
                        (p.hs_percentage !== undefined ? `${p.hs_percentage}%` : '0%')));
        
        const isWinResult = currentMatch?.result === 'Win' || currentMatch?.result === 'Victory';
        
        // Deterministic fallbacks for missing detailed data
        const seed = (p.player_id || p.name || p.nickname || "0").length;
        const fallbackFk = Math.max(0, Math.floor(kills / 6));
        const fallbackFd = Math.max(0, Math.floor(deaths / 8));
        const fallbackTrades = Math.floor(kills / 4);
        const fallbackClutches = kills > 25 ? 1 : 0;
        const fallbackKast = isWinResult ? 75 : 62;

        const avatar = p.avatar_url || p.avatarUrl || p.avatar || (p.player_stats?.avatar) || (isUser ? "https://avatars.steamstatic.com/2cf8997181cfcbceeacd49034d12aaf4c378d15e.jpg" : `https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg`);

        const util_damage = p.util_damage !== undefined ? p.util_damage : 
                           (p.utility_damage !== undefined ? p.utility_damage : 
                           (p.utilityDamage !== undefined ? p.utilityDamage : 
                           (p.player_stats?.["Utility Damage"] ? parseInt(p.player_stats["Utility Damage"]) : 0)));

        const flash_assists = p.flash_assists !== undefined ? p.flash_assists : 
                             (p.flashbang_assists !== undefined ? p.flashbang_assists : 
                             (p.flashbangAssists !== undefined ? p.flashbangAssists : 
                             (p.player_stats?.["Flashbang Assists"] ? parseInt(p.player_stats["Flashbang Assists"]) : 0)));

        const blind_time = p.blind_time !== undefined ? p.blind_time : 
                          (p.blindTime !== undefined ? p.blindTime : 
                          (p.flash_blind_time || 0));

        const util_thrown = p.util_thrown || p.utilThrown || 
                           (p.he_thrown || 0) + (p.flash_thrown || 0) + (p.smokes_thrown || 0) + (p.molotovs_thrown || 0);

        return {
            nickname: p.name || p.nickname || (isUser ? "[Sua Conta]" : "Jogador"),
            avatar,
            rank: p.rank || "Competitive",
            kills,
            deaths,
            assists,
            diff: kills - deaths,
            kd: Number((kills / (deaths || 1)).toFixed(2)),
            adr: adr || (isUser ? (currentMatch.adr || 70) : 70 + (seed % 15)),
            hs: hsValue,
            kast: p.kast || `${fallbackKast}%`,
            rating: p.rating || p.leetify_rating || p.leetifyRating || (p.player_stats?.["K/D Ratio"] ? parseFloat(p.player_stats["K/D Ratio"]) : 1.0),
            fkd: p.fk_count || p.fkd || fallbackFk,
            fkd_deaths: p.fd_count || p.fk_deaths || fallbackFd,
            trades: p.trade_count || p.trades || fallbackTrades,
            onevx: p.clutch_count || p.onevx || fallbackClutches,
            onevx_attempts: p.onevx_attempts || (fallbackClutches > 0 ? fallbackClutches + 1 : 0),
            multikills: p.multikills || (p.triple_kills !== undefined ? `0/${p.triple_kills}/${p.quadro_kills}/${p.penta_kills}` : "0/0/0/0"),
            util_damage,
            flash_assists,
            util_thrown,
            blind_time,
            isUser: isUser,
            steamId: p.player_id || p.steamId || p.steam64Id || p.player_stats?.steam_id
        };
    };

    // ROBUST USER DETECTION
    const isUserPlayer = (p: any) => {
        if (!p) return false;
        const metadataNickname = currentMatch.metadata?.playerNickname || currentMatch.metadata?.metadata?.playerNickname;
        const metadataSteamId = currentMatch.metadata?.metadata?.steamId || currentMatch.metadata?.steam64Id;
        const pSteamId = p.player_id || p.steam64_id || p.steamId || p.steam_id || p.player_stats?.steam_id;
        const pNickname = p.nickname || p.name;
        if (userSteamId && pSteamId === userSteamId) return true;
        if (userNickname && (pNickname === userNickname)) return true;
        if (p.is_user === true || p.isUser === true) return true;
        if (metadataNickname && pNickname === metadataNickname) return true;
        if (metadataSteamId && pSteamId === metadataSteamId) return true;
        return false;
    };

    const getScoreboardData = (): { team1: PlayerStats[]; team2: PlayerStats[] } => {
        const meta = currentMatch.metadata || {};

        // 1. Faceit fullStats
        if (meta.fullStats?.rounds?.[0]?.teams) {
            const teams = meta.fullStats.rounds[0].teams;
            return {
                team1: (teams[0].players || []).map((p: any) => normalizePlayerData(p, isUserPlayer(p))),
                team2: (teams[1].players || []).map((p: any) => normalizePlayerData(p, isUserPlayer(p)))
            };
        }

        // 2. Leetify stats
        if (meta.stats && Array.isArray(meta.stats)) {
            const stats = meta.stats;
            
            const teamsMap: Record<string, any[]> = {};
            stats.forEach((s: any) => {
                const tid = s.initial_team_number || s.team_id || s.teamId || "unknown";
                if (!teamsMap[tid]) teamsMap[tid] = [];
                teamsMap[tid].push(s);
            });

            let t1: any[] = [];
            let t2: any[] = [];
            const teamIds = Object.keys(teamsMap).filter(id => id !== "unknown");
            
            if (teamIds.length >= 2) {
                teamIds.sort();
                t1 = teamsMap[teamIds[0]];
                t2 = teamsMap[teamIds[1]];
            } else if (teamsMap["unknown"]?.length >= 10 || teamIds.length === 1) {
                t1 = stats.slice(0, 5);
                t2 = stats.slice(5, 10);
            }

            const userInT2 = t2.some(isUserPlayer);
            if (userInT2) {
                const temp = t1;
                t1 = t2;
                t2 = temp;
            }

            return {
                team1: t1.map((p: any) => normalizePlayerData(p, isUserPlayer(p))),
                team2: t2.map((p: any) => normalizePlayerData(p, isUserPlayer(p)))
            };
        }

        // 3. Metadata players (Legacy/Steam)
        if (meta.players && Array.isArray(meta.players)) {
            return {
                team1: meta.players.slice(0, 5).map((p: any) => normalizePlayerData(p, isUserPlayer(p))),
                team2: meta.players.slice(5, 10).map((p: any) => normalizePlayerData(p, isUserPlayer(p)))
            };
        }

        // 3. Fallback (Mock)
        return {
            team1: [
                normalizePlayerData({ nickname: "[Sua Conta]", kills: currentMatch.kills, deaths: currentMatch.deaths, assists: currentMatch.assists, adr: currentMatch.adr }, true),
                normalizePlayerData({ nickname: "Aliado 1" }),
                normalizePlayerData({ nickname: "Aliado 2" }),
                normalizePlayerData({ nickname: "Aliado 3" }),
                normalizePlayerData({ nickname: "Aliado 4" }),
            ],
            team2: [
                normalizePlayerData({ nickname: "Inimigo 1" }),
                normalizePlayerData({ nickname: "Inimigo 2" }),
                normalizePlayerData({ nickname: "Inimigo 3" }),
                normalizePlayerData({ nickname: "Inimigo 4" }),
                normalizePlayerData({ nickname: "Inimigo 5" }),
            ]
        };

    };

    const getMatchAnalysis = (user: PlayerStats) => {
        const stats = [];
        
        // Aim Stats
        if (user.hs) stats.push({ label: 'Headshot Accuracy', value: user.hs, color: 'bg-rose-500', tag: 'AIM', raw: parseInt(user.hs) });
        stats.push({ label: 'ADR', value: user.adr.toFixed(1), color: 'bg-emerald-500', tag: 'IMPACT', raw: user.adr });
        
        // Multi-kills
        const [k2, k3, k4, k5] = (user.multikills || "0/0/0/0").split('/').map(Number);
        if (k5 > 0) stats.push({ label: 'Ace Rounds', value: k5.toString(), color: 'bg-amber-500', tag: 'IMPACT', badge: 'LEGENDARY', raw: 100 });
        else if (k4 > 0) stats.push({ label: '4K Rounds', value: k4.toString(), color: 'bg-rose-500', tag: 'IMPACT', raw: 80 });
        
        // Utility
        if (user.util_damage > 0) stats.push({ label: 'Dano de Utilitário', value: user.util_damage.toString(), color: 'bg-cyan-500', tag: 'UTIL', raw: Math.min(100, (user.util_damage / 300) * 100) });
        if (user.flash_assists > 0) stats.push({ label: 'Assist. de Flash', value: user.flash_assists.toString(), color: 'bg-cyan-400', tag: 'UTIL', raw: Math.min(100, user.flash_assists * 20) });

        // Entry
        if (user.fkd > 0) stats.push({ label: 'Duelos de Abertura Vencidos', value: user.fkd.toString(), color: 'bg-purple-500', tag: 'OPENING', raw: (user.fkd / (user.fkd + user.fkd_deaths || 1)) * 100 });

        // Sort by 'raw' importance and take top 5
        const top5 = stats.sort((a, b) => (b.raw || 0) - (a.raw || 0)).slice(0, 5);
        
        // Identity logic
        let identity = "O Consistente";
        if (top5.some(s => s.tag === 'AIM' && s.raw > 50)) identity = "O Especialista em Mira";
        if (top5.some(s => s.tag === 'UTIL' && s.raw > 40)) identity = "O Rei dos Utilitários";
        if (top5.some(s => s.tag === 'OPENING' && s.raw > 60)) identity = "O Entry Fragger";
        if (user.rating > 1.3) identity = "O Carregador";
        if (user.onevx > 0) identity = "O Clutch Master";

        return { top5, identity };
    };

    const getMapImage = (name: string) => {
        if (!name) return 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_mirage.png';
        const mapName = name.toLowerCase().replace('de_', '').trim();
        const mapMapping: Record<string, string> = {
            'dust 2': 'de_dust2', 'dust2': 'de_dust2', 'dust ii': 'de_dust2',
            'mirage': 'de_mirage', 'inferno': 'de_inferno', 'nuke': 'de_nuke',
            'overpass': 'de_overpass', 'vertigo': 'de_vertigo', 'ancient': 'de_ancient',
            'anubis': 'de_anubis'
        };
        const officialName = mapMapping[mapName] || `de_${mapName}`;
        return `https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/${officialName}.png`;
    };

    const isPremier = currentMatch.source?.toLowerCase().includes('premier') || 
                      currentMatch.gameMode?.toLowerCase().includes('premier') ||
                      currentMatch.metadata?.data_source?.toLowerCase().includes('premier') ||
                      currentMatch.metadata?.source?.toLowerCase().includes('premier');

    const displayMode = isPremier ? 'Premier' : 
                        currentMatch.gameMode?.toLowerCase().includes('matchmaking') ? 'Competitivo' : 
                        currentMatch.gameMode || 'Competitivo';

    // DYNAMIC SCORE AND RESULT
    // Find team numbers/scores from metadata to get the REAL score
    const getMatchResult = () => {
        const meta = currentMatch.metadata || {};
        const stats = meta.stats || [];
        
        // 1. Identify all team numbers present in the match
        const teamNumbers = Array.from(new Set(stats.map((s: any) => s.initial_team_number).filter(Boolean))) as number[];
        
        // 2. Identify the user's team number
        const userPlayer = stats.find((p: any) => {
            const userNickname = meta.playerNickname || meta.metadata?.playerNickname;
            const userSteamId = meta.metadata?.steamId || meta.steam64Id;
            return (
                p.is_user === true || 
                p.isUser === true ||
                (userNickname && (p.nickname === userNickname || p.name === userNickname)) ||
                (userSteamId && (p.player_id === userSteamId || p.steam64_id === userSteamId || p.steamId === userSteamId))
            );
        });

        const userTeamNum = userPlayer?.initial_team_number;
        const enemyTeamNum = teamNumbers.find(n => n !== userTeamNum);

        // Exhaustive search for scores
        const findScore = (teamNum: number | undefined) => {
            if (teamNum === undefined) return 0;
            // Try team_X_score
            if (meta[`team_${teamNum}_score`] !== undefined) return meta[`team_${teamNum}_score`];
            // Try teamXScore
            if (meta[`team${teamNum}Score`] !== undefined) return meta[`team${teamNum}Score`];
            // Try teamScores array
            if (Array.isArray(meta.team_scores)) {
                const found = meta.team_scores.find((t: any) => t.team_number === teamNum || t.teamNumber === teamNum);
                if (found && found.score !== undefined) return found.score;
            }
            return 0;
        };

        let s1 = findScore(userTeamNum);
        let s2 = findScore(enemyTeamNum);

        // FALLBACK: If scores are identical and NOT a 13-13 tie, or both 0, or team numbers are missing
        const isSuspicious = (s1 === s2 && s1 !== 13) || (s1 === 0 && s2 === 0) || !userTeamNum;
        
        if (isSuspicious && currentMatch.score) {
            const parts = currentMatch.score.split(/[^\d]+/);
            if (parts.length >= 2) {
                const scoreA = parseInt(parts[0]);
                const scoreB = parseInt(parts[1]);
                
                const isActualWin = currentMatch.result === 'Win' || currentMatch.result === 'Victory';
                if (isActualWin) {
                    s1 = Math.max(scoreA, scoreB);
                    s2 = Math.min(scoreA, scoreB);
                } else {
                    s1 = Math.min(scoreA, scoreB);
                    s2 = Math.max(scoreA, scoreB);
                }
            }
        }

        return {
            alliesScore: s1,
            enemiesScore: s2,
            win: s1 > s2 || (s1 === s2 && (currentMatch.result === 'Win' || currentMatch.result === 'Victory'))
        };
    };

    const { team1, team2 } = getScoreboardData();
    const userData = team1.find(p => p.isUser) || team2.find(p => p.isUser) || team1[0];
    const { top5, identity } = getMatchAnalysis(userData);
    const { alliesScore, enemiesScore, win: isWin } = getMatchResult();

    const isVerified = currentMatch.source === 'Leetify' || currentMatch.source === 'Faceit' || !!currentMatch.metadata?.stats;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-6xl max-h-[90vh] bg-[#0b0e13] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Cinematic Header (Leetify Style) */}
                        <div className="relative h-64 shrink-0 overflow-hidden">
                            {/* Map Background with Dark Overlay */}
                            <img 
                                src={getMapImage(currentMatch?.mapName)} 
                                className="absolute inset-0 w-full h-full object-cover scale-110 blur-[1px] opacity-60"
                                alt="" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#0b0e13]" />
                            
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 z-20 w-12 h-12 rounded-2xl bg-black/60 hover:bg-red-500/80 flex items-center justify-center transition-all border border-white/10 group active:scale-95"
                            >
                                <X size={24} className="text-white group-hover:rotate-90 transition-transform" />
                            </button>

                            {/* Banner Content */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                                <div className="flex items-center gap-16">
                                    {/* Map info left */}
                                    <div className="hidden md:flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/10 rounded-xl backdrop-blur-md">
                                            <img src={getMapImage(currentMatch.mapName)} className="w-5 h-5 rounded-md object-cover" alt="" />
                                            <span className="text-xs font-black uppercase tracking-[0.2em] text-white">
                                                {currentMatch.mapName?.replace('de_', '').toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Activity size={12} className="text-emerald-500" />
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{displayMode}</span>
                                        </div>
                                    </div>

                                    {/* Main Result */}
                                    <div className="flex flex-col items-center">
                                        <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-3 border ${
                                            isWin ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                        }`}>
                                            {isWin ? 'VICTORY' : 'DEFEAT'}
                                        </div>
                                        <div className="flex items-center justify-center gap-6">
                                            <span className={`text-7xl font-black italic tracking-tighter drop-shadow-2xl ${isWin ? 'text-white' : 'text-zinc-400'}`}>
                                                {alliesScore}
                                            </span>
                                            <div className="flex flex-col items-center justify-center -mt-2">
                                                <span className="text-4xl font-black text-zinc-700 italic">:</span>
                                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Score</span>
                                            </div>
                                            <span className={`text-7xl font-black italic tracking-tighter drop-shadow-2xl ${!isWin ? 'text-white' : 'text-zinc-400'}`}>
                                                {enemiesScore}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Date info right */}
                                    <div className="hidden md:flex flex-col items-start gap-2">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/10 rounded-xl backdrop-blur-md text-white/80">
                                            <Calendar size={14} className="text-emerald-500" />
                                            <span className="text-xs font-black tracking-widest uppercase">
                                                {new Date(currentMatch.matchDate).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isVerified ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                {isVerified ? 'Dados Verificados' : 'Dados Estimados'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Primary Navigation (Leetify Tabs) */}
                            <div className="absolute bottom-0 left-0 right-0 flex justify-center px-8 border-b border-white/5">
                                <div className="flex gap-8">
                                    {[
                                        { id: 'seu-jogo', label: 'SEU JOGO' },
                                        { id: 'visao-geral', label: 'VISÃO GERAL' },
                                        { id: 'detalhes', label: 'DETALHES' },
                                        { id: 'duelos', label: 'DUELOS' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setMainTab(tab.id);
                                                if (tab.id !== 'detalhes') setSubTab('geral');
                                            }}
                                            className="relative py-4 px-2 group"
                                        >
                                            <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
                                                mainTab === tab.id ? 'text-emerald-500' : 'text-zinc-500 group-hover:text-white'
                                            }`}>
                                                {tab.label}
                                            </span>
                                            {mainTab === tab.id && (
                                                <motion.div 
                                                    layoutId="activeTab"
                                                    className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sub-navigation for Details (Leetify Style) */}
                        {mainTab === 'detalhes' && (
                            <div className="bg-black/20 border-b border-white/5 px-8 pt-4 overflow-x-auto no-scrollbar">
                                <div className="flex gap-6 pb-4">
                                    {[
                                        { id: 'geral', label: 'Geral' },
                                        { id: 'timeline', label: 'Linha do Tempo' },
                                        { id: 'mira', label: 'Mira' },
                                        { id: 'utilitarios', label: 'Utilitários' },
                                        { id: 'atividade', label: 'Atividade' },
                                        { id: 'trocas', label: 'Trocas' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setSubTab(tab.id)}
                                            className={`text-[10px] font-black uppercase tracking-widest px-1 transition-colors whitespace-nowrap ${
                                                subTab === tab.id ? 'text-rose-500' : 'text-zinc-600 hover:text-white'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Body Area */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar text-white">
                            {mainTab === 'seu-jogo' ? (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        {/* Left Column: Identity & Highlights */}
                                        <div className="lg:col-span-12 xl:col-span-7 space-y-8">
                                            {/* Identity Card (Premium Style) */}
                                            <div className="relative group overflow-hidden bg-[#12161d] border border-white/[0.08] rounded-[40px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/[0.03] blur-[120px] -mr-64 -mt-64" />
                                                <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-emerald-500/[0.02] blur-[80px]" />
                                                
                                                <div className="flex flex-col md:flex-row items-center md:items-start gap-10 mb-12 relative z-10">
                                                    <div className="relative shrink-0">
                                                        <div className="w-32 h-32 rounded-[40px] overflow-hidden border-2 border-emerald-500/30 p-1.5 bg-zinc-900 shadow-2xl">
                                                            <img 
                                                                src={userData.avatar} 
                                                                className="w-full h-full object-cover rounded-[32px] group-hover:scale-110 transition-transform duration-700" 
                                                                alt="" 
                                                            />
                                                        </div>
                                                        <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-[#1a1f26] border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                                                            <Trophy size={18} className="text-emerald-500" />
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 text-center md:text-left">
                                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                                                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-emerald-500/20">Identidade na Partida</span>
                                                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border ${
                                                                userData.rating >= 1.2 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-zinc-800 text-zinc-500 border-white/5'
                                                            }`}>
                                                                Performance {userData.rating >= 1.2 ? 'ELITE' : 'ESTÁVEL'}
                                                            </span>
                                                        </div>
                                                        <h2 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-white group-hover:text-emerald-300 transition-colors duration-500">
                                                            {identity}
                                                        </h2>
                                                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-4 opacity-60">Sua performance baseada em todos os dados analíticos coletados</p>
                                                    </div>
                                                </div>

                                                {/* Top 5 Stats Highlight - Advanced Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 relative z-10 bg-white/[0.02] p-8 rounded-[32px] border border-white/5">
                                                    {top5.map((stat, i) => (
                                                        <div key={i} className="flex flex-col gap-3 group/stat">
                                                            <div className="flex justify-between items-end">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${stat.color} shadow-[0_0_8px_currentColor]`} />
                                                                    <span className="text-[11px] font-black uppercase tracking-wider text-white/90">{stat.label}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xl font-black italic text-white leading-none">{stat.value}</span>
                                                                    <span className="text-[9px] font-black text-zinc-600 uppercase italic">{stat.tag}</span>
                                                                </div>
                                                            </div>
                                                            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                                                                <motion.div 
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${Math.min(100, Math.max(10, stat.raw || 50))}%` }}
                                                                    transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                                                                    className={`absolute inset-y-0 left-0 ${stat.color} shadow-[0_0_15px_rgba(0,0,0,0.5)]`}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {top5.length === 0 && (
                                                        <div className="col-span-2 text-zinc-500 text-[10px] uppercase font-black tracking-widest text-center py-4">
                                                            Aguardando processamento detalhado dos dados
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Key Metrics Comparison */}
                                        <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6">
                                            <div className="bg-[#12161d] border border-white/[0.08] rounded-[40px] p-8 flex-1 flex flex-col">
                                                <div className="flex items-center justify-between mb-8 px-2">
                                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Métricas Principais</h3>
                                                    <div className="flex items-center gap-2 text-[9px] font-black text-rose-500 uppercase tracking-widest">
                                                        <Activity size={10} /> LIVE COMPARISON
                                                    </div>
                                                </div>

                                                <div className="space-y-1 flex-1 overflow-y-auto pr-2 no-scrollbar">
                                                    {[
                                                        { label: 'Rating Leetify', value: userData.rating.toFixed(2), avg: '1.00', trend: userData.rating >= 1 ? 'up' : 'down', icon: <Activity size={12} /> },
                                                        { label: 'ADR (Dano Médio)', value: userData.adr.toFixed(1), avg: '80.0', trend: userData.adr >= 80 ? 'up' : 'down', icon: <Zap size={12} /> },
                                                        { label: 'Kills de Abertura', value: userData.fkd.toString(), avg: '2.1', trend: userData.fkd >= 2 ? 'up' : 'down', icon: <Sword size={12} /> },
                                                        { label: 'Precisão (HS%)', value: userData.hs, avg: '35%', trend: parseInt(userData.hs) >= 35 ? 'up' : 'down', icon: <Target size={12} /> },
                                                        { label: 'KAST %', value: userData.kast, avg: '72%', trend: parseInt(userData.kast) >= 72 ? 'up' : 'down', icon: <TrendingUp size={12} /> },
                                                        { label: 'Trocas (Trades)', value: userData.trades.toString(), avg: '3.5', trend: userData.trades >= 3 ? 'up' : 'down', icon: <Zap size={12} className="rotate-45" /> }
                                                    ].map((stat, i) => (
                                                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/[0.03] transition-all group border border-transparent hover:border-white/5">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`p-2 rounded-lg bg-zinc-800 transition-colors group-hover:bg-zinc-700 ${stat.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                    {stat.icon}
                                                                </div>
                                                                <span className="text-[11px] font-black text-zinc-400 tracking-wide uppercase transition-colors group-hover:text-white">{stat.label}</span>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <span className={`text-lg font-black italic tracking-tighter ${stat.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                    {stat.value}
                                                                </span>
                                                                <div className="flex items-center gap-2 w-16 justify-end">
                                                                    <span className="text-[10px] font-bold text-zinc-600 italic">{stat.avg}</span>
                                                                    {stat.trend === 'up' ? (
                                                                        <ChevronUp size={12} className="text-emerald-500 shrink-0" />
                                                                    ) : (
                                                                        <ChevronDown size={12} className="text-rose-500 shrink-0" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : mainTab === 'visao-geral' ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    {/* High-Level Performance Ratings Grid (Slimmer & Clearer) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-6">
                                            <div className="flex items-center gap-2">
                                                <Activity size={12} className="text-emerald-500" />
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">A Sua Performance Individual</h3>
                                            </div>
                                            <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                                                Versus Match Average
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                            {[
                                                { label: 'Mira', value: currentMatch.metadata?.leetify_ratings?.aim || Math.min(99, Math.floor(parseInt(userData.hs) * 1.5 + (userData.kills / (userData.deaths || 1)) * 10)), icon: <Target size={14} className="text-rose-500" /> },
                                                { label: 'Utilitários', value: currentMatch.metadata?.leetify_ratings?.utility || Math.min(99, Math.floor((userData.util_damage / 4) + (userData.flash_assists * 10))), icon: <Zap size={14} className="text-sky-500" /> },
                                                { label: 'Posicionam.', value: currentMatch.metadata?.leetify_ratings?.positioning || Math.min(99, Math.floor(userData.rating * 50 + (20 - userData.deaths))), icon: <Shield size={14} className="text-emerald-500" /> },
                                                { label: 'Clutch', value: currentMatch.metadata?.leetify_ratings?.clutching || Math.min(99, userData.onevx * 40 + (isWin ? 20 : 0)), icon: <Trophy size={14} className="text-amber-500" /> },
                                                { label: 'Abertura', value: currentMatch.metadata?.leetify_ratings?.opening || Math.min(99, userData.fkd * 25), icon: <Sword size={14} className="text-purple-500" /> },
                                            ].map((stat, i) => (
                                                <div key={i} className="bg-[#12161d] border border-white/[0.06] p-4 rounded-[24px] flex flex-col items-center gap-2 shadow-sm group hover:border-emerald-500/20 transition-all">
                                                    <div className="flex items-center gap-3 w-full px-1">
                                                        <div className="p-1.5 bg-white/5 rounded-lg group-hover:bg-emerald-500/10 transition-colors shrink-0">
                                                            {stat.icon}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[8px] font-black uppercase text-zinc-600 tracking-wider truncate">{stat.label}</div>
                                                            <div className="text-lg font-black italic text-white tracking-tighter -mt-0.5">{stat.value}</div>
                                                        </div>
                                                    </div>
                                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${stat.value}%` }}
                                                            className={`h-full ${stat.value > 80 ? 'bg-emerald-500' : stat.value > 50 ? 'bg-zinc-700' : 'bg-rose-500'}`}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {[team1, team2].map((team, tIdx) => (
                                        <div key={tIdx} className="space-y-6">
                                            <div className="flex items-center justify-between px-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${tIdx === 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                                                        <Shield size={24} className={tIdx === 0 ? 'text-emerald-500' : 'text-rose-500'} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
                                                            {tIdx === 0 ? 'Time Aliado' : 'Time Inimigo'}
                                                        </h3>
                                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Score Total: {tIdx === 0 ? alliesScore : enemiesScore}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-8 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                                                    <span>Rating Médio: {(team.reduce((acc, p) => acc + p.rating, 0) / team.length).toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <div className="bg-[#12161d] border border-white/[0.08] rounded-[40px] overflow-hidden shadow-xl">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-white/5 text-[10px] text-zinc-600 font-black uppercase tracking-widest bg-white/[0.01]">
                                                            <th className="pl-10 py-6">Jogador</th>
                                                            <th className="py-6 text-center">K</th>
                                                            <th className="py-6 text-center">A</th>
                                                            <th className="py-6 text-center">D</th>
                                                            <th className="py-6 text-center">Diff</th>
                                                            <th className="py-6 text-center">ADR</th>
                                                            <th className="py-6 text-center">HS%</th>
                                                            <th className="pr-10 py-6 text-right">Rating</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {team.map((p, i) => (
                                                            <tr key={i} className={`group hover:bg-white/[0.03] transition-colors ${p.isUser ? 'bg-emerald-500/[0.03]' : ''}`}>
                                                                <td className="pl-10 py-5">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="relative group/avatar">
                                                                            <img src={p.avatar} className="w-10 h-10 rounded-xl border border-white/10 group-hover/avatar:scale-105 transition-transform" alt="" />
                                                                            {p.isUser && <div className="absolute -top-1 -left-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#12161d] shadow-lg" />}
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-[13px] font-black italic uppercase text-white group-hover:text-emerald-400 transition-colors">
                                                                                <a href={`/player/${p.steamId}`} className="hover:underline underline-offset-4 decoration-emerald-500/50">
                                                                                    {p.nickname}
                                                                                </a>
                                                                            </div>
                                                                            <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Rank {p.rank}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-5 text-center text-[13px] font-black text-white">{p.kills}</td>
                                                                <td className="py-5 text-center text-[13px] font-bold text-zinc-500">{p.assists}</td>
                                                                <td className="py-5 text-center text-[13px] font-bold text-zinc-500">{p.deaths}</td>
                                                                <td className={`py-5 text-center text-[11px] font-black italic ${p.diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                    {p.diff >= 0 ? '+' : ''}{p.diff}
                                                                </td>
                                                                <td className="py-5 text-center text-[13px] font-black text-zinc-300">{p.adr.toFixed(0)}</td>
                                                                <td className="py-5 text-center text-[13px] font-bold text-zinc-500">{p.hs}</td>
                                                                <td className="pr-10 py-5 text-right">
                                                                    <span className={`px-3 py-1.5 rounded-xl text-[12px] font-black italic border ${
                                                                        p.rating >= 1.2 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 
                                                                        p.rating >= 1.0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                                        'bg-zinc-800 text-zinc-500 border-white/5'
                                                                    }`}>
                                                                        {p.rating.toFixed(2)}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : mainTab === 'detalhes' ? (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        {[team1, team2].map((team, tIdx) => (
                                            <div key={tIdx} className="space-y-6">
                                                <div className="flex items-center gap-3 px-4">
                                                    <Zap size={16} className={tIdx === 0 ? 'text-emerald-500' : 'text-rose-500'} />
                                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                                                        {tIdx === 0 ? 'Utilidade Aliada' : 'Utilidade Inimiga'}
                                                    </h3>
                                                </div>
                                                
                                                <div className="bg-[#12161d] border border-white/[0.08] rounded-[40px] p-8 space-y-8 shadow-xl">
                                                    <div className="h-48 flex items-end justify-around gap-3 px-4">
                                                        {team.map((p, pIdx) => {
                                                            const maxVal = Math.max(...[...team1, ...team2].map(px => px.util_damage + px.blind_time * 5 + 10));
                                                            const h3 = (p.util_damage / maxVal) * 100;
                                                            const h1 = (p.flash_assists * 10 / maxVal) * 100;
                                                            const h2 = (p.blind_time / maxVal) * 100;

                                                            return (
                                                                <div key={pIdx} className="flex flex-col items-center gap-4 flex-1 group">
                                                                    <div className="w-full relative flex flex-col-reverse justify-start gap-1">
                                                                        <div className="bg-emerald-500/80 rounded-full w-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ height: Math.max(8, h1) + '%' }} />
                                                                        <div className="bg-sky-500/80 rounded-full w-full shadow-[0_0_10px_rgba(14,165,233,0.3)]" style={{ height: Math.max(8, h2) + '%' }} />
                                                                        <div className="bg-orange-500/80 rounded-full w-full shadow-[0_0_10px_rgba(249,115,22,0.3)]" style={{ height: Math.max(8, h3) + '%' }} />
                                                                    </div>
                                                                    <div className="relative">
                                                                       <img src={p.avatar} className="w-8 h-8 rounded-full border border-white/20 group-hover:scale-125 transition-transform" alt="" />
                                                                       {p.isUser && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#12161d]" />}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="grid grid-cols-5 gap-2 px-2 text-[8px] font-black uppercase text-zinc-600 text-center">
                                                        <div className="flex items-center gap-1.5 justify-center"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Flash</div>
                                                        <div className="flex items-center gap-1.5 justify-center"><div className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Blind</div>
                                                        <div className="flex items-center gap-1.5 justify-center"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Dano</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-[#12161d] border border-white/[0.08] rounded-[40px] overflow-hidden shadow-xl">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5 text-[9px] text-zinc-600 font-black uppercase tracking-widest bg-white/[0.01]">
                                                    <th className="pl-10 py-6">Jogador</th>
                                                    <th className="py-6 text-center">Flashes Lançados</th>
                                                    <th className="py-6 text-center">Inimigos Cegos</th>
                                                    <th className="py-6 text-center">Tempo Médio</th>
                                                    <th className="py-6 text-center">Dano de Util.</th>
                                                    <th className="pr-10 py-6 text-right">Rating Util.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {[...team1, ...team2].map((p, i) => (
                                                    <tr key={i} className={`hover:bg-white/[0.03] transition-colors ${p.isUser ? 'bg-emerald-500/[0.03]' : ''}`}>
                                                        <td className="pl-10 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <img src={p.avatar} className="w-6 h-6 rounded-lg opacity-60" alt="" />
                                                                <span className="text-[11px] font-black italic uppercase text-zinc-400">{p.nickname}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-5 text-center text-xs text-white font-bold">{p.util_thrown}</td>
                                                        <td className="py-5 text-center text-xs text-zinc-300 font-bold">{p.flash_assists}</td>
                                                        <td className="py-5 text-center text-xs text-emerald-500 font-black">{p.blind_time.toFixed(1)}s</td>
                                                        <td className="py-5 text-center text-xs text-rose-500 font-black">{p.util_damage.toFixed(0)}</td>
                                                        <td className="pr-10 py-5 text-right">
                                                            <span className="text-[10px] font-black bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                                                                {Math.min(99, Math.floor(p.util_damage / 2 + p.blind_time * 3 + p.flash_assists * 15))}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <div className="flex flex-col items-center justify-center py-32 bg-[#12161d] border border-white/[0.08] rounded-[40px] shadow-2xl">
                                        <div className="relative mb-10">
                                            <div className="absolute inset-0 bg-emerald-500/20 blur-[40px] animate-pulse rounded-full" />
                                            <Sword size={80} className="text-zinc-800 relative z-10 rotate-12" />
                                        </div>
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-4">Relatório de Duelos</h3>
                                        <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px] max-w-sm text-center leading-relaxed">
                                            Visualização avançada de confrontos 1v1 em processamento para matches desta fonte
                                        </p>
                                        <div className="mt-10 px-6 py-2 bg-zinc-800/50 border border-white/5 rounded-full text-[9px] font-black text-rose-500 uppercase tracking-widest">
                                            Coming Soon • Advanced Analytics
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Unified Footer */}
                        <div className="flex items-center justify-between mt-auto pt-8 border-t border-white/5 bg-black/20 p-8">
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                    <Calendar size={14} className="text-emerald-500" />
                                    <span>Data: {currentMatch?.matchDate ? new Date(currentMatch.matchDate).toLocaleDateString('pt-BR') : 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                                    <Shield size={14} />
                                    <span>ID: {currentMatch?.externalId || 'Local'}</span>
                                </div>
                            </div>

                            {currentMatch?.url && (
                                <a
                                    href={currentMatch.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95 group"
                                >
                                    <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                                    Baixar Demo
                                </a>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default MatchReportModal;
