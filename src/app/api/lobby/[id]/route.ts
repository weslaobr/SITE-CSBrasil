import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLAYER_SELECT = {
    id: true, name: true, image: true,
    steamId: true, cs2Rank: true, gcLevel: true,
    adr: true, hsPercentage: true, winRate: true, faceitNickname: true
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const lobby = await prisma.lobby.findUnique({
            where: { id },
            include: {
                creator: { select: PLAYER_SELECT },
                players: {
                    include: { user: { select: PLAYER_SELECT } },
                    orderBy: { joinedAt: "asc" }
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
        if (!session || !(session.user as any)?.id)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = (session.user as any).id;
        const { action, targetUserId, password, choice } = await req.json();

        const lobby = await prisma.lobby.findUnique({
            where: { id },
            include: { players: true }
        });
        if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });

        const isOwner = lobby.creatorId === userId;
        const isLeaderA = lobby.leaderAId === userId;
        const isLeaderB = lobby.leaderBId === userId;

        switch (action) {
            // ── JOIN ────────────────────────────────────────────────────────
            case "join":
                if (lobby.status === "finished") return NextResponse.json({ error: "Lobby already finished" }, { status: 400 });
                if (lobby.players.length >= 10) return NextResponse.json({ error: "Lobby is full" }, { status: 400 });
                if (lobby.password && lobby.password !== password)
                    return NextResponse.json({ error: "Invalid password" }, { status: 403 });
                await prisma.lobbyPlayer.upsert({
                    where: { lobbyId_userId: { lobbyId: id, userId } },
                    update: {},
                    create: { lobbyId: id, userId, team: "none" }
                });
                break;

            // ── LEAVE ───────────────────────────────────────────────────────
            case "leave":
                await prisma.lobbyPlayer.deleteMany({ where: { lobbyId: id, userId } });
                const leaderUpdates: any = {};
                if (lobby.leaderAId === userId) leaderUpdates.leaderAId = null;
                if (lobby.leaderBId === userId) leaderUpdates.leaderBId = null;
                if (Object.keys(leaderUpdates).length) await prisma.lobby.update({ where: { id }, data: leaderUpdates });
                break;

            // ── SET LEADERS ─────────────────────────────────────────────────
            case "setLeaderA":
                if (!isOwner) return NextResponse.json({ error: "Only owner can set leaders" }, { status: 403 });
                await prisma.lobby.update({ where: { id }, data: { leaderAId: targetUserId } });
                await prisma.lobbyPlayer.update({
                    where: { lobbyId_userId: { lobbyId: id, userId: targetUserId } },
                    data: { isLeader: true, team: "A" }
                });
                break;

            case "setLeaderB":
                if (!isOwner) return NextResponse.json({ error: "Only owner can set leaders" }, { status: 403 });
                await prisma.lobby.update({ where: { id }, data: { leaderBId: targetUserId } });
                await prisma.lobbyPlayer.update({
                    where: { lobbyId_userId: { lobbyId: id, userId: targetUserId } },
                    data: { isLeader: true, team: "B" }
                });
                break;

            // ── RPS TOGGLE ──────────────────────────────────────────────────
            case "setRpsEnabled":
                if (!isOwner) return NextResponse.json({ error: "Only owner can toggle RPS" }, { status: 403 });
                await prisma.lobby.update({ where: { id }, data: { rpsEnabled: !!choice } });
                break;

            // ── RPS CHOICE ──────────────────────────────────────────────────
            case "rpsChoice": {
                if (lobby.status !== "rps") return NextResponse.json({ error: "Not in RPS phase" }, { status: 400 });
                if (!isLeaderA && !isLeaderB) return NextResponse.json({ error: "Only leaders can play RPS" }, { status: 403 });
                if (!["rock", "paper", "scissors"].includes(choice))
                    return NextResponse.json({ error: "Invalid choice" }, { status: 400 });

                const side = isLeaderA ? "A" : "B";
                const lobbyAny = lobby as any;
                const current: any = lobbyAny.rpsState ? JSON.parse(lobbyAny.rpsState) : {};
                current[side] = choice;

                // Check if both chose
                if (current.A && current.B) {
                    const beats: Record<string, string> = { rock: "scissors", paper: "rock", scissors: "paper" };
                    let winner: string | null = null;
                    if (current.A === current.B) {
                        // Draw — reset choices
                        current.A = null; current.B = null; current.result = "draw";
                    } else {
                        winner = beats[current.A] === current.B ? "A" : "B";
                        current.result = winner;
                    }
                    await prisma.lobby.update({
                        where: { id },
                        data: {
                            rpsState: JSON.stringify(current),
                            ...(winner ? { status: "picking", turn: winner } : {})
                        }
                    });
                } else {
                    await prisma.lobby.update({ where: { id }, data: { rpsState: JSON.stringify(current) } });
                }
                break;
            }

            // ── PICK ────────────────────────────────────────────────────────
            case "pick": {
                if (!isLeaderA && !isLeaderB) return NextResponse.json({ error: "Only leaders can pick" }, { status: 403 });
                if ((lobby.turn === "A" && !isLeaderA) || (lobby.turn === "B" && !isLeaderB))
                    return NextResponse.json({ error: "Not your turn" }, { status: 403 });

                await prisma.lobbyPlayer.update({
                    where: { lobbyId_userId: { lobbyId: id, userId: targetUserId } },
                    data: { team: lobby.turn }
                });
                await prisma.lobby.update({ where: { id }, data: { turn: lobby.turn === "A" ? "B" : "A" } });
                break;
            }

            // ── CHOOSE OWN TEAM (auto-join) ──────────────────────────────────
            case "chooseTeam": {
                if (lobby.status !== "picking") return NextResponse.json({ error: "Not in picking phase" }, { status: 400 });
                const side = choice === "A" || choice === "B" ? choice : null;
                if (!side) return NextResponse.json({ error: "Invalid team" }, { status: 400 });
                const teamCount = lobby.players.filter((p: any) => p.team === side).length;
                if (teamCount >= 5) return NextResponse.json({ error: "Team is full" }, { status: 400 });
                await prisma.lobbyPlayer.update({
                    where: { lobbyId_userId: { lobbyId: id, userId } },
                    data: { team: side }
                });
                break;
            }

            // ── START ────────────────────────────────────────────────────────
            case "start":
                if (!isOwner) return NextResponse.json({ error: "Only owner can start" }, { status: 403 });
                if (!lobby.leaderAId || !lobby.leaderBId)
                    return NextResponse.json({ error: "Need two captains before starting" }, { status: 400 });
                const nextStatus = (lobby as any).rpsEnabled ? "rps" : "picking";
                await prisma.lobby.update({
                    where: { id },
                    data: {
                        status: nextStatus,
                        rpsState: nextStatus === "rps" ? JSON.stringify({ A: null, B: null, result: null }) : undefined
                    }
                });
                break;

            // ── FINISH ───────────────────────────────────────────────────────
            case "finish":
                if (!isOwner) return NextResponse.json({ error: "Only owner can finish" }, { status: 403 });
                await prisma.lobby.update({ where: { id }, data: { status: "finished" } });
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
        if (!session || !(session.user as any)?.id)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = (session.user as any).id;
        const lobby = await prisma.lobby.findUnique({ where: { id } });
        if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
        if (lobby.creatorId !== userId) return NextResponse.json({ error: "Only creator can delete" }, { status: 403 });

        await prisma.lobby.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete lobby" }, { status: 500 });
    }
}
