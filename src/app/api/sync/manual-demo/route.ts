import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import axios from "axios";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        const { url } = data;

        if (!url || (!url.startsWith('http') && !url.startsWith('CSGO-'))) {
            return NextResponse.json({ error: "URL ou Código de compartilhamento inválido." }, { status: 400 });
        }

        const userId = (session.user as any).id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { steamId: true }
        });

        const pythonApiUrl = process.env.PYTHON_API_URL || 'https://tropacsdemos.discloud.app';
        
        console.log(`[ManualSync] Forwarding demo to analyzer: ${pythonApiUrl}`);
        
        const response = await axios.post(`${pythonApiUrl}/api/importer/import-match`, {
            steamid: user?.steamId || "0",
            auth_code: "manual",
            share_code: url
        }, { timeout: 15000 });

        return NextResponse.json({ success: true, python_response: response.data });
    } catch (error: any) {
        const errorMsg = error.response?.data?.error || error.response?.data || error.message;
        console.error("Manual demo import error:", errorMsg);
        return NextResponse.json({ 
            error: "Falha ao comunicar com o servidor de processamento.",
            details: errorMsg
        }, { status: 500 });
    }
}
