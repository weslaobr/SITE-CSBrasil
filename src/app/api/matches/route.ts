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

            return { ...m, kills, deaths, assists, adr, hsPercentage, kast };
        });

        // Format Global Matches to match the old Match schema for the frontend
        const formattedGlobalMatches = globalMatchPlayers.map(gmp => {
            const res = (gmp.matchResult || '').toLowerCase();
            const mappedResult = res === 'win' ? 'Win' : (res === 'loss' ? 'Loss' : 'Tie');
            return {
                id: gmp.id,
                externalId: gmp.globalMatchId,
                source: gmp.match.source || 'mix',
                gameMode: ['mix', 'demo', 'local'].some(s => (gmp.match.source || 'mix').toLowerCase().includes(s)) ? 'Mix' : 'Competitive',
                mapName: gmp.match.mapName,
                kills: gmp.kills,
                deaths: gmp.deaths,
                assists: gmp.assists,
                score: gmp.match.scoreA != null ? `${gmp.match.scoreA}-${gmp.match.scoreB}` : '0-0',
                result: mappedResult,
                matchDate: gmp.match.matchDate,
                hsPercentage: gmp.hsPercentage,
                adr: gmp.adr,
                kast: (gmp.metadata as any)?.kast ?? (gmp.metadata as any)?.kast_percent ?? (gmp.metadata as any)?.kast_percentage,
                metadata: gmp.metadata
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
