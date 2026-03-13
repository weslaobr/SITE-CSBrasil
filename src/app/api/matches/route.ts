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
        const matches = await prisma.match.findMany({
            where: { userId },
            orderBy: { matchDate: 'desc' }
        });

        console.log(`[Matches GET] userId=${userId} — Found ${matches.length} matches in DB`);

        return NextResponse.json({
            matches: matches || [],
            count: (matches || []).length
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
