import { NextRequest, NextResponse } from "next/server";
import { getPlayerInventory } from "@/services/steam-service";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !(session.user as any)?.steamId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const steamId = (session.user as any).steamId;
        console.log("Fetching inventory for SteamID:", steamId);
        const items = await getPlayerInventory(steamId);
        console.log("Inventory items found:", items?.length || 0);

        return NextResponse.json({ items });
    } catch (error) {
        console.error("Error fetching player inventory:", error);
        return NextResponse.json(
            { error: "Failed to fetch player inventory" },
            { status: 500 }
        );
    }
}
