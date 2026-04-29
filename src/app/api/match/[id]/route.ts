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
    const profileSteamId = request.nextUrl.searchParams.get('profileSteamId') || '';

    try {
        // 1. Verificar primeiro no nosso próprio Banco de Dados (Partidas geradas pelo nosso Bot)
        const localMatch = await prisma.globalMatch.findUnique({
            where: { id: matchId },
            include: { players: true }
        });

        if (localMatch && localMatch.players && localMatch.players.length > 0) {
            const localMeta = (localMatch.metadata as any) || {};

            // Team number convention:
            // Team A (scoreA) → numeric team "3" → team_3_score  (Leetify convention)
            // Team B (scoreB) → numeric team "2" → team_2_score
            // The frontend's computeScore() looks for team_{initial_team_number}_score in metadata.
            const isTeamA = (t: string | null) => !t || ['A', 'CT', '3'].includes(t.toUpperCase());

            // Find the profile owner's player record to compute result from their perspective
            const profilePlayer = profileSteamId
                ? localMatch.players.find(p => String(p.steamId) === String(profileSteamId))
                : null;
            const profileTeam = profilePlayer?.team ?? null;
            const profileIsTeamA = isTeamA(profileTeam);
            const scoreA = localMatch.scoreA ?? 0;
            const scoreB = localMatch.scoreB ?? 0;
            // Trust the matchResult stored in the database (populated during sync/upload)
            const profileResult = profilePlayer?.matchResult || null;

            let localStats = localMatch.players.map(p => {
                const m = (p.metadata as any) || {};
                // FK/FD: vem ou das colunas diretas (parser Python) ou do metadata (sync Leetify)
                const fkVal = (p as any).fk ?? m.fk ?? m.fk_count ?? m.first_kill_count ?? m.firstKills ?? 0;
                const fdVal = (p as any).fd ?? m.fd ?? m.fd_count ?? m.first_death_count ?? m.firstDeaths ?? 0;
                // Map internal team labels to numeric team numbers used by computeScore()
                // Team A → initial_team_number = 2 (Leetify convention)
                // Team B → initial_team_number = 3
                const numericTeam = isTeamA(p.team) ? '3' : '2';
                return {
                    team_id: p.team,
                    // initial_team_number is CRITICAL — used by computeScore() and getTeams()
                    // to identify which team the profile owner belongs to and look up the right score.
                    initial_team_number: numericTeam,
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
                    is_user: !!(profileSteamId && p.steamId && String(p.steamId) === String(profileSteamId))
                };
            });



            // Tentar puxar avatares
            localStats = await fetchAvatars(localStats);

            // Fetch detailed stats from tracker tables (using raw query since they are not in Prisma)
            const trackerWeaponStatsRaw = await prisma.$queryRaw`
                SELECT * FROM public.tracker_weapon_stats WHERE match_id = ${matchId}
            `.catch(() => []) as any[];

            const trackerClutchEvents = await prisma.$queryRaw`
                SELECT * FROM public.tracker_clutch_events WHERE match_id = ${matchId}
            `.catch(() => []) as any[];

            const trackerMatchPlayers = await prisma.$queryRaw`
                SELECT * FROM public.tracker_match_players WHERE match_id = ${matchId}
            `.catch(() => []) as any[];

            // Normalize weapon stats to match frontend expectations (weapon_name, player_id)
            const trackerWeaponStats = trackerWeaponStatsRaw.map(ws => ({
                ...ws,
                weapon_name: ws.weapon,
                player_id: String(ws.steamid64)
            }));

            // Merge advanced stats from tracker into localStats
            localStats = localStats.map(p => {
                const tp = trackerMatchPlayers.find(x => String(x.steamid64) === String(p.steam64_id));
                if (tp) {
                    return {
                        ...p,
                        avg_ttd: tp.avg_ttd,
                        avg_kill_distance: tp.avg_kill_distance,
                        enemies_flashed: tp.enemies_flashed,
                        blind_time: tp.total_blind_duration,
                        he_thrown: tp.he_thrown,
                        flash_thrown: tp.flash_thrown,
                        smokes_thrown: tp.smokes_thrown,
                        molotovs_thrown: tp.molotovs_thrown,
                        eloChange: tp.elo_change,
                        eloAfter: tp.elo_after
                    };
                }
                return p;
            });

            const data = {
                match_id: localMatch.id,
                map_name: localMatch.mapName,
                game_mode: localMatch.source,
                data_source: localMatch.source,
                match_date: localMatch.matchDate.toISOString(),
                team_2_score: localMatch.scoreB ?? 0,
                team_3_score: localMatch.scoreA ?? 0,
                result: profileResult,
                demo_url: localMeta.demoUrl || null,
                weapon_stats: trackerWeaponStats,
                clutch_events: trackerClutchEvents,
                metadata: {
                    ...localMeta,
                    team_2_score: localMatch.scoreB ?? 0,
                    team_3_score: localMatch.scoreA ?? 0,
                    weapon_stats: trackerWeaponStats,
                    clutch_events: trackerClutchEvents,
                },
                stats: localStats
            };

            return NextResponse.json(data);
        }

        // 2. Se não encontrou no GlobalMatch, tentamos no Tracker API (Python)
        // Isso é essencial para o 2D Viewer de partidas locais que ainda não foram migradas
        const TRACKER_API = process.env.PYTHON_API_URL || 'http://localhost:8000';
        try {
            const trackerRes = await axios.get(`${TRACKER_API}/api/match/${matchId}/stats`);
            if (trackerRes.status === 200) {
                const trackerData = trackerRes.data;
                const matchInfo = trackerData.match;
                const players = trackerData.players.map((p: any) => ({
                    ...p,
                    steam64_id: String(p.steamid64),
                    name: p.personaname || p.steamid64,
                    total_kills: p.kills,
                    total_deaths: p.deaths,
                    total_assists: p.assists,
                    adr: p.adr,
                    accuracy_head: p.hs_count / (p.kills || 1), // HS% aproximado se não tivermos precisão real
                    rating: p.rating || 0,
                    kast: p.kast || 0,
                    fk: p.fk || 0,
                    fd: p.fd || 0,
                    triples: p.triples || 0,
                    quads: p.quads || 0,
                    aces: p.aces || 0,
                    clutches: p.clutches || 0,
                    trades: p.trades || 0,
                    enemies_flashed: p.enemies_flashed || 0,
                    flashbang_hit_foe: p.enemies_flashed || 0, // Alias para o modal
                    total_blind_duration: p.total_blind_duration || 0,
                    blind_time: p.total_blind_duration || 0, // Alias para o modal
                    avg_kill_distance: p.avg_kill_distance || 0,
                    avg_ttd: p.avg_ttd || 0,
                    utility_damage: p.utility_damage || 0,
                    utility_damage_roi: p.utility_damage_roi || 0,
                    he_thrown: p.he_thrown || 0,
                    flash_thrown: p.flash_thrown || 0,
                    smokes_thrown: p.smokes_thrown || 0,
                    molotovs_thrown: p.molotovs_thrown || 0,
                    eloChange: p.elo_change,
                    eloAfter: p.elo_after,
                    initial_team_number: p.team === 'A' ? 3 : 2,
                    is_user: !!(profileSteamId && String(p.steamid64) === String(profileSteamId))
                }));

                const roundSummaries: Record<number, any> = {};
                const rounds = trackerData.rounds || [];
                const kills = trackerData.kill_events || [];
                
                const nameMap = new Map();
                players.forEach((p: any) => {
                    nameMap.set(String(p.steam64_id), p.name);
                });

                rounds.forEach((r: any) => {
                    roundSummaries[r.round_number] = {
                        winner: r.winner_side,
                        reason: r.reason,
                        kills: kills
                            .filter((k: any) => k.round_id === r.round_id)
                            .map((k: any) => ({
                                tick: k.tick,
                                attackerSteamId: String(k.attacker_steamid),
                                victimSteamId: String(k.victim_steamid),
                                attackerName: nameMap.get(String(k.attacker_steamid)) || String(k.attacker_steamid),
                                victimName: nameMap.get(String(k.victim_steamid)) || String(k.victim_steamid),
                                weapon: k.weapon,
                                isHeadshot: k.is_headshot,
                                attackerHp: k.attacker_hp,
                                victimHp: k.victim_hp
                            }))
                    };
                });

                const data = {
                    match_id: matchInfo.match_id,
                    map_name: matchInfo.map_name,
                    game_mode: matchInfo.source,
                    data_source: matchInfo.source,
                    match_date: matchInfo.match_date,
                    team_2_score: matchInfo.score_ct,
                    team_3_score: matchInfo.score_t,
                    result: null, 
                    demo_url: matchInfo.demo_url,
                    stats: players,
                    weapon_stats: trackerData.weapon_stats || [],
                    clutch_events: trackerData.clutch_events || [],
                    metadata: {
                        ...matchInfo,
                        team_2_score: matchInfo.score_ct,
                        team_3_score: matchInfo.score_t,
                        roundSummaries: roundSummaries
                    }
                };

                return NextResponse.json(data);
            }
        } catch (trackerError: any) {
            console.warn(`Match ${matchId} tracker fetch failed: ${trackerError.message}`);
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
                    is_user: !!(profileSteamId && (p.steam64_id || p.player_id || p.steamId) && String(p.steam64_id || p.player_id || p.steamId) === String(profileSteamId))
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
        // Check by primary ID
        let globalMatch = await prisma.globalMatch.findUnique({ where: { id: matchId } });
        
        if (globalMatch) {
            const currentMeta = (globalMatch.metadata as any) || {};
            const updatedMatch = await prisma.globalMatch.update({
                where: { id: matchId },
                data: {
                    scoreA: Number(scoreA),
                    scoreB: Number(scoreB),
                    metadata: {
                        ...currentMeta,
                        team_2_score: Number(scoreA),
                        team_3_score: Number(scoreB)
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
        // Search by ID OR externalId
        const legacyMatch = await prisma.match.findFirst({ 
            where: { 
                OR: [
                    { id: matchId },
                    { externalId: matchId }
                ]
            } 
        });

        if (legacyMatch && legacyMatch.externalId) {
            // THE USER IS ALWAYS RIGHT: If they send scoreA > scoreB, it's a Win for the profile owner
            const sA = Number(scoreA);
            const sB = Number(scoreB);
            const newResult = sA > sB ? "Win" : (sB > sA ? "Loss" : "Tie");
            
            await prisma.match.updateMany({
                where: { externalId: legacyMatch.externalId },
                data: {
                    score: `${sA}-${sB}`,
                    result: newResult
                }
            });

            console.log(`[PATCH LegacyMatch] Forced override for ${legacyMatch.externalId} to ${sA}-${sB} (${newResult})`);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Match not found in any table" }, { status: 404 });
    } catch (error: any) {
        console.error(`[PATCH Match Error]`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params;
    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get('steamId');

    const session = await getServerSession(getAuthOptions(request));
    if (!session || !(session.user as any)?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!steamId) {
        return NextResponse.json({ error: "Missing steamId" }, { status: 400 });
    }

    try {
        // 1. Remove from GlobalMatchPlayer
        const deleted = await prisma.globalMatchPlayer.deleteMany({
            where: {
                globalMatchId: matchId,
                steamId: steamId
            }
        });

        if (deleted.count > 0) {
            console.log(`[DELETE Player] Removed ${steamId} from match ${matchId}`);
            return NextResponse.json({ success: true, count: deleted.count });
        }

        // 2. Fallback: If it's a legacy match, we can't easily delete a player from a JSON blob
        // unless we edit the metadata. But for now, we focus on GlobalMatchPlayer.
        
        return NextResponse.json({ error: "Player not found in this match" }, { status: 404 });
    } catch (error: any) {
        console.error(`[DELETE Player Error]`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
