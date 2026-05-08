import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Middleware for admin check
async function isAdmin(req: NextRequest) {
    const session = await getServerSession(getAuthOptions(req));
    return session?.user && (session.user as any).isAdmin;
}

export async function GET(req: NextRequest) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const source = searchParams.get('source');

        const where: any = {};
        if (source && source !== 'all') {
            where.source = { contains: source, mode: 'insensitive' };
        }

        const matches = await prisma.globalMatch.findMany({
            where,
            include: {
                GlobalMatchPlayer: {
                    include: {
                        User: {
                            select: {
                                name: true,
                                image: true,
                                steamId: true
                            }
                        }
                    }
                }
            },
            orderBy: { matchDate: 'desc' }
        });

        const formattedMatches = matches.map(m => {
            const players = ((m as any).GlobalMatchPlayer || []).map((p: any) => ({
                ...p,
                user: p.User
            }));
            let mapName = m.mapName;
            const meta = (m.metadata as any) || {};

            if (mapName === 'Desconhecido') {
                const demoUrl = meta.demoUrl || meta.demo_url;
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
                    } catch (e) {}
                }
            }

            return { ...m, mapName, players };
        });

        return NextResponse.json({ matches: formattedMatches });
    } catch (error) {
        console.error("[Admin Matches GET] Error:", error);
        return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Missing match ID" }, { status: 400 });
        }

        // 1. Buscar a partida e seus jogadores antes de deletar para reverter os pontos
        const match = await prisma.globalMatch.findUnique({
            where: { id },
            include: { GlobalMatchPlayer: true }
        });

        if (match) {
            const { getMixLevelFromPoints } = await import("@/lib/mix-level");
            
            // 2. Reverter os pontos para cada jogador que seja usuário do site
            for (const p of match.GlobalMatchPlayer) {
                if (p.userId && p.eloChange) {
                    const user = await prisma.user.findUnique({ where: { id: p.userId } });
                    if (user) {
                        const newPoints = Math.max(0, (user.rankingPoints ?? 500) - p.eloChange);
                        const { level: newLevel } = getMixLevelFromPoints(newPoints);
                        
                        await prisma.user.update({
                            where: { id: p.userId },
                            data: {
                                rankingPoints: newPoints,
                                mixLevel: newLevel
                            }
                        });
                    }
                }
            }
        }

        // 3. Deletar a partida (os GlobalMatchPlayer serão deletados em cascata)
        await prisma.globalMatch.delete({
            where: { id }
        });

        // 4. NOVO: Deletar resquícios nas tabelas do analisador (tracker_*)
        // Isso evita que informações fiquem duplicadas ao re-importar a mesma demo
        try {
            await (prisma as any).tracker_matches.delete({
                where: { match_id: id }
            });
            console.log(`[Admin Delete] Tracker records cleaned up for match ${id}`);
        } catch (trackerErr) {
            // Pode não existir se a partida for do Leetify, então ignoramos se falhar
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Admin Matches DELETE] Error:", error);
        return NextResponse.json({ error: "Failed to delete match" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, scoreA, scoreB, mapName } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "Missing match ID" }, { status: 400 });
        }

        const updatedMatch = await prisma.globalMatch.update({
            where: { id },
            data: {
                scoreA: scoreA !== undefined ? parseInt(scoreA) : undefined,
                scoreB: scoreB !== undefined ? parseInt(scoreB) : undefined,
                mapName: mapName || undefined
            }
        });

        // Se mudou o placar, os Tropoints podem mudar. Recalculamos.
        if (scoreA !== undefined || scoreB !== undefined) {
            const { calculateMatchTropoints } = await import("@/services/ranking-service");
            try {
                await calculateMatchTropoints(id);
            } catch (e) {
                console.warn(`[Admin Patch] Falha ao recalcular tropoints para ${id}:`, e);
            }
        }

        return NextResponse.json({ success: true, match: updatedMatch });
    } catch (error) {
        console.error("[Admin Matches PATCH] Error:", error);
        return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
    }
}
