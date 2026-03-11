import { NextRequest, NextResponse } from "next/server";
import { getPlayerProfile, getCS2Stats } from "@/services/steam-service";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !(session.user as any)?.steamId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const steamId = (session.user as any).steamId;

        const [profile, stats] = await Promise.all([
            getPlayerProfile(steamId),
            getCS2Stats(steamId).catch(() => null), // If player hasn't played or stats are private
        ]);

        return NextResponse.json({ profile, stats });
    } catch (error) {
        console.error("Error fetching player data:", error);
        return NextResponse.json(
            { error: "Failed to fetch player data" },
            { status: 500 }
        );
    }
}
