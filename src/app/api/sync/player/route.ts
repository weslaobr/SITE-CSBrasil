import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { syncUserMatches } from "@/services/sync-service";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { steamId } = await req.json();

        if (!steamId) {
            return NextResponse.json({ error: "SteamID is required" }, { status: 400 });
        }

        const [syncedCount] = await Promise.all([
            syncUserMatches(steamId),
            syncUserStats(steamId)
        ]);

        return NextResponse.json({ success: true, count: syncedCount });
    } catch (error: any) {
        console.error("[SyncPlayerAPI] Error:", error);
        return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 });
    }
}
