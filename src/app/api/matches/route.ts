import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFaceitMatches, getFaceitPlayer } from "@/services/faceit-service";
import { getSteamMatchHistory } from "@/services/steam-service";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;

        // Fetch matches from DB
        let matches = await prisma.match.findMany({
            where: { userId },
            orderBy: { matchDate: 'desc' }
        });

        // Auto-sync fallout if empty
        if (matches.length === 0) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { faceitNickname: true, steamId: true, steamMatchAuthCode: true, steamLatestMatchCode: true }
            });

            if (user) {
                // 1. Quick Faceit check
                if (user.faceitNickname) {
                    try {
                        const faceitPlayer = await getFaceitPlayer(user.faceitNickname);
                        if (faceitPlayer) {
                            const faceitMatches = await getFaceitMatches(faceitPlayer.player_id);
                            for (const m of faceitMatches.slice(0, 50)) {
                                await prisma.match.upsert({
                                    where: { externalId: m.externalId },
                                    update: {},
                                    create: { ...m, userId }
                                });
                            }
                        }
                    } catch (e) { console.error("Auto-sync Faceit error:", e); }
                }

                // 2. Quick Steam check (first few)
                if (user.steamId && user.steamMatchAuthCode) {
                    console.log(`[Sync] Attempting Steam sync for user ${userId} (SteamID: ${user.steamId})`);
                    try {
                        const steamMatches = await getSteamMatchHistory(user.steamId, user.steamMatchAuthCode, user.steamLatestMatchCode || '');
                        console.log(`[Sync] Found ${steamMatches.length} Steam matches`);
                        for (const m of steamMatches.slice(0, 20)) {
                            if (m.id === 'sync-ready') {
                                console.log(`[Sync] Steam sync ready (no new matches)`);
                                continue;
                            }
                            if (m.id === 'error-412') {
                                console.warn(`[Sync] Steam sync error 412: Invalid Auth Code`);
                                continue;
                            }
                            await prisma.match.upsert({
                                where: { externalId: m.externalId },
                                update: {},
                                create: { ...m, userId }
                            });
                        }
                    } catch (e) { console.error("Auto-sync Steam error:", e); }
                } else {
                    console.log(`[Sync] Skipping Steam sync for user ${userId}: Missing credentials (SteamID: ${!!user.steamId}, AuthCode: ${!!user.steamMatchAuthCode})`);
                }

                // Final Re-fetch
                matches = await prisma.match.findMany({
                    where: { userId },
                    orderBy: { matchDate: 'desc' }
                });
            }
        }

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
