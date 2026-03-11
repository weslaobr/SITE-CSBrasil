import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const lobby = await prisma.lobby.findUnique({
            where: { id },
            include: {
                creator: true,
                players: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                cs2Rank: true,
                                adr: true,
                                gcLevel: true
                            }
                        }
                    }
                }
            }
        });

        if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });

        return NextResponse.json(lobby);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch lobby" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(getAuthOptions(req));
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { action, targetUserId, password } = await req.json();

        const lobby = await prisma.lobby.findUnique({
            where: { id },
            include: { players: true }
        });

        if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });

        // Password Check for joining
        if (action === "join" && lobby.password && lobby.password !== password) {
            return NextResponse.json({ error: "Invalid password" }, { status: 403 });
        }

        switch (action) {
            case "join":
                if (lobby.players.length >= 10) return NextResponse.json({ error: "Lobby is full" }, { status: 400 });
                await prisma.lobbyPlayer.upsert({
                    where: { lobbyId_userId: { lobbyId: lobby.id, userId } },
                    update: {},
                    create: { lobbyId: lobby.id, userId, team: "none" }
                });
                break;

            case "leave":
                const playerLeaving = lobby.players.find((p: any) => p.userId === userId);
                if (!playerLeaving) break;

                await prisma.lobbyPlayer.delete({
                    where: { lobbyId_userId: { lobbyId: lobby.id, userId } }
                });

                // Reset leader if they leave
                if (lobby.leaderAId === userId) await prisma.lobby.update({ where: { id: lobby.id }, data: { leaderAId: null } });
                if (lobby.leaderBId === userId) await prisma.lobby.update({ where: { id: lobby.id }, data: { leaderBId: null } });

                // If creator leaves and no one else is there, optionally delete (keeping simple for now)
                break;

            case "setLeader":
                if (lobby.creatorId !== userId) return NextResponse.json({ error: "Only creator can set leaders" }, { status: 403 });
                const team = targetUserId === lobby.leaderAId ? "none" : (lobby.leaderAId ? "B" : "A");
                await prisma.lobby.update({
                    where: { id: lobby.id },
                    data: {
                        [team === "A" ? "leaderAId" : "leaderBId"]: targetUserId
                    }
                });
                await prisma.lobbyPlayer.update({
                    where: { lobbyId_userId: { lobbyId: lobby.id, userId: targetUserId } },
                    data: { isLeader: true, team }
                });
                break;

            case "pick":
                const isLeaderA = lobby.leaderAId === userId;
                const isLeaderB = lobby.leaderBId === userId;
                if (!isLeaderA && !isLeaderB) return NextResponse.json({ error: "Only leaders can pick" }, { status: 403 });

                const currentTurn = lobby.turn;
                if ((currentTurn === "A" && !isLeaderA) || (currentTurn === "B" && !isLeaderB)) {
                    return NextResponse.json({ error: "Not your turn" }, { status: 403 });
                }

                await prisma.lobbyPlayer.update({
                    where: { lobbyId_userId: { lobbyId: lobby.id, userId: targetUserId } },
                    data: { team: currentTurn }
                });

                await prisma.lobby.update({
                    where: { id: lobby.id },
                    data: { turn: currentTurn === "A" ? "B" : "A" }
                });
                break;

            case "start":
                if (lobby.creatorId !== userId) return NextResponse.json({ error: "Only creator can start" }, { status: 403 });
                if (lobby.players.length < 1) return NextResponse.json({ error: "Need at least 1 player" }, { status: 400 });

                await prisma.lobby.update({
                    where: { id: lobby.id },
                    data: { status: "picking" } // Transition to picking state
                });
                break;

            case "addBots":
                if (lobby.creatorId !== userId) return NextResponse.json({ error: "Only creator can add bots" }, { status: 403 });
                const currentCount = lobby.players.length;
                const needed = 10 - currentCount;
                if (needed <= 0) return NextResponse.json({ error: "Lobby is full" }, { status: 400 });

                for (let i = 0; i < needed; i++) {
                    const botName = `Bot_${Math.random().toString(36).substring(7)}`;
                    const botUser = await prisma.user.create({
                        data: {
                            name: botName,
                            gcLevel: Math.floor(Math.random() * 11) + 10, // LVL 10-20
                        }
                    });
                    await prisma.lobbyPlayer.create({
                        data: {
                            lobbyId: lobby.id,
                            userId: botUser.id,
                            team: "none"
                        }
                    });
                }
                break;

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Lobby Action Error:", error);
        return NextResponse.json({ error: "Failed to process action" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(getAuthOptions(req));
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const lobby = await prisma.lobby.findUnique({
            where: { id }
        });

        if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
        if (lobby.creatorId !== userId) return NextResponse.json({ error: "Only creator can delete" }, { status: 403 });

        await prisma.lobby.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Lobby Deletion Error:", error);
        return NextResponse.json({ error: "Failed to delete lobby" }, { status: 500 });
    }
}
