import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const lobbies = await prisma.lobby.findMany({
            where: { status: { in: ["waiting", "picking"] } },
            include: {
                User: { select: { name: true, image: true } },
                _count: { select: { LobbyPlayer: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        const formattedLobbies = lobbies.map((l: any) => ({
            ...l,
            creator: l.User,
            _count: {
                players: l._count.LobbyPlayer
            }
        }));

        return NextResponse.json(formattedLobbies);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch lobbies" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, password, rpsEnabled } = await req.json();
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        const userId = (session.user as any).id;

        const lobby = await prisma.lobby.create({
            data: {
                name,
                password: password || null,
                rpsEnabled: !!rpsEnabled,
                creatorId: userId,
                LobbyPlayer: {
                    create: {
                        id: `lp_${Date.now()}_${userId}`,
                        userId: userId,
                        isLeader: false,
                        team: "none"
                    }
                }
            }
        });

        return NextResponse.json(lobby);
    } catch (error) {
        console.error("Lobby Creation Error:", error);
        return NextResponse.json({ error: "Failed to create lobby" }, { status: 500 });
    }
}
