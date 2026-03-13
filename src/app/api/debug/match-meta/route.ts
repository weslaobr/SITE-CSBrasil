import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import axios from "axios";

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY || '4549d73d-8a0d-40ff-9051-a3166c518dae';
const LEETIFY_BASE_URL = 'https://api-public.cs-prod.leetify.com';

// Debug: GET /api/debug/match-detail?matchId=xxx
export async function GET(req: NextRequest) {
    const session = await getServerSession(getAuthOptions(req));
    if (!session || !(session.user as any)?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { steamId: true }
    });

    const { searchParams } = new URL(req.url);
    let matchId = searchParams.get('matchId');

    // If no matchId provided, use the first match from DB
    if (!matchId) {
        const firstMatch = await prisma.match.findFirst({
            where: { userId },
            orderBy: { matchDate: 'desc' }
        });
        matchId = firstMatch?.externalId?.replace('leetify-', '') || null;
    }

    if (!matchId) {
        return NextResponse.json({ error: "No match found" });
    }

    try {
        const res = await axios.get(`${LEETIFY_BASE_URL}/v2/matches/${matchId}`, {
            headers: { '_leetify_key': LEETIFY_API_KEY }
        });
        const data = res.data;
        
        const statsKeys = data.stats?.[0] ? Object.keys(data.stats[0]) : [];
        const playerStat = data.stats?.find((p: any) => 
            p.steam64_id === user?.steamId || p.steamId === user?.steamId || p.player_id === user?.steamId
        );

        return NextResponse.json({
            matchId,
            userSteamId: user?.steamId,
            topLevelKeys: Object.keys(data),
            statsCount: data.stats?.length,
            firstStatKeys: statsKeys,
            firstStatSample: data.stats?.[0],
            playerStatFound: !!playerStat,
            playerStat
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, status: e.response?.status });
    }
}
