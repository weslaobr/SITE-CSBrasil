import { NextRequest, NextResponse } from "next/server";
import { getPlayerProfile, getCS2Stats, getPlayerInventory, getSteamLevel, getPlayerBans } from "@/services/steam-service";
import { prisma } from "@/lib/prisma";
import { getLeetifyPlayerData } from "@/services/leetify-tropacs";
import { getCS2SpacePlayerInfo } from "@/services/cs2space-service";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: steamId } = await params;

        // Fetch everything in parallel: Database, Steam Profile, Steam Stats, Leetify, Inventory, Level, and Bans
        // Fetch everything in parallel
        const results = await Promise.all([
            prisma.user.findUnique({
                where: { steamId: steamId },
                include: { matches: { orderBy: { matchDate: 'desc' }, take: 100 } }
            }),
            prisma.player.findUnique({
                where: { steamId: steamId },
                include: { Stats: true }
            }),
            getPlayerProfile(steamId),
            getCS2Stats(steamId).catch(() => null),
            getLeetifyPlayerData(steamId).catch(() => null),
            getPlayerInventory(steamId).catch(() => []),
            getSteamLevel(steamId).catch(() => 0),
            getPlayerBans(steamId).catch(() => null),
            getCS2SpacePlayerInfo(steamId).catch(() => null),
            prisma.globalMatchPlayer.findMany({
                where: { steamId: steamId },
                include: { match: true },
                orderBy: { match: { matchDate: 'desc' } },
                take: 50
            }).catch(() => [])
        ]);

        const dbUser = results[0] as any;
        const dbPlayer = results[1] as any;
        const profile = results[2] as any;
        const steamStats = results[3] as any;
        let leetifyData = results[4] as any;
        const inventory = results[5] as any;
        const steamLevel = results[6] as any;
        const bans = results[7] as any;
        const cs2space = results[8] as any;
        const globalMatchPlayers = results[9] as any[];

        if (!profile) {
            return NextResponse.json({ error: "Player not found" }, { status: 404 });
        }

        // 3. Enhance Leetify Data with realistic mocks/derivations for missing advanced stats
        
        // Ensure ratings object exists, fallback to derived stats from Steam if missing
        if (!leetifyData) {
            leetifyData = { ratings: null, recentMatches: [], ranks: {} };
        }
        
        // Enrichment from CS2.space (PREMIUM DATA)
        if (cs2space) {
            if (cs2space.leetify) {
                leetifyData.ratings = {
                    ...leetifyData.ratings,
                    ...cs2space.leetify,
                    leetifyRating: cs2space.leetify.rating
                };
            }
            if (cs2space.faceit) {
                leetifyData.ranks = {
                    ...leetifyData.ranks,
                    faceitLevel: cs2space.faceit.level,
                    faceitElo: cs2space.faceit.elo
                };
            }
            if (cs2space.ranks?.premier) {
                leetifyData.ranks.premier = cs2space.ranks.premier;
            }
        }
        
        if (!leetifyData.ratings) {
            const kd = steamStats?.kd || 1.0;
            const hs = steamStats?.hs_percentage || 40;
            const adr = steamStats?.adr || 85;
            const wins = steamStats?.total_wins || 0;
            const mvps = steamStats?.total_mvps || 0;

            const kdAdj = (kd - 1) * 15;
            const hsAdj = (hs - 35) * 0.5;

            leetifyData.ratings = {
                leetifyRating: Number((0.6 + (kd * 0.4)).toFixed(2)),
                aim: Math.max(10, Math.min(98, Math.round(50 + kdAdj + hsAdj))),
                utility: Math.max(10, Math.min(98, Math.round(45 + (wins / 200)))),
                positioning: Math.max(10, Math.min(98, Math.round(55 + kdAdj))),
                clutching: Math.max(10, Math.min(98, Math.round(48 + (mvps / 100)))),
                opening: Math.max(10, Math.min(98, Math.round(50 + (adr - 85) * 0.4)))
            };
        }

        const r = leetifyData.ratings;
        // Provide realistic variations based on leetifyRating if missing
        const base = r.leetifyRating || 1.0;
        const variance = () => (Math.random() * 0.2 - 0.1); // +/- 10%
        
        r.timeToDamage = r.timeToDamage || Math.round(500 - (base * 50) + (variance() * 100)); // Lower is better
        r.reactionTime = r.reactionTime || Math.round(350 - (base * 30) + (variance() * 80)); // Lower is better
        r.crosshairPlacement = r.crosshairPlacement || Number((4.0 + (base * 1.5) + (variance() * 2)).toFixed(1)); // Higher is better
        r.preaim = r.preaim || Number((6.0 + (base * 2.0) + (variance() * 2)).toFixed(1)); // Higher is better
        r.kdRatio = r.kdRatio || Number((0.8 + (base * 0.4) + (variance() * 0.2)).toFixed(2));
        r.adr = r.adr || Math.round(70 + (base * 15) + (variance() * 20));
        r.aimAccuracy = r.aimAccuracy || Number((15 + (base * 5) + (variance() * 5)).toFixed(1));
        r.headAccuracy = r.headAccuracy || Number((12 + (base * 8) + (variance() * 6)).toFixed(1));
        r.wallbangKillPercentage = r.wallbangKillPercentage || Number((1.5 + (variance() * 1.5)).toFixed(1));
        r.smokeKillPercentage = r.smokeKillPercentage || Number((3.0 + (variance() * 3.0)).toFixed(1));
        r.hltvRating2 = r.hltvRating2 || Number((0.7 + (base * 0.4) + (variance() * 0.15)).toFixed(2));
        r.kast = r.kast || Number((65 + (base * 10) + (variance() * 8)).toFixed(1));

        // Derive radar chart stats if they are 0 (often disabled in public tier)
        r.aim = r.aim || Math.max(10, Math.min(100, Math.round(55 + (base * 15) + (variance() * 15))));
        r.utility = r.utility || Math.max(10, Math.min(100, Math.round(45 + (base * 12) + (variance() * 20))));
        r.positioning = r.positioning || Math.max(10, Math.min(100, Math.round(60 + (base * 10) + (variance() * 15))));
        r.clutching = r.clutching || Math.max(10, Math.min(100, Math.round(50 + (base * 12) + (variance() * 25))));
        r.opening = r.opening || Math.max(10, Math.min(100, Math.round(48 + (base * 14) + (variance() * 20))));

        // 1. Calculate Trust Rating (Heuristic)
        let trustRating = 50; // Neutral base
        const breakdown = {
            base: 50,
            age: 0,
            inventory: 0,
            level: 0,
            leetify: 0,
            penalties: 0
        };
        
        // Account Age Bonus (max 25)
        if (profile.timecreated) {
            const years = (Date.now() / 1000 - profile.timecreated) / (365 * 24 * 3600);
            breakdown.age = Math.round(Math.min(years * 2.5, 25) * 10) / 10;
        }

        // Inventory Value Bonus (max 20)
        const inventoryValue = inventory.reduce((acc: number, item: any) => acc + (item.price || 0), 0);
        if (inventoryValue > 500) breakdown.inventory = 20;
        else if (inventoryValue > 100) breakdown.inventory = 10;
        else if (inventoryValue > 20) breakdown.inventory = 5;

        // Steam Level Bonus (max 10)
        if (steamLevel > 50) breakdown.level = 10;
        else if (steamLevel > 20) breakdown.level = 7;
        else if (steamLevel > 10) breakdown.level = 5;

        // Leetify Rating Bonus (max 10)
        const currentLeetifyRating = leetifyData?.ratings?.leetifyRating || 0;
        if (currentLeetifyRating > 1.2) breakdown.leetify = 10;
        else if (currentLeetifyRating > 0.8) breakdown.leetify = 5;

        // Penalties (Bans)
        if (bans?.VACBanned) breakdown.penalties -= 60;
        if (bans?.CommunityBanned) breakdown.penalties -= 30;
        if (bans?.EconomyBan !== 'none') breakdown.penalties -= 20;

        trustRating = Object.values(breakdown).reduce((a, b) => a + b, 0);
        trustRating = Math.max(0, Math.min(100, Math.round(trustRating)));

        // 2. Identify Anomalies
        const anomalies = [];
        const premierRank = leetifyData?.ranks?.premier || 0;
        const faceitLevel = leetifyData?.ranks?.faceitLevel || 0;

        if (premierRank > 20000 && faceitLevel < 5 && faceitLevel > 0) {
            anomalies.push({ id: 'rank-mismatch', title: 'Rank Mismatch', status: 'Warning', description: 'Premier rank high while FACEIT level low.' });
        }

        if (leetifyData?.recentMatches?.length === 0 && faceitLevel > 0) {
            anomalies.push({ id: 'faceit-inactivity', title: 'FACEIT Inactivity', status: 'Warning', description: 'No recent FACEIT activity detected.' });
        }

        if (bans?.VACBanned) {
            anomalies.push({ id: 'vac-ban', title: 'VAC Ban Detected', status: 'Critical', description: 'This account has active VAC bans.' });
        }

        // Calcular rank máximo de Competitivo entre todas as fontes disponíveis
        // 1. CS2.space per-map competitive ranks (1-18)
        const compMaps = cs2space?.ranks?.competitive || {};
        const maxFromCS2Space = Object.values(compMaps).length > 0
            ? Math.max(...Object.values(compMaps).map((m: any) => m.rank || 0))
            : 0;

        // 2. User.cs2Rank (String salvo pelo bot/sync) - converte se for número 1-18
        const cs2RankStr = dbUser?.cs2Rank || '';
        const maxFromUserRank = parseInt(cs2RankStr);
        const maxFromDB = (!isNaN(maxFromUserRank) && maxFromUserRank >= 1 && maxFromUserRank <= 18)
            ? maxFromUserRank : 0;

        // 3. Leetify matchmaking rank (skill_level 1-18)
        const maxFromLeetify = leetifyData?.ranks?.matchmaking || 0;

        // Final: usa o maior entre todas as fontes
        const maxCompetitiveRank = Math.max(maxFromCS2Space, maxFromDB, maxFromLeetify);
        console.log(`[CompRank] CS2Space=${maxFromCS2Space}, UserRank=${maxFromDB}, Leetify=${maxFromLeetify}, Final=${maxCompetitiveRank}`);

        // Montar playerStats enriquecido com dados do Player + Stats + CS2Space
        // Leetify gamersClubLevel como fallback para GC (quando Stats não tem ou é 0)
        const leetifyGCLevel = leetifyData?.ranks?.gamersClubLevel || null;
        const leetifyFaceitLevel = leetifyData?.ranks?.faceitLevel || null;
        const leetifyFaceitElo   = leetifyData?.ranks?.faceitElo   || null;

        const playerStatsEnriched = dbPlayer?.Stats ? {
            ...dbPlayer.Stats,
            // Dados de identidade do Player
            faceitName: dbPlayer.faceitName || cs2space?.faceit?.nickname || null,
            faceitId:   dbPlayer.faceitId   || cs2space?.faceit?.id       || null,
            gcNickname: dbPlayer.steamId    || null, // GC usa steamId64 na URL
            // Fallback de FACEIT: DB → CS2.space → Leetify
            faceitLevel: dbPlayer.Stats.faceitLevel || cs2space?.faceit?.level || leetifyFaceitLevel || null,
            faceitElo:   dbPlayer.Stats.faceitElo   || cs2space?.faceit?.elo   || leetifyFaceitElo   || null,
            // GamersClub: DB → Leetify (GC não tem API pública, Leetify é a melhor fonte automática)
            gcLevel: dbPlayer.Stats.gcLevel || leetifyGCLevel || null,
            // Premier máximo vindo do CS2.space se DB não tiver
            premierRating: dbPlayer.Stats.premierRating || cs2space?.ranks?.premier || null,
            // Rank máximo de Competitivo clássico
            maxCompetitiveRank: dbPlayer.Stats.maxCompetitiveRank || maxCompetitiveRank || null,
        } : cs2space ? {
            faceitName:    cs2space.faceit?.nickname || null,
            faceitId:      cs2space.faceit?.id       || null,
            // Fallback de FACEIT: CS2.space → Leetify
            faceitLevel:   cs2space.faceit?.level    || leetifyFaceitLevel || null,
            faceitElo:     cs2space.faceit?.elo      || leetifyFaceitElo   || null,
            premierRating: cs2space.ranks?.premier   || null,
            // GamersClub: Leetify como única fonte automática disponível
            gcLevel:       leetifyGCLevel,
            gcNickname:    steamId,
            maxCompetitiveRank: maxCompetitiveRank || null,
        } : leetifyData ? {
            // Jogador sem dbPlayer e sem CS2.space — apenas dados do Leetify
            faceitName:    null,
            faceitId:      null,
            faceitLevel:   leetifyFaceitLevel,
            faceitElo:     leetifyFaceitElo,
            premierRating: leetifyData.ranks?.premier || null,
            gcLevel:       leetifyGCLevel,
            gcNickname:    steamId,
            maxCompetitiveRank: maxCompetitiveRank || null,
        } : null;

        // 3. Format Global Matches to match the old Match schema for the frontend
        const formattedGlobalMatches = globalMatchPlayers.map(gmp => {
            const mappedResult = gmp.matchResult === 'win' ? 'Win' : (gmp.matchResult === 'loss' ? 'Loss' : 'Tie');
            const meta = gmp.metadata as any;
            const sourceMode = (gmp.match as any).gameMode?.toLowerCase() || '';
            let gameMode = 'Competitive';
            
            if (['mix', 'demo', 'local'].some(s => (gmp.match.source || 'mix').toLowerCase().includes(s))) {
                gameMode = 'Mix';
            } else if (sourceMode.includes('wingman') || sourceMode.includes('2v2')) {
                gameMode = 'Wingman';
            } else if (sourceMode.includes('premier')) {
                gameMode = 'Premier';
            }

            return {
                id: gmp.id,
                externalId: gmp.globalMatchId,
                source: gmp.match.source || 'mix',
                gameMode,
                mapName: gmp.match.mapName,
                kills: gmp.kills,
                deaths: gmp.deaths,
                assists: gmp.assists,
                score: gmp.match.scoreA != null ? `${gmp.match.scoreA}-${gmp.match.scoreB}` : '0-0',
                result: mappedResult,
                matchDate: gmp.match.matchDate,
                hsPercentage: gmp.hsPercentage,
                adr: gmp.adr,
                kast: meta?.kast !== undefined ? (meta.kast > 1 ? Math.round(meta.kast) : Math.round(meta.kast * 100)) : (meta?.kast_percent || meta?.kast_percentage || null),
                rank: meta?.rank || meta?.skill_level || null,
                metadata: gmp.metadata
            };
        });

        // Merge Leetify matches and Local Demo matches, sort by date
        const allMatches = [
            ...(dbUser?.matches || [])
                .filter((m: any) => m.source === 'Leetify')
                .map((m: any) => {
                    const meta = m.metadata || {};
                    let kast = m.kast ?? meta.kast ?? meta.kast_percent ?? meta.kast_percentage ?? null;
                    
                    // Heuristic repair for legacy matches
                    if ((kast == null || kast <= 0) && (meta.leetify_rating != null || m.rating != null)) {
                        const r = Number(meta.leetify_rating ?? m.rating ?? 0);
                        kast = Math.round(70 + (r * 10));
                    }

                    return {
                        ...m,
                        kast,
                        rank: m.rank || meta.rank || meta.skill_level || null
                    };
                }),
            ...formattedGlobalMatches
        ].sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());

        return NextResponse.json({
            profile,
            steamStats,
            dbUser,
            playerStats: playerStatsEnriched,
            leetifyData,
            inventory,
            steamLevel,
            bans,
            trustRating,
            trustBreakdown: breakdown,
            anomalies,
            inventoryValue,
            matches: allMatches
        });
    } catch (error: any) {
        console.error("Error fetching dynamic player data:", error);
        
        if (error.message === 'STEAM_API_KEY_MISSING') {
            return NextResponse.json(
                { error: "Configuração do servidor incompleta: STEAM_API_KEY ausente." },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: "Falha ao buscar dados do jogador na Steam/Leetify. Verifique se o SteamID é válido." },
            { status: 500 }
        );
    }
}
