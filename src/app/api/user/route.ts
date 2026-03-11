import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                faceitNickname: true,
                steamMatchAuthCode: true,
                steamLatestMatchCode: true,
            }
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("User Fetch Error:", error);
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}
