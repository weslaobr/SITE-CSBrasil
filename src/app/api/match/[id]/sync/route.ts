import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY;
const LEETIFY_BASE_URL = 'https://api-public.cs-prod.leetify.com';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params;

    try {
        if (!LEETIFY_API_KEY) {
            return NextResponse.json({ error: "LEETIFY_API_KEY is missing." }, { status: 500 });
        }

        // 1. Fetch match from Leetify
        const matchResponse = await axios.get(`${LEETIFY_BASE_URL}/v2/matches/${matchId}`, {
            headers: {
                '_leetify_key': LEETIFY_API_KEY
            }
        });

        const data = matchResponse.data;

        if (!data || !data.stats || !Array.isArray(data.stats)) {
            return NextResponse.json({ error: "Invalid data format from Leetify." }, { status: 400 });
        }

        const mapName = data.mapName || data.map_name || "de_mirage";
        const gameMode = data.gameMode || data.game_mode || "matchmaking";
        const source = data.dataSource || data.data_source || "leetify";
        const scoreA = data.team1Score ?? data.team_2_score ?? 0;
        const scoreB = data.team2Score ?? data.team_3_score ?? 0;
        const matchDate = data.matchDate || data.match_date ? new Date(data.matchDate || data.match_date) : new Date();
        const demoUrl = data.demoUrl || data.demo_url || "";

        // 2. Ensure GlobalMatch exists or update it
        await prisma.globalMatch.upsert({
            where: { id: matchId },
            update: {
                mapName,
                scoreA,
                scoreB,
                metadata: { demoUrl }
            },
            create: {
                id: matchId,
                source,
                mapName,
                matchDate: new Date(matchDate),
                scoreA,
                scoreB,
                metadata: { demoUrl }
            }
        });

        // 3. Update each player in the match
        const ops = data.stats.map((p: any) => {
            const steamId = p.steam64Id || p.steam64_id || p.steamId || p.player_id;
            if (!steamId) return null;

            const kills = p.kills ?? p.total_kills ?? 0;
            const deaths = p.deaths ?? p.total_deaths ?? 0;
            const assists = p.assists ?? p.total_assists ?? 0;
            const adr = p.adr ?? p.dpr ?? p.average_damage_per_round ?? parseFloat(p.player_stats?.ADR ?? '0') ?? 0;
            const hsRaw = p.accuracy_head !== undefined ? Math.round(p.accuracy_head * 100) : (p.hs_percent ?? p.hs_percentage ?? 0);
            
            // Result formatting
            const myTeam = p.teamId || p.initial_team_number;
            let matchResult = "tie";
            if (myTeam) {
                // If team is 2 (or 1), we compare scoreA and scoreB. Usually team_2 is A, team_3 is B.
                matchResult = (myTeam === 2 && scoreA > scoreB) || (myTeam === 3 && scoreB > scoreA) ? "win" :
                              (myTeam === 2 && scoreB > scoreA) || (myTeam === 3 && scoreA > scoreB) ? "loss" : "tie";
            } else {
                matchResult = p.match_result || p.matchResult || "unknown";
            }

            const metadataObj = {
                playerNickname: p.name || p.nickname || steamId,
                // Rating: leetify v2 retorna 'leetify_rating'
                rating: p.leetify_rating ?? p.rating ?? p.leetifyRating ?? 0,
                // KAST: não disponível diretamente na v2, estimamos com rounds_survived_percentage
                kast: p.kast !== undefined ? (p.kast > 1 ? p.kast : Math.round(p.kast * 100)) : (p.kast_percent || 0),
                // First kills/deaths: não disponível na v2
                fk: p.fk_count ?? p.first_kill_count ?? p.firstKills ?? 0,
                fd: p.fd_count ?? p.first_death_count ?? p.firstDeaths ?? 0,
                // Multikills: campo real da v2 é multi3k/multi4k/multi5k
                triples: p.multi3k ?? p.triple_kills ?? p.tripleKills ?? 0,
                quads: p.multi4k ?? p.quad_kills ?? p.quadKills ?? 0,
                aces: p.multi5k ?? p.penta_kills ?? p.ace_kills ?? p.pentaKills ?? 0,
                // Clutches: não disponível na v2
                clutches: p.clutch_count ?? p.clutches_won ?? p.clutchesWon ?? 0,
                // Trades: campo real da v2 é trade_kills_succeed
                trades: p.trade_kills_succeed ?? p.trade_count ?? p.tradeKills ?? p.trades ?? 0,
                // Utility damage: v2 usa he_foes_damage_avg * rounds_count como proxy, ou dpr (ADR total)
                utilDmg: p.utility_damage ?? p.util_damage ?? p.utilityDamage ?? 0,
                // Flash assists: campo real da v2 é flash_assist
                flashAssists: p.flash_assist ?? p.flash_assists ?? p.flash_assist_count ?? 0,
                // Blind time: campo real da v2 é flashbang_hit_foe_avg_duration (segundos por cego causado)
                blindTime: p.flashbang_hit_foe_avg_duration ?? p.blind_time ?? p.enemiesFlashedDuration ?? 0,
                // Grenade counts: campos reais da v2
                heThrown: p.he_thrown ?? p.heThrown ?? 0,
                flashThrown: p.flashbang_thrown ?? p.flash_thrown ?? p.flashThrown ?? 0,
                smokesThrown: p.smoke_thrown ?? p.smokes_thrown ?? p.smokesThrown ?? 0,
                molotovThrown: p.molotov_thrown ?? p.molotovs_thrown ?? p.molotovThrown ?? 0,
            };


            return prisma.globalMatchPlayer.upsert({
                where: {
                    globalMatchId_steamId: {
                        globalMatchId: matchId,
                        steamId: steamId
                    }
                },
                update: {
                    kills,
                    deaths,
                    assists,
                    adr,
                    hsPercentage: hsRaw,
                    metadata: metadataObj
                },
                create: {
                    globalMatchId: matchId,
                    steamId: steamId,
                    team: myTeam === 2 ? "CT" : myTeam === 3 ? "T" : (p.team || "?"),
                    kills,
                    deaths,
                    assists,
                    score: 0,
                    mvps: 0,
                    adr,
                    hsPercentage: hsRaw,
                    matchResult,
                    metadata: metadataObj
                }
            });
        }).filter(Boolean);

        await prisma.$transaction(ops as any[]);

        return NextResponse.json({ success: true, message: "Match synced successfully!" });
    } catch (error: any) {
        console.error(`Error syncing match ${matchId}:`, error.message);
        return NextResponse.json({ error: "Failed to sync match from Leetify" }, { status: 500 });
    }
}
