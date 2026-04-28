import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY;
const LEETIFY_BASE_URL = 'https://api-public.cs-prod.leetify.com';

async function fetchAvatars(stats: any[]) {
    if (!stats || !Array.isArray(stats)) return stats;
    
    const steamIds = stats
        .map((p: any) => p.steam64_id || p.player_id || p.steamId)
        .filter(Boolean);

    if (steamIds.length > 0) {
        try {
            const { getMultiplePlayerProfiles } = await import('@/services/steam-service');
            const steamProfiles = await getMultiplePlayerProfiles(steamIds);
            
            const avatarMap = new Map();
            steamProfiles.forEach((profile: any) => {
                avatarMap.set(profile.steamid, profile.avatarfull);
            });

            return stats.map((p: any) => ({
                ...p,
                avatar_url: avatarMap.get(p.steam64_id || p.player_id || p.steamId) || p.avatar_url,
                nickname: avatarMap.has(p.steam64_id || p.player_id || p.steamId) 
                    ? steamProfiles.find((x: any) => x.steamid === (p.steam64_id || p.player_id || p.steamId))?.personaname 
                    : p.name
            }));
        } catch (steamError) {
            console.error("Error fetching Steam avatars for match details:", steamError);
        }
    }
    return stats;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params;

    try {
        // 1. Verificar primeiro no nosso próprio Banco de Dados (Partidas geradas pelo nosso Bot)
        const localMatch = await prisma.globalMatch.findUnique({
            where: { id: matchId },
            include: { players: true }
        });

        if (localMatch && localMatch.players && localMatch.players.length > 0) {
            const localMeta = (localMatch.metadata as any) || {};
            let localStats = localMatch.players.map(p => {
                const m = (p.metadata as any) || {};
                // FK/FD: vem ou das colunas diretas (parser Python) ou do metadata (sync Leetify)
                const fkVal = (p as any).fk ?? m.fk ?? m.fk_count ?? m.first_kill_count ?? m.firstKills ?? 0;
                const fdVal = (p as any).fd ?? m.fd ?? m.fd_count ?? m.first_death_count ?? m.firstDeaths ?? 0;
                return {
                    team_id: p.team,
                    steam64_id: p.steamId,
                    name: m.name ?? m.nickname ?? m.playerNickname ?? p.steamId,
                    total_kills: p.kills,
                    total_deaths: p.deaths,
                    total_assists: p.assists,
                    dpr: p.adr, // alias adr
                    accuracy_head: p.hsPercentage ? (p.hsPercentage / 100) : 0, 
                    rating: m.rating ?? m.leetify_rating ?? 0,
                    kast: m.kast ?? m.kast_percent ?? 0,
                    // FK/FD com nomes diretos que o normalizeP lê
                    fk: fkVal,
                    fd: fdVal,
                    fkd: fkVal,       // alias legado
                    fk_deaths: fdVal, // alias legado
                    // Multikills
                    triple_kills: m.triples ?? m.multi3k ?? m.triple_kills ?? m.tripleKills ?? 0,
                    quad_kills: m.quads ?? m.multi4k ?? m.quad_kills ?? m.quadKills ?? 0,
                    penta_kills: m.aces ?? m.multi5k ?? m.penta_kills ?? m.pentaKills ?? m.ace_kills ?? 0,
                    multi3k: m.triples ?? m.multi3k ?? m.triple_kills ?? m.tripleKills ?? 0,
                    multi4k: m.quads ?? m.multi4k ?? m.quad_kills ?? m.quadKills ?? 0,
                    multi5k: m.aces ?? m.multi5k ?? m.penta_kills ?? m.pentaKills ?? m.ace_kills ?? 0,
                    // Utility
                    utility_damage: m.utilDmg ?? m.utility_damage ?? m.util_damage ?? (m.he_foes_damage_avg != null && m.rounds_count ? Math.round(m.he_foes_damage_avg * m.rounds_count) : 0),
                    blind_time: m.blindTime ?? m.flashbang_hit_foe_avg_duration ?? m.blind_time ?? m.enemiesFlashedDuration ?? 0,
                    he_thrown: m.heThrown ?? m.he_thrown ?? 0,
                    flash_thrown: m.flashThrown ?? m.flashbang_thrown ?? m.flash_thrown ?? 0,
                    smokes_thrown: m.smokesThrown ?? m.smoke_thrown ?? m.smokes_thrown ?? 0,
                    molotovs_thrown: m.molotovThrown ?? m.molotov_thrown ?? m.molotovs_thrown ?? 0,
                    // Confrontos
                    trades: m.trades ?? m.trade_kills_succeed ?? m.trade_count ?? m.tradeKills ?? 0,
                    trade_kill_count: m.trades ?? m.trade_kills_succeed ?? m.trade_count ?? m.tradeKills ?? 0,
                    trade_kill_opportunities: m.trade_kill_opportunities ?? 0,
                    traded_death_opportunities: m.traded_death_opportunities ?? 0,
                    trade_kills_succeed: m.trade_kills_succeed ?? 0,
                    traded_deaths_succeed: m.traded_deaths_succeed ?? 0,
                    clutches: m.clutches ?? m.clutch_count ?? m.clutches_won ?? m.clutchesWon ?? 0,
                    clutches_won: m.clutches ?? m.clutch_count ?? m.clutches_won ?? m.clutchesWon ?? 0,
                    // Flash
                    flash_assists: m.flashAssists ?? m.flash_assist ?? m.flash_assists ?? m.flashbang_assists ?? 0,
                    is_user: false // será conferido no cliente via SteamID
                };
            });



            // Tentar puxar avatares
            localStats = await fetchAvatars(localStats);

            const data = {
                match_id: localMatch.id,
                map_name: localMatch.mapName,
                game_mode: localMatch.source,
                data_source: localMatch.source,
                match_date: localMatch.matchDate.toISOString(),
                team_2_score: localMatch.scoreB || 0,
                team_3_score: localMatch.scoreA || 0,
                demo_url: localMeta.demoUrl || null,
                metadata: localMeta,
                stats: localStats
            };

            return NextResponse.json(data);
        }

        // 2. Se não encontrou no GlobalMatch, tentamos no Tracker API (Python)
        // Isso é essencial para o 2D Viewer de partidas locais que ainda não foram migradas
        const TRACKER_API = process.env.PYTHON_API_URL || 'http://localhost:8000';
        try {
            const trackerRes = await axios.get(`${TRACKER_API}/api/match/${matchId}`);
            if (trackerRes.status === 200) {
                let trackerData = trackerRes.data;
                // Normalizar se necessário (o python geralmente já retorna no formato ou próximo dele)
                return NextResponse.json(trackerData);
            }
        } catch (trackerError) {
            console.warn(`Match ${matchId} not found in Tracker API fallback.`);
        }

        // 3. Fallback final: Leetify API
        if (!LEETIFY_API_KEY) {
            return NextResponse.json({ error: "Match not found locally and LEETIFY_API_KEY is missing." }, { status: 404 });
        }

        const matchResponse = await axios.get(`${LEETIFY_BASE_URL}/v2/matches/${matchId}`, {
            headers: {
                '_leetify_key': LEETIFY_API_KEY
            }
        });

        let data = matchResponse.data;
        
        // Normalizar dados do Leetify para o formato esperado pelo frontend
        if (data.stats && Array.isArray(data.stats)) {
            data.stats = data.stats.map((p: any) => {
                return {
                    ...p,
                    // Campos de alias para normalizeP no frontend
                    // Rating: leetify v2 usa leetify_rating
                    rating: p.leetify_rating ?? p.rating ?? 0,
                    // ADR: leetify v2 usa dpr
                    adr: p.dpr ?? p.adr ?? p.average_damage_per_round ?? 0,
                    // Kills/Deaths/Assists: leetify v2 usa total_kills etc
                    kills: p.total_kills ?? p.kills ?? 0,
                    deaths: p.total_deaths ?? p.deaths ?? 0,
                    assists: p.total_assists ?? p.assists ?? 0,
                    // KAST: não disponível na v2
                    kast: p.kast !== undefined ? p.kast : (p.kast_percent || 0),
                    // Multikills: campos reais da v2
                    triples: p.multi3k ?? p.triple_kills ?? p.tripleKills ?? 0,
                    quads: p.multi4k ?? p.quad_kills ?? p.quadKills ?? 0,
                    aces: p.multi5k ?? p.penta_kills ?? p.pentaKills ?? p.ace_kills ?? 0,
                    // Trades: campo real da v2
                    trades: p.trade_kills_succeed ?? p.trade_count ?? p.tradeKills ?? p.trades ?? 0,
                    // Clutches: try multiple sources
                    clutches: p.clutch_count ?? p.clutches_won ?? p.clutchesWon ?? p.clutches ?? 
                             ((p.clutch_v1_wins ?? 0) + (p.clutch_v2_wins ?? 0) + (p.clutch_v3_wins ?? 0) + (p.clutch_v4_wins ?? 0) + (p.clutch_v5_wins ?? 0)) ?? 0,
                    clutches_won: p.clutch_count ?? p.clutches_won ?? p.clutchesWon ?? p.clutches ?? 
                                 ((p.clutch_v1_wins ?? 0) + (p.clutch_v2_wins ?? 0) + (p.clutch_v3_wins ?? 0) + (p.clutch_v4_wins ?? 0) + (p.clutch_v5_wins ?? 0)) ?? 0,
                    clutch_v1_wins: p.clutch_v1_wins ?? 0,
                    clutch_v2_wins: p.clutch_v2_wins ?? 0,
                    clutch_v3_wins: p.clutch_v3_wins ?? 0,
                    clutch_v4_wins: p.clutch_v4_wins ?? 0,
                    clutch_v5_wins: p.clutch_v5_wins ?? 0,
                    // FK/FD: não disponível na v2
                    fk: p.fk_count ?? p.first_kill_count ?? p.firstKills ?? 0,
                    fd: p.fd_count ?? p.first_death_count ?? p.firstDeaths ?? 0,
                    // Utility damage: Leetify v2 NÃO tem utility_damage direto.
                    // Calcula: he_foes_damage_avg (dano médio de HE por round) × rounds_count
                    // Isso dá o total de dano de HE causado no jogo (proxy de utility damage)
                    utility_damage: p.utility_damage ?? p.util_damage ?? p.utilityDamage ??
                        (p.he_foes_damage_avg != null && p.rounds_count
                            ? Math.round(p.he_foes_damage_avg * p.rounds_count)
                            : 0),

                    // Flash assists: campo real da v2 é flash_assist
                    flash_assists: p.flash_assist ?? p.flash_assists ?? p.flashAssists ?? 0,
                    // Blind time: campo real da v2 é flashbang_hit_foe_avg_duration
                    blind_time: p.flashbang_hit_foe_avg_duration ?? p.blind_time ?? p.enemiesFlashedDuration ?? 0,
                    // Grenade counts: campos reais da v2
                    he_thrown: p.he_thrown ?? p.heThrown ?? 0,
                    flash_thrown: p.flashbang_thrown ?? p.flash_thrown ?? p.flashThrown ?? 0,
                    smokes_thrown: p.smoke_thrown ?? p.smokes_thrown ?? p.smokesThrown ?? 0,
                    molotovs_thrown: p.molotov_thrown ?? p.molotovs_thrown ?? p.molotovThrown ?? 0,
                    // Confrontos - oportunidades de trade (Leetify v2)
                    trade_kill_opportunities: p.trade_kill_opportunities ?? 0,
                    traded_death_opportunities: p.traded_death_opportunities ?? 0,
                    trade_kills_succeed: p.trade_kills_succeed ?? 0,
                    traded_deaths_succeed: p.traded_deaths_succeed ?? 0,

                };
            });
            data.demo_url = data.demo_url || data.demoUrl || null;
            data.sharing_code = data.sharingCode || data.matchSharingCode || null;
            data.stats = await fetchAvatars(data.stats);
        }


        return NextResponse.json(data);
    } catch (error: any) {
        if (error.response?.status === 404) {
            return NextResponse.json({ error: "Partida não encontrada no Banco nem no Leetify." }, { status: 404 });
        }
        console.error(`Error fetching match ${matchId}:`, error.message);
        return NextResponse.json({ error: "Failed to fetch match details" }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params;
    const session = await getServerSession(getAuthOptions(request));

    if (!session || !(session.user as any)?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { scoreA, scoreB } = await request.json();

        if (scoreA === undefined || scoreB === undefined) {
             return NextResponse.json({ error: "Missing scoreA or scoreB" }, { status: 400 });
        }

        // 1. Try to update GlobalMatch (Local Demos)
        const globalMatch = await prisma.globalMatch.findUnique({ where: { id: matchId } });
        
        if (globalMatch) {
            const currentMeta = (globalMatch.metadata as any) || {};
            const updatedMatch = await prisma.globalMatch.update({
                where: { id: matchId },
                data: {
                    scoreA: Number(scoreA),
                    scoreB: Number(scoreB),
                    metadata: {
                        ...currentMeta,
                        team_3_score: Number(scoreA),
                        team_2_score: Number(scoreB)
                    }
                }
            });

            let resA = "tie", resB = "tie";
            if (scoreA > scoreB) { resA = "win"; resB = "loss"; }
            else if (scoreB > scoreA) { resA = "loss"; resB = "win"; }

            await prisma.globalMatchPlayer.updateMany({
                where: { globalMatchId: matchId, team: { in: ["A", "CT", "3"] } },
                data: { matchResult: resA }
            });

            await prisma.globalMatchPlayer.updateMany({
                where: { globalMatchId: matchId, team: { in: ["B", "T", "TR", "2", "TERRORIST"] } },
                data: { matchResult: resB }
            });

            console.log(`[PATCH GlobalMatch] ${matchId} updated to ${scoreA}-${scoreB}`);
            return NextResponse.json({ success: true, match: updatedMatch });
        }

        // 2. Try to update Match (Legacy/Official Sync)
        const legacyMatch = await prisma.match.findUnique({ where: { id: matchId } });
        if (legacyMatch) {
            // Determine result for legacy match (usually from user's perspective)
            // In Match table, 'score' is a string "13-6" and 'result' is "Win"/"Loss"
            // We'll assume scoreA is the user's score and scoreB is the opponent's
            const newResult = scoreA > scoreB ? "Win" : (scoreB > scoreA ? "Loss" : "Tie");
            
            const updatedLegacy = await prisma.match.update({
                where: { id: matchId },
                data: {
                    score: `${scoreA}-${scoreB}`,
                    result: newResult
                }
            });

            console.log(`[PATCH LegacyMatch] ${matchId} updated to ${scoreA}-${scoreB} (${newResult})`);
            return NextResponse.json({ success: true, match: updatedLegacy });
        }

        return NextResponse.json({ error: "Match not found in any table" }, { status: 404 });
    } catch (error: any) {
        console.error(`[PATCH Match Error]`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
