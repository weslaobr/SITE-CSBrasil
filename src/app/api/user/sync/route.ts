import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        const userId = (session.user as any).id;

        // Validated fields we allow to update via the sync center
        const updateData: any = {};
        if (data.steamMatchAuthCode !== undefined) updateData.steamMatchAuthCode = data.steamMatchAuthCode;
        if (data.steamLatestMatchCode !== undefined) updateData.steamLatestMatchCode = data.steamLatestMatchCode;
        if (data.faceitNickname !== undefined) updateData.faceitNickname = data.faceitNickname;
        if (data.gcNickname !== undefined) updateData.gcNickname = data.gcNickname;
        if (data.gcLevel !== undefined) updateData.gcLevel = parseInt(data.gcLevel) || null;

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Sync update error:", error);
        return NextResponse.json({ error: "Failed to update sync settings" }, { status: 500 });
    }
}

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
                steamMatchAuthCode: true,
                steamLatestMatchCode: true,
                faceitNickname: true,
                gcNickname: true,
                gcLevel: true
            }
        });

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch sync settings" }, { status: 500 });
    }
}
