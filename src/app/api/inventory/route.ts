import { NextRequest, NextResponse } from "next/server";
import { getPlayerInventory } from "@/services/steam-service";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !(session.user as any)?.steamId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const steamId = (session.user as any).steamId;
        const userId = (session.user as any).id;
        
        console.log("Fetching inventory for SteamID:", steamId);
        const steamItems = await getPlayerInventory(steamId);
        
        // Buscar preços pagos no banco
        const userSavedItems = await prisma.userInventoryItem.findMany({
            where: { userId }
        });

        // Cruzar os dados
        const items = steamItems.map((item: any) => {
            const saved = userSavedItems.find((s: any) => s.assetId === item.assetid);
            return {
                ...item,
                paidPrice: saved ? saved.paidPrice : null
            };
        });

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
