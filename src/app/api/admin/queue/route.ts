import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import axios from "axios";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !(session.user as any)?.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const pythonApiUrl = process.env.PYTHON_API_URL || 'https://tropacsdemos.discloud.app';
        
        // Tentamos buscar a fila do analisador
        // Se o endpoint for diferente, o admin poderá ajustar depois
        try {
            const response = await axios.get(`${pythonApiUrl}/api/queue`, { timeout: 5000 });
            return NextResponse.json(response.data);
        } catch (queueErr: any) {
            // Fallback para /api/status caso /api/queue não exista
            try {
                const response = await axios.get(`${pythonApiUrl}/api/status`, { timeout: 5000 });
                return NextResponse.json(response.data);
            } catch (statusErr: any) {
                console.error("Failed to fetch queue from analyzer:", statusErr.message);
                return NextResponse.json({ 
                    error: "Não foi possível conectar ao serviço de processamento.",
                    details: statusErr.message,
                    queue: [],
                    active: []
                }, { status: 502 });
            }
        }
    } catch (error: any) {
        console.error("Admin queue API error:", error.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
