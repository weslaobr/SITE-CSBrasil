import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Middleware for admin check
async function isAdmin(req: NextRequest) {
    const session = await getServerSession(getAuthOptions(req));
    return session?.user && (session.user as any).isAdmin;
}

export async function GET(req: NextRequest) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const matches = await prisma.globalMatch.findMany({
            include: {
                players: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                image: true,
                                steamId: true
                            }
                        }
                    }
                }
            },
            orderBy: { matchDate: 'desc' }
        });

        return NextResponse.json({ matches });
    } catch (error) {
        console.error("[Admin Matches GET] Error:", error);
        return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Missing match ID" }, { status: 400 });
        }

        await prisma.globalMatch.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Admin Matches DELETE] Error:", error);
        return NextResponse.json({ error: "Failed to delete match" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, scoreA, scoreB, mapName } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "Missing match ID" }, { status: 400 });
        }

        const updatedMatch = await prisma.globalMatch.update({
            where: { id },
            data: {
                scoreA: scoreA !== undefined ? parseInt(scoreA) : undefined,
                scoreB: scoreB !== undefined ? parseInt(scoreB) : undefined,
                mapName: mapName || undefined
            }
        });

        return NextResponse.json({ success: true, match: updatedMatch });
    } catch (error) {
        console.error("[Admin Matches PATCH] Error:", error);
        return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
    }
}
