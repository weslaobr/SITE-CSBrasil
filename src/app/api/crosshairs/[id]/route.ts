import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { id } = params;
        const { previewColor, previewSize, previewGap, previewThick, previewDot } = await req.json();

        // Only allow owner to update
        const existing = await (prisma as any).crosshair.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ error: "Not found or forbidden" }, { status: 403 });
        }

        const updated = await (prisma as any).crosshair.update({
            where: { id },
            data: { previewColor, previewSize, previewGap, previewThick, previewDot }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[Crosshairs API] PATCH error:", error);
        return NextResponse.json({ error: "Failed to update crosshair" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { id } = params;

        const existing = await (prisma as any).crosshair.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ error: "Not found or forbidden" }, { status: 403 });
        }

        await (prisma as any).crosshair.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Crosshairs API] DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete crosshair" }, { status: 500 });
    }
}
