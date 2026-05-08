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

        const userSteamId = (session.user as any)?.steamId || '';
        const globalMatchPlayers = await prisma.globalMatchPlayer.findMany({
            where: { steamId: userSteamId },
            include: { GlobalMatch: true },
            orderBy: { GlobalMatch: { matchDate: 'desc' } }
        });
        
        // ── CÁLCULO AUTOMÁTICO DE TROPOINTS (LISTA) ──────────────────────────
        // Para partidas MIX/Locais que ainda estão com 0 pontos, calculamos agora.
        // Limitamos a 5 por requisição para evitar travamentos/timeouts.
        const pendingCalculation = globalMatchPlayers.filter(gmp => {
            const src = (gmp.GlobalMatch.source || '').toLowerCase();
            const isValidSrc = ['mix', 'manual', 'demo', 'local', 'demo-analyzer', 'leetify'].includes(src);
            return isValidSrc && (gmp.eloChange === null || gmp.eloChange === 0);
        });

        if (pendingCalculation.length > 0) {
            console.log(`[AutoTropoints] Calculando pontos para ${pendingCalculation.length} partidas pendentes...`);
            const { calculateMatchTropoints } = await import('@/services/ranking-service');
            // Processar sequencialmente para não sobrecarregar o banco
            for (const p of pendingCalculation.slice(0, 5)) {
                try {
                    await calculateMatchTropoints(p.globalMatchId);
                } catch (err: any) {
                    console.warn(`[AutoTropoints] Falha para ${p.globalMatchId}: ${err.message}`);
                }
            }
            
            // Re-buscar para obter os valores atualizados
            const updatedPlayers = await prisma.globalMatchPlayer.findMany({
                where: { steamId: (session.user as any)?.steamId || '' },
                include: { GlobalMatch: true },
                orderBy: { GlobalMatch: { matchDate: 'desc' } }
            });
            globalMatchPlayers.length = 0;
            globalMatchPlayers.push(...updatedPlayers);
        }

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

            // Impact Rating
            const impact = meta.impact ?? meta.impact_rating ?? meta.impactRating ?? null;

            // ELO info (if available in metadata)
            const eloChange = meta.eloChange ?? meta.elo_change ?? null;
            const eloAfter = meta.eloAfter ?? meta.elo_after ?? null;

            // Robust GameMode Detection (Fix for Leetify games showing as Mix)
            let gameMode = m.gameMode || 'Competitive';
            const rawSource = (m.source || '').toLowerCase();
            const metaMode = (meta.gameMode || meta.data_source || meta.detected_mode || '').toLowerCase();

            if (rawSource.includes('gamersclub') || metaMode.includes('gamersclub')) {
                gameMode = 'GamersClub';
            } else if (rawSource.includes('faceit') || metaMode.includes('faceit')) {
                gameMode = 'Faceit';
            } else if (rawSource.includes('premier') || metaMode.includes('premier') || meta.rank_type === 11) {
                gameMode = 'Premier';
            } else if (rawSource.includes('wingman') || metaMode.includes('wingman')) {
                gameMode = 'Wingman';
            } else if (rawSource.includes('mix') || rawSource.includes('demo') || metaMode.includes('mix')) {
                gameMode = 'Mix';
            }

            return { ...m, kills, deaths, assists, adr, hsPercentage, kast, rank, eloChange, eloAfter, impact, gameMode };
        });

        // Format Global Matches to match the old Match schema for the frontend
        const isTeamA = (t: string | null) => !t || ['A', 'CT', '3'].includes(String(t).toUpperCase());

        const formattedGlobalMatches = globalMatchPlayers.map(gmp => {
            let res = (gmp.matchResult || '').toLowerCase();
            let mappedResult = res === 'win' ? 'Win' : (res === 'loss' ? 'Loss' : 'Tie');
            const meta = (gmp.metadata as any) || {};
            const matchMeta = (gmp.GlobalMatch.metadata as any) || {};
            const rawSource = (gmp.GlobalMatch.source || 'mix').toLowerCase();
            const sourceMode = (matchMeta.gameMode || matchMeta.data_source || matchMeta.detected_mode || '').toLowerCase();
            let gameMode = 'Mix';
            
            if (rawSource.includes('premier') || sourceMode.includes('premier') || matchMeta.rank_type === 11) {
                gameMode = 'Premier';
            } else if (rawSource.includes('gamersclub') || sourceMode.includes('gamersclub')) {
                gameMode = 'GamersClub';
            } else if (rawSource.includes('faceit') || sourceMode.includes('faceit')) {
                gameMode = 'Faceit';
            } else if (rawSource.includes('competitivo') || rawSource.includes('competitive') || sourceMode.includes('competitive')) {
                gameMode = 'Competitive';
            } else if (rawSource.includes('braço direito') || rawSource.includes('wingman') || sourceMode.includes('wingman') || sourceMode.includes('2v2')) {
                gameMode = 'Wingman';
            } else if (rawSource.includes('mix') || rawSource.includes('demo') || rawSource.includes('local') || sourceMode.includes('mix')) {
                gameMode = 'Mix';
            } else {
                // If it's from Leetify but we couldn't detect a specific platform, assume Competitive
                if (rawSource.includes('leetify')) gameMode = 'Competitive';
            }

            // Fallback for result
            if (mappedResult === 'Tie') {
                const scoreA = gmp.GlobalMatch.scoreA ?? 0;
                const scoreB = gmp.GlobalMatch.scoreB ?? 0;
                if (scoreA !== scoreB) {
                    const myIsA = isTeamA(gmp.team);
                    const myScore = myIsA ? scoreA : scoreB;
                    const theirScore = myIsA ? scoreB : scoreA;
                    mappedResult = myScore > theirScore ? 'Win' : (myScore < theirScore ? 'Loss' : 'Tie');
                }
            }

            // Fallback for mapName
            let mapName = gmp.GlobalMatch.mapName;
            if (mapName === 'Desconhecido') {
                const demoUrl = (gmp.GlobalMatch.metadata as any)?.demoUrl || (gmp.GlobalMatch.metadata as any)?.demo_url;
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
                externalId: (gmp.GlobalMatch as any).externalId || matchMeta.externalId || gmp.globalMatchId,
                source: gmp.GlobalMatch.source || 'mix',
                gameMode,
                mapName,
                kills: gmp.kills,
                deaths: gmp.deaths,
                assists: gmp.assists,
                score: gmp.GlobalMatch.scoreA != null 
                    ? (isTeamA(gmp.team) ? `${gmp.GlobalMatch.scoreA}-${gmp.GlobalMatch.scoreB}` : `${gmp.GlobalMatch.scoreB}-${gmp.GlobalMatch.scoreA}`)
                    : '0-0',
                result: mappedResult,
                matchDate: gmp.GlobalMatch.matchDate,
                hsPercentage: gmp.hsPercentage,
                adr: gmp.adr,
                kast: meta?.kast !== undefined ? (meta.kast > 1 ? Math.round(meta.kast) : Math.round(meta.kast * 100)) : (meta?.kast_percent || meta?.kast_percentage || null),
                rank: meta?.rank || meta?.skill_level || null,
                eloChange: gmp.eloChange,
                eloAfter: gmp.eloAfter,
                impact: gmp.impact ?? meta?.impact ?? meta?.impact_rating ?? meta?.impactRating ?? null,
                url: (gmp.GlobalMatch.metadata as any)?.demoUrl || (gmp.GlobalMatch.metadata as any)?.demo_url || null,
                metadata: { ...(gmp.GlobalMatch.metadata as any || {}), ...meta }
            };
        });

        // Merge and deduplicate by externalId or ID
        const allMatchesMap = new Map<string, any>();
        
        // Process global matches first (they are usually richer/local)
        formattedGlobalMatches.forEach(m => {
            const key = m.externalId || m.id;
            allMatchesMap.set(key, m);
        });

        // Add legacy matches only if they don't already exist
        matches.forEach(m => {
            const key = m.externalId || m.id;
            if (!allMatchesMap.has(key)) {
                allMatchesMap.set(key, m);
            } else {
                // If it exists, we might want to merge some metadata
                const existing = allMatchesMap.get(key);
                if (m.source === 'Faceit' || m.source === 'GamersClub') {
                    existing.source = m.source;
                }
            }
        });

        const allMatches = Array.from(allMatchesMap.values()).sort((a, b) => 
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
