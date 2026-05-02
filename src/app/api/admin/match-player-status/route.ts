import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const session = await getServerSession(getAuthOptions(request));

    if (!session || !(session.user as any)?.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { matchId, steamId, field, value } = await request.json();

        if (!matchId || !steamId || !field) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (field !== 'isSub' && field !== 'isLeaver') {
            return NextResponse.json({ error: "Invalid field" }, { status: 400 });
        }

        // Find the player record
        const player = await prisma.globalMatchPlayer.findUnique({
            where: {
                globalMatchId_steamId: {
                    globalMatchId: matchId,
                    steamId: steamId
                }
            }
        });

        if (!player) {
            return NextResponse.json({ error: "Player not found" }, { status: 404 });
        }

        const currentMetadata = (player.metadata as any) || {};
        const updatedMetadata = {
            ...currentMetadata,
            [field]: value
        };

        await prisma.globalMatchPlayer.update({
            where: {
                globalMatchId_steamId: {
                    globalMatchId: matchId,
                    steamId: steamId
                }
            },
            data: {
                metadata: updatedMetadata
            }
        });

        return NextResponse.json({ success: true, metadata: updatedMetadata });
    } catch (error: any) {
        console.error(`[POST MatchPlayerStatus Error]`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
