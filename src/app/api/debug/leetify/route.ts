import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeetifyPlayerData } from "@/services/leetify-tropacs";

// Debug endpoint — remove in production
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { steamId: true }
        });

        if (!user?.steamId) {
            return NextResponse.json({ error: "No steamId" });
        }

        const leetifyData = await getLeetifyPlayerData(user.steamId);
        const firstMatch = leetifyData?.recentMatches?.[0] || null;

        return NextResponse.json({
            steamId: user.steamId,
            totalRecentMatches: leetifyData?.recentMatches?.length || 0,
            sampleMatch: firstMatch,
            allFields: firstMatch ? Object.keys(firstMatch) : []
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
