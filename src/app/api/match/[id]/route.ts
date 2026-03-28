import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';

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
                return {
                    steam64_id: p.steamId,
                    name: m.playerNickname || p.steamId,
                    total_kills: p.kills,
                    total_deaths: p.deaths,
                    total_assists: p.assists,
                    dpr: p.adr, // alias adr
                    accuracy_head: p.hsPercentage ? (p.hsPercentage / 100) : 0, 
                    fkd: m.fk || 0,
                    fk_deaths: m.fd || 0,
                    triple_kills: m.triples || 0,
                    quad_kills: m.quads || 0,
                    penta_kills: m.aces || 0,
                    utility_damage: m.utilDmg || 0,
                    blind_time: m.blindTime || 0,
                    he_thrown: m.heThrown || 0,
                    flash_thrown: m.flashThrown || 0,
                    smokes_thrown: m.smokesThrown || 0,
                    molotovs_thrown: m.molotovThrown || 0,
                    trades: m.trades || 0,
                    clutches: m.clutches || 0,
                    flash_assists: m.flashAssists || 0,
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
                team_2_score: localMatch.scoreA || 0,
                team_3_score: localMatch.scoreB || 0,
                demo_url: localMeta.demoUrl || null,
                stats: localStats
            };

            return NextResponse.json(data);
        }

        // 2. Se não encontrou localmente, tentamos no Leetify API (Fallback)
        if (!LEETIFY_API_KEY) {
            return NextResponse.json({ error: "Match not found locally and LEETIFY_API_KEY is missing." }, { status: 404 });
        }

        const matchResponse = await axios.get(`${LEETIFY_BASE_URL}/v2/matches/${matchId}`, {
            headers: {
                '_leetify_key': LEETIFY_API_KEY
            }
        });

        let data = matchResponse.data;
        if (data.stats && Array.isArray(data.stats)) {
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
