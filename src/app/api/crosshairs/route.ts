import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (userId) {
            // Get specific user crosshairs
            const crosshairs = await prisma.crosshair.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" }
            });
            return NextResponse.json(crosshairs);
        }

        // Get public community crosshairs
        const crosshairs = await prisma.crosshair.findMany({
            where: { isPublic: true },
            include: {
                user: {
                    select: {
                        name: true,
                        image: true
                    }
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
        const { name, code, description, isPublic } = await req.json();

        if (!name || !code) {
            return NextResponse.json({ error: "Name and Code are required" }, { status: 400 });
        }

        const crosshair = await prisma.crosshair.create({
            data: {
                userId,
                name,
                code,
                description,
                isPublic: isPublic ?? true
            }
        });

        return NextResponse.json(crosshair);
    } catch (error) {
        console.error("[Crosshairs API] POST error:", error);
        return NextResponse.json({ error: "Failed to create crosshair" }, { status: 500 });
    }
}
