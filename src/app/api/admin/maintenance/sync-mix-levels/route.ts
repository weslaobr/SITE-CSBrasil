import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { getMixLevelFromPoints } from '@/lib/mix-level';

/**
 * POST /api/admin/maintenance/sync-mix-levels
 * 
 * Percorre todos os usuários e atualiza o mixLevel no banco de dados
 * de acordo com os rankingPoints atuais, usando a lógica padrão.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(getAuthOptions());
    if (!(session?.user as any)?.isAdmin) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    try {
        const users = await prisma.user.findMany({
            select: { id: true, rankingPoints: true, mixLevel: true }
        });

        let updatedCount = 0;
        const updates = [];

        for (const user of users) {
            const currentPoints = user.rankingPoints ?? 500;
            const correctLevel = getMixLevelFromPoints(currentPoints).level;

            if (user.mixLevel !== correctLevel) {
                updates.push(
                    prisma.user.update({
                        where: { id: user.id },
                        data: { mixLevel: correctLevel }
                    })
                );
                updatedCount++;
            }
        }

        if (updates.length > 0) {
            await Promise.all(updates);
        }

        return NextResponse.json({
            success: true,
            message: `Sincronização concluída. ${updatedCount} usuários tiveram o nível corrigido.`,
            totalUsers: users.length,
            updatedUsers: updatedCount
        });
    } catch (error: any) {
        console.error("[Maintenance] Sync Mix Levels Error:", error);
        return NextResponse.json({ error: 'Falha ao sincronizar níveis' }, { status: 500 });
    }
}
