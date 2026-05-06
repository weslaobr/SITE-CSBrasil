import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Always read from database directly, never auto-sync (avoids timeouts)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;

        // Clean up any stale placeholder 'Desconhecido' / 'Unknown' entries from old sync code
        await prisma.match.deleteMany({
            where: {
                userId,
                OR: [
                    { mapName: 'Desconhecido' },
                    { result: 'Unknown' }
                ]
            }
        });

        // Fetch matches from DB — always read from DB, sync is done separately via POST /api/sync/all
        const rawMatches = await prisma.match.findMany({
            where: { userId },
            orderBy: { matchDate: 'desc' }
        });
        
        // Fetch matches imported via Local CS2 Demo Processor
        const globalMatchPlayers = await prisma.globalMatchPlayer.findMany({
            where: { steamId: (session.user as any)?.steamId || '' },
            include: { match: true },
            orderBy: { match: { matchDate: 'desc' } }
        });

        console.log(`[Matches GET] userId=${userId} — Found ${rawMatches.length} legacy matches, ${globalMatchPlayers.length} local demos in DB`);

        // Enrich matches: if DB columns are 0/null, recover from raw Leetify metadata
        const matches = rawMatches.map((m) => {
            const meta: any = m.metadata || {};

            // Extract kills from multiple possible field names
            const kills = (m.kills && m.kills > 0)
                ? m.kills
                : (meta.kills ?? meta.num_kills ?? meta.totalKills ?? meta.total_kills ?? 0);

            const deaths = (m.deaths && m.deaths > 0)
                ? m.deaths
                : (meta.deaths ?? meta.num_deaths ?? meta.totalDeaths ?? meta.total_deaths ?? 0);

            const assists = (m.assists && m.assists > 0)
                ? m.assists
                : (meta.assists ?? meta.num_assists ?? meta.totalAssists ?? meta.total_assists ?? 0);

            // ADR
            const adr = (m.adr != null && m.adr > 0)
                ? m.adr
                : (meta.adr ?? meta.average_damage_per_round ?? meta.avgDamagePerRound ?? null);

            // HS%: handle both ratio (0.2979) and full percent (29.79)
            let hsPercentage = m.hsPercentage;
            if ((hsPercentage == null || hsPercentage <= 0) && meta.accuracy_head != null) {
                const raw = Number(meta.accuracy_head);
                hsPercentage = raw > 1 ? Math.round(raw) : Math.round(raw * 100);
            }
            if (hsPercentage == null && meta.hs_percentage != null) {
                hsPercentage = Number(meta.hs_percentage);
            }

            // KAST: handle both ratio (0.72) and full percent (72.0)
            let kast = (m as any).kast;
            if ((kast == null || kast <= 0) && (meta.kast != null || meta.kast_percent != null || meta.kast_percentage != null)) {
                const raw = Number(meta.kast ?? meta.kast_percent ?? meta.kast_percentage);
                kast = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
            }

            // HEURISTIC REPAIR: If still null/0, derive from rating
            if ((kast == null || kast <= 0) && (meta.leetify_rating != null || (m as any).rating != null)) {
                const r = Number(meta.leetify_rating ?? (m as any).rating ?? 0);
                kast = Math.round(70 + (r * 10)); // Realistic estimate for UI
            }

            // Rank extraction
            const rank = meta.rank || meta.skill_level || meta.matchmaking_rank || null;

            // Elo/Tropoints extraction
            const eloChange = meta.eloChange ?? meta.elo_change ?? null;
            const eloAfter = meta.eloAfter ?? meta.elo_after ?? null;

            return { ...m, kills, deaths, assists, adr, hsPercentage, kast, rank, eloChange, eloAfter };
        });

        // Format Global Matches to match the old Match schema for the frontend
        const isTeamA = (t: string | null) => !t || ['A', 'CT', '3'].includes(String(t).toUpperCase());

        const formattedGlobalMatches = globalMatchPlayers.map(gmp => {
            let res = (gmp.matchResult || '').toLowerCase();
            let mappedResult = res === 'win' ? 'Win' : (res === 'loss' ? 'Loss' : 'Tie');
            const sourceMode = (gmp.match as any).gameMode?.toLowerCase() || '';
            const meta = gmp.metadata as any;
            let gameMode = 'Competitive';
            
            if (['mix', 'demo', 'local'].some(s => (gmp.match.source || 'mix').toLowerCase().includes(s))) {
                gameMode = 'Mix';
            } else if (sourceMode.includes('wingman') || sourceMode.includes('2v2')) {
                gameMode = 'Wingman';
            } else if (sourceMode.includes('premier')) {
                gameMode = 'Premier';
            }

            // Fallback for result
            if (mappedResult === 'Tie') {
                const scoreA = gmp.match.scoreA ?? 0;
                const scoreB = gmp.match.scoreB ?? 0;
                if (scoreA !== scoreB) {
                    const myIsA = isTeamA(gmp.team);
                    const myScore = myIsA ? scoreA : scoreB;
                    const theirScore = myIsA ? scoreB : scoreA;
                    mappedResult = myScore > theirScore ? 'Win' : (myScore < theirScore ? 'Loss' : 'Tie');
                }
            }

            // Fallback for mapName
            let mapName = gmp.match.mapName;
            if (mapName === 'Desconhecido') {
                const demoUrl = (gmp.match.metadata as any)?.demoUrl || (gmp.match.metadata as any)?.demo_url;
                if (demoUrl) {
                    try {
                        const tokenMatch = demoUrl.match(/token=([^&]+)/);
                        if (tokenMatch) {
                            const payloadBase64 = tokenMatch[1].split('.')[1];
                            if (payloadBase64) {
                                let b64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
                                while (b64.length % 4) b64 += '=';
                                const payload = atob(b64);
                                const mapMatch = payload.match(/_(de_[a-zA-Z0-9]+|cs_[a-zA-Z0-9]+)_/i);
                                if (mapMatch) mapName = mapMatch[1];
                            }
                        }
                    } catch(e) {}
                }
            }

            return {
                id: gmp.globalMatchId,
                playerId: gmp.id,
                externalId: gmp.match.externalId || gmp.globalMatchId,
                source: gmp.match.source || 'mix',
                gameMode,
                mapName,
                kills: gmp.kills,
                deaths: gmp.deaths,
                assists: gmp.assists,
                score: gmp.match.scoreA != null 
                    ? (isTeamA(gmp.team) ? `${gmp.match.scoreA}-${gmp.match.scoreB}` : `${gmp.match.scoreB}-${gmp.match.scoreA}`)
                    : '0-0',
                result: mappedResult,
                matchDate: gmp.match.matchDate,
                hsPercentage: gmp.hsPercentage,
                adr: gmp.adr,
                kast: meta?.kast !== undefined ? (meta.kast > 1 ? Math.round(meta.kast) : Math.round(meta.kast * 100)) : (meta?.kast_percent || meta?.kast_percentage || null),
                rank: meta?.rank || meta?.skill_level || null,
                eloChange: gmp.eloChange,
                eloAfter: gmp.eloAfter,
                url: (gmp.match.metadata as any)?.demoUrl || (gmp.match.metadata as any)?.demo_url || null,
                metadata: { ...(gmp.match.metadata as any || {}), ...meta }
            };
        });

        // Merge and sort
        const allMatches = [...matches, ...formattedGlobalMatches].sort((a, b) => 
            new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
        );

        return NextResponse.json({
            matches: allMatches,
            count: allMatches.length
        });
    } catch (error) {
        console.error("Critical Matches Fetch Error:", error);
        return NextResponse.json({ error: "Failed to fetch matches", matches: [] }, { status: 500 });
    }
}

// POST to update credentials
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { faceitNickname, steamMatchAuthCode } = await req.json();
        const userId = (session.user as any).id;

        const updateData: any = {};
        if (faceitNickname !== undefined) updateData.faceitNickname = faceitNickname;
        if (steamMatchAuthCode !== undefined) updateData.steamMatchAuthCode = steamMatchAuthCode;

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
