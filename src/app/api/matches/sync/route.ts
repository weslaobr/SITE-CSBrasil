import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFaceitMatches, getFaceitPlayer } from "@/services/faceit-service";
import { getSteamMatchHistory } from "@/services/steam-service";
import { getLeetifyProfile } from "@/services/leetify-service";
import axios from "axios";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                faceitNickname: true,
                steamId: true,
                steamMatchAuthCode: true,
                steamLatestMatchCode: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const results = {
            faceit: 0,
            steam: 0
        };

        /* Deep Sync Deactivated: Only Leetify allowed
        // 1. Faceit Deep Sync...
        // 2. Steam Deep Sync...
        */

        return NextResponse.json({ success: true, results, hasMore: false });
    } catch (error) {
        console.error("Deep Sync Error:", error);
        return NextResponse.json({ error: "Failed to perform deep sync" }, { status: 500 });
    }
}
