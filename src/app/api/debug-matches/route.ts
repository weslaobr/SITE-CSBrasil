
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session) {
            return NextResponse.json({ error: "No session found" });
        }

        const userId = (session.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: "No user ID in session", session });
        }

        const matchCount = await prisma.match.count({
            where: { userId }
        });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, steamId: true, name: true }
        });

        return NextResponse.json({
            userId,
            matchCount,
            user,
            sessionUser: session.user
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}
