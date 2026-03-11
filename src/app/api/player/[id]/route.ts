import { NextRequest, NextResponse } from "next/server";
import { getPlayerProfile, getCS2Stats, getPlayerInventory } from "@/services/steam-service";
import { prisma } from "@/lib/prisma";
import { getLeetifyPlayerData } from "@/services/leetify-csbrasil";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: steamId } = await params;

        // 1. Check if we have this user in our database (for synced stats)
        const dbUser = await prisma.user.findUnique({
            where: { steamId: steamId },
            include: {
                matches: {
                    orderBy: { matchDate: 'desc' },
                    take: 20
                }
            }
        });

        // 2. Fetch fresh profile/stats from Steam and Leetify
        const [profile, steamStats, leetifyData, inventory] = await Promise.all([
            getPlayerProfile(steamId),
            getCS2Stats(steamId).catch(() => null),
            getLeetifyPlayerData(steamId).catch(() => null),
            getPlayerInventory(steamId).catch(() => [])
        ]);

        if (!profile) {
            return NextResponse.json({ error: "Player not found" }, { status: 404 });
        }

        return NextResponse.json({
            profile,
            steamStats,
            dbUser,
            leetifyData,
            inventory,
            matches: dbUser?.matches || []
        });
    } catch (error) {
        console.error("Error fetching dynamic player data:", error);
        return NextResponse.json(
            { error: "Failed to fetch player data" },
            { status: 500 }
        );
    }
}
