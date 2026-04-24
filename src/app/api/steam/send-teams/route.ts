import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const STEAM_BOT_PORT = process.env.STEAM_BOT_PORT || '8080';
const STEAM_BOT_URL = process.env.STEAM_BOT_URL || `http://localhost:${STEAM_BOT_PORT}`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { teamA, teamB, avgA, avgB } = body;

        if (!teamA || !teamB) {
            return NextResponse.json({ error: 'Dados dos times ausentes' }, { status: 400 });
        }

        // Formatação da mensagem para o chat da Steam (não suporta markdown complexo, mas aceita emojis)
        const message = `
🎮 PARTIDA GERADA - SITE CSBrasil 🎮

🟡 TIME A (Média: ${avgA})
${teamA.map((p: any) => `- ${p.nickname}`).join('\n')}

🔵 TIME B (Média: ${avgB})
${teamB.map((p: any) => `- ${p.nickname}`).join('\n')}

Boa sorte e bom jogo! 🚀
`.trim();

        const allPlayers = [...teamA, ...teamB];
        const results = [];

        // Enviar para todos os jogadores que possuem SteamId e não são "guests"
        for (const player of allPlayers) {
            if (player.steamId && !player.isGuest) {
                try {
                    await axios.post(`${STEAM_BOT_URL}/send-message`, {
                        steamId: player.steamId,
                        message: message
                    });
                    results.push({ nickname: player.nickname, success: true });
                } catch (err: any) {
                    console.error(`❌ Erro ao enviar mensagem Steam para ${player.nickname}:`, err.message);
                    results.push({ nickname: player.nickname, success: false, error: err.message });
                }
            }
        }

        const successCount = results.filter(r => r.success).length;
        
        return NextResponse.json({ 
            success: true, 
            message: `Tentativa de envio concluída (${successCount}/${results.length} sucesso)`,
            results 
        });

    } catch (error: any) {
        console.error('❌ Erro na rota /api/steam/send-teams:', error.message);
        return NextResponse.json({ error: 'Erro ao processar envio de mensagens' }, { status: 500 });
    }
}
