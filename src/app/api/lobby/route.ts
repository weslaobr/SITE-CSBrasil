import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const lobbies = await prisma.lobby.findMany({
            where: { status: { in: ["waiting", "picking"] } },
            include: {
                creator: { select: { name: true, image: true } },
                _count: { select: { players: true } }
            },
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json(lobbies);
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

        const { name, password } = await req.json();
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        const userId = (session.user as any).id;

        const lobby = await prisma.lobby.create({
            data: {
                name,
                password,
                creatorId: userId,
                players: {
                    create: {
                        userId: userId,
                        isLeader: true,
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
