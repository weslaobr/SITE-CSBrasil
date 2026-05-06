import { prisma } from '@/lib/prisma';
import { getMixLevelFromPoints } from '@/lib/mix-level';

export interface CalculationResult {
    updatedPlayers: number;
    updatedUsers: number;
    details: any[];
}

export async function calculateMatchTropoints(matchId: string): Promise<CalculationResult> {
    // 1. Verificar se é partida MIX
    const match = await prisma.globalMatch.findUnique({
        where: { id: matchId },
        include: { players: true }
    });

    if (!match) {
        throw new Error('Partida não encontrada');
    }

    // Aceitamos 'mix', 'manual', 'demo' como fontes válidas para Tropoints
    const source = (match.source || '').toLowerCase();
    const validSources = ['mix', 'manual', 'demo', 'local', 'demo-analyzer'];
    
    if (!validSources.includes(source)) {
        throw new Error(`Tropoints só são calculados para partidas MIX/Locais. Fonte atual: ${source}`);
    }

    const players = match.players;
    let updatedUsers = 0;
    const details: any[] = [];

    for (const p of players) {
        const kills   = p.kills   ?? 0;
        const deaths  = p.deaths  ?? 0;
        const adr     = Number(p.adr   ?? 0);
        const mvps    = p.mvps    ?? 0;
        const result  = (p.matchResult ?? '').toLowerCase();

        const metadata = (p.metadata as any) || {};
        const isSub = metadata.isSub === true;
        const isLeaver = metadata.isLeaver === true;

        // ── Cálculo de Tropoints (Fórmula TropaCS) ──────────────────────────
        let newEloChange = 0;

        if (isLeaver) {
            // Penalidade fixa para quem abandonou a partida
            newEloChange = -15;
        } else {
            if (result === 'win' || result === 'vitoria' || result === 'vitória') {
                newEloChange = 15;
            } else if (result === 'loss' || result === 'derrota') {
                newEloChange = -10;
            }

            // Bônus de Performance (apenas em caso de resultado definido)
            if (newEloChange !== 0) {
                // K/D Bonus
                if (kills > deaths)          newEloChange += 2;
                else if (deaths > kills + 3) newEloChange -= 2;
                
                // ADR Bonus
                if (adr > 90)                newEloChange += 3;
                else if (adr < 50)           newEloChange -= 2;
                
                // MVP Bonus
                newEloChange += (mvps * 1);
            }

            // Se for substituto (complete), ganha/perde apenas metade dos pontos
            if (isSub) {
                newEloChange = Math.round(newEloChange * 0.5);
            }
        }

        // ── Atualizar o registro do jogador na partida ───────────────────────
        const oldEloChange = p.eloChange ?? 0;
        await prisma.globalMatchPlayer.update({
            where: { id: p.id },
            data: { eloChange: newEloChange }
        });

        // ── Se o jogador é um usuário cadastrado, atualizar perfil ──────────
        if (p.userId) {
            const diff = newEloChange - oldEloChange;

            // Buscar saldo atual do usuário
            const user = await prisma.user.findUnique({ where: { id: p.userId } });
            if (user) {
                const currentPoints = user.rankingPoints ?? 500;
                const newPoints = Math.max(0, currentPoints + diff);

                // Calcular nível correto usando o utilitário padrão
                const { level: newLevel } = getMixLevelFromPoints(newPoints);

                await prisma.user.update({
                    where: { id: p.userId },
                    data: { 
                        rankingPoints: newPoints, 
                        mixLevel: newLevel 
                    }
                });
                
                details.push({
                    steamId: p.steamId,
                    oldElo: oldEloChange,
                    newElo: newEloChange,
                    userPoints: newPoints,
                    userLevel: newLevel
                });
                updatedUsers++;
            }
        }
    }

    return {
        updatedPlayers: players.length,
        updatedUsers,
        details
    };
}
