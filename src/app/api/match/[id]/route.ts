import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

// Patch BigInt to be serializable to JSON
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY;
const LEETIFY_BASE_URL = 'https://api-public.cs-prod.leetify.com';

// Helper compartilhado entre GET e PATCH para identificar o time A
const isTeamA = (t: string | null | undefined) => !t || ['A', 'CT', '3'].includes(String(t).toUpperCase());

async function fetchAvatars(stats: any[]) {
    if (!stats || !Array.isArray(stats)) return stats;
    
    const steamIds = stats
        .map((p: any) => p.steam64_id || p.player_id || p.steamId)
        .filter(Boolean);

    if (steamIds.length > 0) {
        try {
            const { getMultiplePlayerProfiles } = await import('@/services/steam-service');
            const steamProfiles = await getMultiplePlayerProfiles(steamIds);
            
            // Persistir atualizações no Banco de Dados
            const { prisma } = await import('@/lib/prisma');
            await Promise.all(steamProfiles.map(async (sp: any) => {
                const sid = sp.steamid;
                const name = sp.personaname;
                const avatar = sp.avatarfull;

                // 1. Atualizar tracker_players (usado pelo analisador de demos)
                await (prisma as any).tracker_players.upsert({
                    where: { steamid64: BigInt(sid) },
                    update: { personaname: name, avatar_url: avatar, last_updated: new Date() },
                    create: { steamid64: BigInt(sid), personaname: name, avatar_url: avatar }
                }).catch(() => {});

                // 2. Atualizar Player (usado no ranking)
                await (prisma.player as any).updateMany({
                    where: { steamId: sid },
                    data: { steamName: name, steamAvatar: avatar, updatedAt: new Date() }
                }).catch(() => {});

                // 3. Atualizar User (se for usuário registrado)
                await prisma.user.updateMany({
                    where: { steamId: sid },
                    data: { name: name, image: avatar }
                }).catch(() => {});
            }));

            // Criar mapa para retorno rápido
            const avatarMap = new Map();
            steamProfiles.forEach((profile: any) => {
                avatarMap.set(profile.steamid, {
                    avatar: profile.avatarfull,
                    name: profile.personaname
                });
            });

            return stats.map((p: any) => {
                const sid = p.steam64_id || p.player_id || p.steamId;
                const steamData = avatarMap.get(sid);
                
                return {
                    ...p,
                    avatar_url: steamData?.avatar || p.avatar_url,
                    nickname: steamData?.name || p.name
                };
            });
        } catch (steamError) {
            console.error("Error fetching and persisting Steam avatars:", steamError);
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
        // 1. Verificar no nosso próprio Banco de Dados
        // Tentamos GlobalMatch (Partidas locais)
        let localMatch = await prisma.globalMatch.findUnique({
            where: { id: matchId },
            include: { GlobalMatchPlayer: true }
        });

        // Caso não encontre pelo ID completo (que pode conter sufixo de SteamID vindo do analisador)
        // Tentamos buscar pelo ID base (o hash da demo)
        if (!localMatch && matchId.startsWith('demo_')) {
            const parts = matchId.split('_');
            if (parts.length >= 3) {
                // Formato: demo_HASH_STEAMID -> tentamos demo_HASH
                const baseId = `${parts[0]}_${parts[1]}`;
                localMatch = await prisma.globalMatch.findUnique({
                    where: { id: baseId },
                    include: { GlobalMatchPlayer: true }
                });
            }
        }

        // Se não encontramos no GlobalMatch, tentamos na tabela Match (Legado/Leetify Sync)
        let legacyMatch = null;
        if (!localMatch) {
            // Buscamos por ID (Cuid) ou por externalId (leetify-UUID)
            legacyMatch = await prisma.match.findFirst({
                where: {
                    OR: [
                        { id: matchId },
                        { externalId: matchId },
                        { externalId: `leetify-${matchId}` },
                        { externalId: `faceit-${matchId}` }
                    ]
                }
            });
        }

        // Se encontramos o match, garantimos que usaremos o ID real dele para buscar estatísticas
        let effectiveMatchId = localMatch?.id || legacyMatch?.id || matchId;

        // --- FILTRO DE SEGURANÇA PARA MATCH ID GENÉRICO ---
        // Evita que nomes como "SourceTV Demo" ou "Counter-Strike 2" apareçam como ID no modal
        const isGenericId = (id: string) => {
            const clean = (id || '').trim();
            return !clean || 
                   ['SourceTV Demo', 'Counter-Strike 2', 'Source', 'mock_share_code'].includes(clean) ||
                   clean.toUpperCase().includes('VALVE');
        };

        if (isGenericId(effectiveMatchId) && !isGenericId(matchId)) {
            effectiveMatchId = matchId;
        }


        if (localMatch && localMatch.GlobalMatchPlayer && localMatch.GlobalMatchPlayer.length > 0) {
            const localMeta = (localMatch.metadata as any) || {};

            // Team number convention:
            // Team A (scoreA) → numeric team "3" → team_3_score  (Leetify convention)
            // Team B (scoreB) → numeric team "2" → team_2_score
            // The frontend's computeScore() looks for team_{initial_team_number}_score in metadata.

            // Find the profile owner's player record to compute result from their perspective
            const profilePlayer = profileSteamId
                ? localMatch.GlobalMatchPlayer.find(p => String(p.steamId) === String(profileSteamId))
                : null;
            const profileTeam = profilePlayer?.team ?? null;
            const profileIsTeamA = isTeamA(profileTeam);
            const scoreA = localMatch.scoreA ?? 0;
            const scoreB = localMatch.scoreB ?? 0;
            // Trust the matchResult stored in the database (populated during sync/upload)
            const profileResult = profilePlayer?.matchResult || null;
            // Buscar estatísticas detalhadas da tabela de tracker se existirem
            const trackerPlayers = await prisma.tracker_match_players.findMany({
                where: { match_id: effectiveMatchId }
            }).catch(() => []);

            const trackerMap = new Map();
            trackerPlayers.forEach(tp => {
                // Sanitize BigInt for JSON serialization
                const sanitized = {
                    ...tp,
                    steamid64: String(tp.steamid64)
                };
                trackerMap.set(String(tp.steamid64), sanitized);
            });

            let localStats = localMatch.GlobalMatchPlayer.map(p => {
                const m = (p.metadata as any) || {};
                const tp = trackerMap.get(String(p.steamId));

                // Priorizar dados do tracker_match_players se disponíveis
                const kills = tp?.kills ?? p.kills;
                const deaths = tp?.deaths ?? p.deaths;
                const assists = tp?.assists ?? p.assists;
                const adr = tp?.adr ?? p.adr;
                
                const fkVal = tp?.fk ?? (p as any).fk ?? m.fk ?? m.fk_count ?? m.first_kill_count ?? m.firstKills ?? 0;
                const fdVal = tp?.fd ?? (p as any).fd ?? m.fd ?? m.fd_count ?? m.first_death_count ?? m.firstDeaths ?? 0;
                
                const numericTeam = isTeamA(p.team) ? '3' : '2';
                
                return {
                    team_id: p.team,
                    initial_team_number: numericTeam,
                    steam64_id: p.steamId,
                    name: m.name ?? m.nickname ?? m.playerNickname ?? p.steamId,
                    total_kills: kills,
                    total_deaths: deaths,
                    total_assists: assists,
                    dpr: adr, 
                    accuracy_head: p.hsPercentage ? (p.hsPercentage / 100) : 0, 
                    rating: tp?.rating ?? m.rating ?? m.leetify_rating ?? 0,
                    impact: tp?.impact ?? m.impact_rating ?? tp?.impact_rating ?? m.impact ?? m.impactRating ?? localMeta.leetify_ratings?.[p.steamId]?.impact_rating ?? 0,
                    kast: (() => {
                        const val = tp?.kast ?? m.kast ?? m.kast_percent ?? 0;
                        return (val > 0 && val <= 1) ? (val * 100) : val;
                    })(),
                    fk: fkVal,
                    fd: fdVal,
                    fkd: fkVal,
                    fk_deaths: fdVal,
                    // Multikills
                    triple_kills: tp?.triples ?? m.triples ?? m.multi3k ?? 0,
                    quad_kills: tp?.quads ?? m.quads ?? m.multi4k ?? 0,
                    penta_kills: tp?.aces ?? m.aces ?? m.multi5k ?? 0,
                    // Utility
                    utility_damage: tp?.utility_damage ?? m.utilDmg ?? m.utility_damage ?? 0,
                    blind_time: tp?.total_blind_duration ?? m.blindTime ?? m.flashbang_hit_foe_avg_duration ?? 0,
                    he_thrown: tp?.he_thrown ?? m.heThrown ?? 0,
                    flash_thrown: tp?.flash_thrown ?? m.flashThrown ?? 0,
                    smokes_thrown: tp?.smokes_thrown ?? m.smokesThrown ?? 0,
                    molotovs_thrown: tp?.molotovs_thrown ?? m.molotovThrown ?? 0,
                    enemies_flashed: tp?.enemies_flashed ?? m.enemiesFlashed ?? 0,
                    // Advanced
                    avg_ttd: tp?.avg_ttd ?? m.avgTtd ?? 0,
                    avg_kill_distance: tp?.avg_kill_distance ?? m.avgKillDist ?? 0,
                    trades: tp?.trades ?? m.trades ?? 0,
                    clutches: tp?.clutches ?? m.clutches ?? 0,
                    flash_assists: tp?.flash_assists ?? m.flashAssists ?? 0,
                    is_user: !!(profileSteamId && p.steamId && String(p.steamId) === String(profileSteamId)),
                    mvps: p.mvps ?? 0,
                    total_damage: (adr && (localMatch.scoreA! + localMatch.scoreB!)) ? Math.round(adr * (localMatch.scoreA! + localMatch.scoreB!)) : p.score,
                    metadata: { ...m, ...tp }
                };
            });

            // Tentar puxar avatares e nomes do Steam
            localStats = await fetchAvatars(localStats);

            // Após fetchAvatars, garantir que name usa o nickname do Steam (não o steamId)
            localStats = localStats.map(p => ({
                ...p,
                name: p.nickname || p.name || p.steam64_id,
                avatar_url: p.avatar_url || undefined
            }));

            // Fetch detailed stats from tracker tables (using raw query since they are not in Prisma)
            const trackerWeaponStatsRaw = await prisma.$queryRaw`
                SELECT * FROM public.tracker_weapon_stats WHERE match_id = ${effectiveMatchId}
            `.catch(() => []) as any[];

            const trackerClutchEvents = await prisma.$queryRaw`
                SELECT * FROM public.tracker_clutch_events WHERE match_id = ${effectiveMatchId}
            `.catch(() => []) as any[];

            const trackerGrenadeEvents = await prisma.$queryRaw`
                SELECT ge.*, r.round_number 
                FROM public.tracker_grenade_events ge
                JOIN public.tracker_rounds r ON ge.round_id = r.round_id
                WHERE ge.match_id = ${effectiveMatchId}
                ORDER BY r.round_id, ge.tick
            `.catch(() => []) as any[];

            const trackerRounds = await prisma.$queryRaw`
                SELECT * FROM public.tracker_rounds WHERE match_id = ${effectiveMatchId} ORDER BY round_id
            `.catch(() => []) as any[];

            // Detect Knife Round (round_number = 0 OR duplicate round_number = 1)
            let hasKnifeRound = trackerRounds.some(r => r.round_number === 0) || trackerRounds.filter(r => r.round_number === 1).length > 1;

            if (hasKnifeRound) {
                let foundKnife = false;
                let actualRound = 1;
                trackerRounds.forEach((r, idx) => {
                    if (r.round_number === 0) {
                        r.actual_round_number = 0;
                        foundKnife = true;
                    } else if (r.round_number === 1 && !foundKnife) {
                        // First round 1 in a match with duplicates is likely the knife round
                        r.actual_round_number = 0;
                        foundKnife = true;
                    } else if (r.round_number === 1 && foundKnife) {
                        // Subsequent round 1 is the pistol round
                        r.actual_round_number = 1;
                        actualRound = 2;
                    } else {
                        r.actual_round_number = actualRound++;
                    }
                });
            } else {
                trackerRounds.forEach(r => { r.actual_round_number = r.round_number; });
            }

            const actualRoundMap = new Map();
            trackerRounds.forEach(r => {
                actualRoundMap.set(r.round_id, r.actual_round_number);
            });

            const trackerKillEvents = await prisma.$queryRaw`
                SELECT ke.*, r.round_number, r.round_id 
                FROM public.tracker_kill_events ke
                JOIN public.tracker_rounds r ON ke.round_id = r.round_id
                WHERE ke.match_id = ${effectiveMatchId}
                ORDER BY r.round_id, ke.tick
            `.catch(() => []) as any[];

            const trackerDamageEvents = await prisma.$queryRaw`
                SELECT de.*, r.round_number, r.round_id 
                FROM public.tracker_damage_events de
                JOIN public.tracker_rounds r ON de.round_id = r.round_id
                WHERE de.match_id = ${effectiveMatchId}
                ORDER BY r.round_id, de.tick
            `.catch(() => []) as any[];

            // Group utility by round for timeline
            const utilityTimeline: Record<number, any[]> = {};
            trackerGrenadeEvents.forEach(ge => {
                const rNum = actualRoundMap.get(ge.round_id) ?? ge.round_number;
                if (!utilityTimeline[rNum]) utilityTimeline[rNum] = [];
                utilityTimeline[rNum].push({
                    type: ge.grenade_type,
                    steamId: String(ge.steamid64),
                    tick: ge.tick,
                    blind_duration: ge.blind_duration
                });
            });

            // Group economy by round
            const economyTimeline: Record<number, any> = {};
            trackerRounds.forEach(r => {
                economyTimeline[r.actual_round_number] = {
                    ct_equipment_value: r.ct_equipment_value,
                    t_equipment_value: r.t_equipment_value,
                    ct_buy_type: r.ct_buy_type,
                    t_buy_type: r.t_buy_type,
                    winner: r.winner_side,
                };
            });

            // Group kills by round
            const killTimeline: Record<number, any[]> = {};
            trackerKillEvents.forEach(ke => {
                const rNum = actualRoundMap.get(ke.round_id) ?? ke.round_number;
                if (!killTimeline[rNum]) killTimeline[rNum] = [];
                
                // Try to find damage for this kill (simplification: damage to victim in same round)
                const victimDmg = trackerDamageEvents
                    .filter(de => de.round_id === ke.round_id && de.victim_steamid === ke.victim_steamid && de.attacker_steamid === ke.attacker_steamid)
                    .reduce((sum, de) => sum + (de.hp_damage || 0), 0);

                killTimeline[rNum].push({
                    attackerSteamId: String(ke.attacker_steamid),
                    victimSteamId: String(ke.victim_steamid),
                    weapon: ke.weapon,
                    isHeadshot: ke.is_headshot,
                    tick: ke.tick,
                    attackerHp: ke.attacker_hp,
                    victimHp: ke.victim_hp,
                    damage: victimDmg > 100 ? 100 : (victimDmg || 100) // Cap at 100
                });
            });

            // Use the already fetched trackerPlayers instead of querying again
            const trackerMatchPlayers = trackerPlayers.map(tp => ({
                ...tp,
                steamid64: String(tp.steamid64)
            }));

            // Normalize weapon stats to match frontend expectations (weapon_name, player_id)
            const trackerWeaponStats = trackerWeaponStatsRaw.map(ws => ({
                ...ws,
                weapon_name: ws.weapon,
                player_id: String(ws.steamid64),
                steamid64: String(ws.steamid64) // Sanitize BigInt
            }));

            const sanitizedClutches = trackerClutchEvents.map(c => ({
                ...c,
                steamid64: String(c.steamid64) // Sanitize BigInt
            }));

            // Calculate pseudo avg_ttd
            const roundStartTicks: Record<number, number> = {};
            const roundMaxTicks: Record<number, number> = {};
            
            [...trackerKillEvents, ...trackerDamageEvents, ...trackerGrenadeEvents].forEach(e => {
                if (!roundStartTicks[e.round_number] || e.tick < roundStartTicks[e.round_number]) roundStartTicks[e.round_number] = e.tick;
                if (!roundMaxTicks[e.round_number] || e.tick > roundMaxTicks[e.round_number]) roundMaxTicks[e.round_number] = e.tick;
            });

            const playerTTDs: Record<string, number[]> = {};
            const allRoundNumbers = Object.keys(roundStartTicks).map(Number);
            
            trackerKillEvents.forEach(ke => {
                const victim = String(ke.victim_steamid);
                if (!playerTTDs[victim]) playerTTDs[victim] = [];
                const startTick = roundStartTicks[ke.round_number] || ke.tick;
                const ttdSeconds = (ke.tick - startTick) / 64;
                playerTTDs[victim].push(ttdSeconds);
            });

            localStats.forEach(p => {
                const sid = String(p.steam64_id);
                if (!playerTTDs[sid]) playerTTDs[sid] = [];
                
                const deathRounds = new Set(trackerKillEvents.filter(ke => String(ke.victim_steamid) === sid).map(ke => ke.round_number));
                
                allRoundNumbers.forEach(r => {
                    if (!deathRounds.has(r)) {
                        const start = roundStartTicks[r];
                        const end = roundMaxTicks[r];
                        let survivedTime = (end - start) / 64;
                        if (survivedTime < 30) survivedTime = 85; 
                        playerTTDs[sid].push(survivedTime);
                    }
                });
            });

            const calculatedAvgTTD: Record<string, number> = {};
            for (const [sid, ttds] of Object.entries(playerTTDs)) {
                if (ttds.length > 0) {
                    calculatedAvgTTD[sid] = ttds.reduce((a, b) => a + b, 0) / ttds.length;
                } else {
                    calculatedAvgTTD[sid] = 85;
                }
            }

            // Calculate HE Damage from events
            const heDamageMap: Record<string, number> = {};
            trackerDamageEvents.forEach(de => {
                const weapon = (de.weapon || '').toLowerCase();
                if (weapon.includes('hegrenade') || weapon.includes('grenade')) {
                    const sid = String(de.attacker_steamid);
                    heDamageMap[sid] = (heDamageMap[sid] || 0) + (de.hp_damage || 0);
                }
            });

            // Merge advanced stats from tracker into localStats
            localStats = localStats.map(p => {
                const sid = String(p.steam64_id);
                const tp = trackerMatchPlayers.find(x => String(x.steamid64) === sid);
                const estimatedTtd = calculatedAvgTTD[sid] || 80;
                const calculatedHeDmg = heDamageMap[sid] || 0;

                if (tp) {
                    return {
                        ...p,
                        avg_ttd: tp.avg_ttd || estimatedTtd,
                        avg_kill_distance: tp.avg_kill_distance,
                        impact: tp.impact || tp.impact_rating || p.impact,
                        enemies_flashed: tp.enemies_flashed,
                        blind_time: tp.total_blind_duration,
                        he_thrown: tp.he_thrown,
                        flash_thrown: tp.flash_thrown,
                        smokes_thrown: tp.smokes_thrown,
                        molotovs_thrown: tp.molotovs_thrown,
                        he_damage: calculatedHeDmg || tp.he_damage || 0,
                        eloChange: tp.elo_change,
                        eloAfter: tp.elo_after
                    };
                }
                return { ...p, avg_ttd: estimatedTtd, he_damage: calculatedHeDmg };
            });

            // Inferir nome do mapa a partir da URL da demo se estiver como "Desconhecido"
            let resolvedMapName = localMatch.mapName || 'Desconhecido';
            if (resolvedMapName === 'Desconhecido' && localMeta.demoUrl) {
                try {
                    // Demo URL é um JWT: .../file?token=HEADER.PAYLOAD.SIGNATURE
                    const tokenMatch = String(localMeta.demoUrl).match(/token=([^&]+)/);
                    if (tokenMatch && tokenMatch[1]) {
                        const parts = tokenMatch[1].split('.');
                        if (parts.length >= 2) {
                            const payloadBase64 = parts[1];
                            if (payloadBase64) {
                                // Fix base64url encoding padding
                                let b64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
                                while (b64.length % 4) b64 += '=';
                                
                                try {
                                    // Use Buffer in Node.js for safer base64 decoding
                                    const payload = Buffer.from(b64, 'base64').toString('utf8');
                                    const mapMatch = payload.match(/_(de_[a-zA-Z0-9]+|cs_[a-zA-Z0-9]+)_/i);
                                    if (mapMatch) resolvedMapName = mapMatch[1];
                                } catch (decodeErr) {
                                    // Silent fail for decoding
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('Erro ao decodificar mapa do JWT', e);
                }
            }

            // Inferir resultado a partir do placar se profileResult for null
            let resolvedResult = profileResult;
            if (!resolvedResult && profilePlayer) {
                const scoreA = localMatch.scoreA ?? 0;
                const scoreB = localMatch.scoreB ?? 0;
                const profileIsA = !['B','T','2'].includes(String(profilePlayer.team || '').toUpperCase());
                const myScore = profileIsA ? scoreA : scoreB;
                const theirScore = profileIsA ? scoreB : scoreA;
                resolvedResult = myScore > theirScore ? 'win' : myScore < theirScore ? 'loss' : 'tie';
            }

            // Priorizar duração real do banco, fallback para meta ou estimativa por rounds
            const totalRounds = (localMatch.scoreA ?? 0) + (localMatch.scoreB ?? 0);
            const estimatedDuration = localMatch.duration || localMeta.duration || 
                (totalRounds > 0 ? `${Math.floor(totalRounds * 1.75)}:00` : null);

            let winning_team = 'tie';
            if ((localMatch.scoreA ?? 0) > (localMatch.scoreB ?? 0)) winning_team = 'team_3';
            else if ((localMatch.scoreB ?? 0) > (localMatch.scoreA ?? 0)) winning_team = 'team_2';

            const damageTimeline: Record<number, Record<string, number>> = {};
            const detailedDamageTimeline: Record<number, Record<string, Record<string, number>>> = {};
            
            trackerDamageEvents.forEach(de => {
                const rNum = actualRoundMap.get(de.round_id) ?? de.round_number;
                if (!damageTimeline[rNum]) damageTimeline[rNum] = {};
                if (!detailedDamageTimeline[rNum]) detailedDamageTimeline[rNum] = {};
                
                const attacker = String(de.attacker_steamid);
                const victim = String(de.victim_steamid);
                const hpDmg = de.hp_damage || 0;

                // Simple sum per attacker
                damageTimeline[rNum][attacker] = (damageTimeline[rNum][attacker] || 0) + hpDmg;
                
                // Detailed victim -> attacker sum
                if (!detailedDamageTimeline[rNum][victim]) detailedDamageTimeline[rNum][victim] = {};
                detailedDamageTimeline[rNum][victim][attacker] = (detailedDamageTimeline[rNum][victim][attacker] || 0) + hpDmg;
            });

            const data = {
                match_id: localMatch.id,
                map_name: resolvedMapName,
                game_mode: localMatch.source,
                data_source: localMatch.source,
                match_date: localMatch.matchDate.toISOString(),
                duration: estimatedDuration,
                team_2_code: 'team_2',
                team_3_code: 'team_3',
                team_2_score: localMatch.scoreB ?? 0,
                team_3_score: localMatch.scoreA ?? 0,
                winning_team: winning_team,
                result: resolvedResult,
                demo_url: localMeta.demoUrl || null,
                weapon_stats: trackerWeaponStats,
                clutch_events: sanitizedClutches,
                utility_timeline: utilityTimeline,
                economy_timeline: economyTimeline,
                kill_timeline: killTimeline,
                damage_timeline: damageTimeline,
                detailed_damage_timeline: detailedDamageTimeline,
                metadata: {
                    ...localMeta,
                    team_2_score: localMatch.scoreB ?? 0,
                    team_3_score: localMatch.scoreA ?? 0,
                    weapon_stats: trackerWeaponStats,
                    clutch_events: sanitizedClutches,
                    utility_timeline: utilityTimeline,
                    economy_timeline: economyTimeline,
                    kill_timeline: killTimeline,
                    damage_timeline: damageTimeline,
                    detailed_damage_timeline: detailedDamageTimeline,
                },
                stats: localStats
            };

            // ── CÁLCULO AUTOMÁTICO DE TROPOINTS ─────────────────────────────
            // Se for MIX e não tiver eloChange em algum jogador, calculamos agora
            const needsTropoints = (localMatch.source || '').toLowerCase() === 'mix' && 
                                  localMatch.GlobalMatchPlayer.some(p => p.eloChange === null || p.eloChange === 0);
            
            if (needsTropoints) {
                try {
                    const { calculateMatchTropoints } = await import('@/services/ranking-service');
                    await calculateMatchTropoints(localMatch.id);
                    console.log(`[AutoTropoints] Calculado automaticamente para ${localMatch.id}`);
                } catch (err: any) {
                    console.warn(`[AutoTropoints] Falha no cálculo automático: ${err.message}`);
                }
            }

            return NextResponse.json(data);
        }

        // 2. Se não encontrou no GlobalMatch, tentamos no Tracker API (Python)
        // Isso é essencial para o 2D Viewer de partidas locais que ainda não foram migradas
        const TRACKER_API = process.env.PYTHON_API_URL || 'https://tropacsdemos.discloud.app';
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
                    impact: p.impact || p.impact_rating || 0,
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
                    total_damage: p.total_damage || (p.adr && p.rounds_count ? Math.round(p.adr * p.rounds_count) : 0),
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
                        ct_equipment_value: r.ct_equipment_value,
                        t_equipment_value: r.t_equipment_value,
                        ct_buy_type: r.ct_buy_type,
                        t_buy_type: r.t_buy_type,
                        kills: kills
                            .filter((k: any) => k.round_id === r.round_id)
                            .map((k: any) => ({
                                tick: k.tick,
                                attackerSteamId: String(k.attacker_steamid),
                                victimSteamId: String(k.victim_steamid),
                                attackerName: nameMap.get(String(k.attacker_steamid)) || String(k.attacker_steamid),
                                victimName: nameMap.get(String(k.victim_steamid)) || String(k.victim_steamid),
                                weapon: k.weapon,
                                victimWeapon: k.victim_weapon,
                                isHeadshot: k.is_headshot,
                                attackerHp: k.attacker_hp,
                                victimHp: k.victim_hp
                            }))
                    };
                });

                let winning_team = 'tie';
                if ((matchInfo.score_t ?? 0) > (matchInfo.score_ct ?? 0)) winning_team = 'team_3';
                else if ((matchInfo.score_ct ?? 0) > (matchInfo.score_t ?? 0)) winning_team = 'team_2';

                const data = {
                    match_id: matchInfo.match_id,
                    map_name: matchInfo.map_name,
                    game_mode: matchInfo.source,
                    data_source: matchInfo.source,
                    match_date: matchInfo.match_date,
                    team_2_code: 'team_2',
                    team_3_code: 'team_3',
                    team_2_score: matchInfo.score_ct,
                    team_3_score: matchInfo.score_t,
                    winning_team: winning_team,
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
        if (matchId.startsWith('manual_')) {
            return NextResponse.json({ 
                status: 'processing', 
                is_processing: true,
                match_id: matchId,
                message: "Aguardando conclusão do processamento manual..."
            });
        }

        if (!LEETIFY_API_KEY) {
            return NextResponse.json({ error: "Match not found locally and LEETIFY_API_KEY is missing." }, { status: 404 });
        }

        // Determinar o ID correto para o Leetify (UUID)
        let leetifyMatchId = matchId;
        const extId = (localMatch as any)?.externalId || legacyMatch?.externalId;
        if (extId?.startsWith('leetify-')) {
            leetifyMatchId = extId.replace('leetify-', '');
        } else if (matchId.startsWith('leetify-')) {
            leetifyMatchId = matchId.replace('leetify-', '');
        }

        try {
            console.log(`[LeetifyFetch] Buscando partida ${leetifyMatchId} no Leetify...`);
            const matchResponse = await axios.get(`${LEETIFY_BASE_URL}/v2/matches/${leetifyMatchId}`, {
                headers: {
                    '_leetify_key': LEETIFY_API_KEY
                },
                timeout: 5000 // 5 seconds timeout
            });

            let data = matchResponse.data;
                
        // Se temos um demo_url no Leetify mas não temos a partida processada localmente,
        // acionamos o nosso novo sistema de processamento (TROPACS-DEMOS)
        const demoUrl = data.demo_url || data.demoUrl;
        if (demoUrl) {
            const pythonUrl = process.env.PYTHON_API_URL || 'https://tropacsdemos.discloud.app';
            console.log(`[AutoProcess] Acionando TROPACS-DEMOS para a partida ${matchId}`);
            
            // Disparar o processamento em fila (assíncrono)
            axios.post(`${pythonUrl}/api/importer/import-match`, {
                steamid: profileSteamId || "0",
                auth_code: "auto-sync",
                share_code: demoUrl
            }).catch(err => console.warn(`[AutoProcess] Falha ao acionar processador para ${matchId}:`, err.message));
            
            // Marcar como processando para o frontend
            data.status = 'processing';
            data.is_processing = true;
        }

        // Normalizar dados do Leetify para o formato esperado pelo frontend
        if (data.stats && Array.isArray(data.stats)) {
            data.stats = data.stats.map((p: any) => {
                return {
                    ...p,
                    // Campos de alias para normalizeP no frontend
                    // Rating: leetify v2 usa leetify_rating
                    rating: p.leetify_rating ?? p.rating ?? 0,
                    impact: p.impact_rating ?? p.impact ?? 0,
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
                             ((p.clutch_v1_wins ?? 0) + (p.clutch_v2_wins ?? 0) + (p.clutch_v3_wins ?? 0) + (p.clutch_v4_wins ?? 0) + (p.clutch_v5_wins ?? 0)),
                    clutches_won: p.clutch_count ?? p.clutches_won ?? p.clutchesWon ?? p.clutches ?? 
                                 ((p.clutch_v1_wins ?? 0) + (p.clutch_v2_wins ?? 0) + (p.clutch_v3_wins ?? 0) + (p.clutch_v4_wins ?? 0) + (p.clutch_v5_wins ?? 0)),
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
                    is_user: !!(profileSteamId && (p.steam64_id || p.player_id || p.steamId) && String(p.steam64_id || p.player_id || p.steamId) === String(profileSteamId)),
                    total_damage: p.total_damage ?? p.totalDamage ?? ( (p.dpr ?? p.adr ?? 0) * (p.rounds_count ?? 0) )
                };
            });
            data.demo_url = data.demo_url || data.demoUrl || null;
            data.sharing_code = data.sharingCode || data.matchSharingCode || null;
            data.stats = await fetchAvatars(data.stats);
        }

        if (data.team_3_score !== undefined && data.team_2_score !== undefined) {
            data.team_3_code = 'team_3';
            data.team_2_code = 'team_2';
            if (data.team_3_score > data.team_2_score) data.winning_team = 'team_3';
            else if (data.team_2_score > data.team_3_score) data.winning_team = 'team_2';
            else data.winning_team = 'tie';
        }

            return NextResponse.json(data);
        } catch (leetifyError: any) {
            console.warn(`[LeetifyFetch] Partida ${leetifyMatchId} falhou no Leetify: ${leetifyError.message}`);
            if (leetifyError.response?.status === 404) {
                 return NextResponse.json({ error: "Partida não encontrada no Leetify." }, { status: 404 });
            }
            // Se for outro erro (como 500), retornamos um erro amigável em vez de crashar
            return NextResponse.json({ 
                error: "Erro ao buscar dados no Leetify", 
                message: leetifyError.message,
                status: leetifyError.response?.status 
            }, { status: leetifyError.response?.status || 500 });
        }
    } catch (error: any) {
        if (error.response?.status === 404) {
            return NextResponse.json({ error: "Partida não encontrada no Banco nem no Leetify." }, { status: 404 });
        }
        console.error(`Error fetching match ${matchId}:`, error);
        return NextResponse.json({ error: "Failed to fetch match details", message: error.message, stack: error.stack }, { status: 500 });
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
                        // Convenção: Team A = team_3_score, Team B = team_2_score (igual ao GET)
                        team_3_score: Number(scoreA),
                        team_2_score: Number(scoreB)
                    }
                }
            });

            let resA = "tie", resB = "tie";
            if (scoreA > scoreB) { resA = "win"; resB = "loss"; }
            else if (scoreB > scoreA) { resA = "loss"; resB = "win"; }

            // Update result for all players based on their team side
            // We use a more robust check: if they are Team A, they get resA, otherwise they get resB
            const allPlayers = await prisma.globalMatchPlayer.findMany({
                where: { globalMatchId: matchId }
            });

            for (const p of allPlayers) {
                const isPlayerA = isTeamA(p.team);
                await prisma.globalMatchPlayer.update({
                    where: { id: p.id },
                    data: { matchResult: isPlayerA ? resA : resB }
                });
            }

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
