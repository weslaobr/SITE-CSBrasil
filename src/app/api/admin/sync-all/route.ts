import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncUserMatches } from "@/services/sync-service";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * Endpoint para sincronização global de todos os usuários.
 * Pode ser chamado por um Cron Job ou pelo Worker do Go.
 */
export async function GET(req: NextRequest) {
    // 1. Verificação de Segurança
    // Permitimos apenas Admin ou chamadas com um TOKEN secreto no header
    const session = await getServerSession(getAuthOptions(req));
    const authHeader = req.headers.get("x-sync-token");
    const isSecretValid = authHeader === process.env.SYNC_SECRET_TOKEN;

    if (!isSecretValid && (!session || !(session.user as any)?.isAdmin)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 2. Buscar usuários que podem ser sincronizados
        // Priorizamos usuários que estão ativos no ranking ou têm códigos Steam vinculados
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { steamMatchAuthCode: { not: null } },
                    { steamId: { not: null } }
                ]
            },
            select: {
                id: true,
                steamId: true,
                name: true
            }
        });

        console.log(`[SyncAll] Iniciando sincronização para ${users.length} usuários...`);

        const results = [];
        // Processamos em lotes para não sobrecarregar as APIs
        for (const user of users) {
            if (!user.steamId) continue;
            
            try {
                console.log(`[SyncAll] Sincronizando ${user.name} (${user.steamId})...`);
                const syncedCount = await syncUserMatches(user.steamId);
                results.push({
                    userId: user.id,
                    name: user.name,
                    status: "success",
                    newMatches: syncedCount
                });
            } catch (err: any) {
                console.warn(`[SyncAll] Falha ao sincronizar usuário ${user.id}:`, err.message);
                results.push({
                    userId: user.id,
                    name: user.name,
                    status: "failed",
                    error: err.message
                });
            }
            
            // Pequeno delay entre usuários para evitar rate limits das APIs externas
            await new Promise(r => setTimeout(r, 1000));
        }

        return NextResponse.json({
            success: true,
            totalUsers: users.length,
            processed: results.length,
            details: results
        });

    } catch (error: any) {
        console.error("[SyncAll] Erro crítico:", error);
        return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
    }
}
