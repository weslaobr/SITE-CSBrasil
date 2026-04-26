import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (userId) {
            const crosshairs = await (prisma as any).crosshair.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" }
            });
            return NextResponse.json(crosshairs);
        }

        const crosshairs = await (prisma as any).crosshair.findMany({
            where: { isPublic: true },
            include: {
                user: {
                    select: { name: true, image: true }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 50
        });

        return NextResponse.json(crosshairs);
    } catch (error) {
        console.error("[Crosshairs API] GET error:", error);
        return NextResponse.json({ error: "Failed to fetch crosshairs" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const {
            name, code, description, isPublic,
            previewColor, previewSize, previewGap, previewThick, previewDot
        } = await req.json();

        if (!name || !code) {
            return NextResponse.json({ error: "Name and Code are required" }, { status: 400 });
        }

        const crosshair = await (prisma as any).crosshair.create({
            data: {
                userId,
                name,
                code,
                description,
                isPublic: isPublic ?? true,
                previewColor: previewColor ?? '#00ff00',
                previewSize: previewSize ?? 5,
                previewGap: previewGap ?? 0,
                previewThick: previewThick ?? 1,
                previewDot: previewDot ?? false,
            }
        });

        return NextResponse.json(crosshair);
    } catch (error) {
        console.error("[Crosshairs API] POST error:", error);
        return NextResponse.json({ error: "Failed to create crosshair" }, { status: 500 });
    }
}
