import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const STEAM_BOT_PORT = process.env.STEAM_BOT_PORT || '8080';
const STEAM_BOT_URL = process.env.STEAM_BOT_URL || process.env.NEXT_PUBLIC_BOT_API_URL || `http://localhost:${STEAM_BOT_PORT}`;

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

        console.log(`📡 [API Steam] Iniciando envio para ${allPlayers.length} jogadores em: ${STEAM_BOT_URL}`);

        // Enviar para todos os jogadores que possuem SteamId e não são "guests"
        for (const player of allPlayers) {
            if (player.steamId && !player.isGuest) {
                try {
                    // Pequeno delay para não sobrecarregar o bot ou ser bloqueado pela Steam
                    await new Promise(resolve => setTimeout(resolve, 500));

                    console.log(`➡️ Enviando para: ${player.nickname} (ID: ${player.steamId}, Tipo: ${typeof player.steamId})`);
                    const botRes = await axios.post(`${STEAM_BOT_URL}/send-message`, {
                        steamId: player.steamId,
                        message: message
                    });
                    results.push({ nickname: player.nickname, success: true, data: botRes.data });
                    console.log(`✅ Sucesso para ${player.nickname}:`, botRes.data.message || 'OK');
                } catch (err: any) {
                    const errorMsg = err.response?.data?.error || err.message;
                    const relationship = err.response?.data?.relationship;
                    console.error(`❌ Erro para ${player.nickname}:`, errorMsg, relationship ? `(Rel: ${relationship})` : '');
                    results.push({ 
                        nickname: player.nickname, 
                        success: false, 
                        error: errorMsg,
                        relationship: relationship 
                    });
                }
            } else {
                console.log(`⏩ Pulando ${player.nickname} (Guest ou sem SteamID)`);
            }
        }

        const successCount = results.filter(r => r.success).length;
        
        if (successCount === 0 && allPlayers.length > 0) {
            return NextResponse.json({ 
                success: false, 
                message: 'Nenhuma mensagem pôde ser enviada. Verifique se o bot está online e se os jogadores são amigos dele.',
                results 
            }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: `Tentativa de envio concluída (${successCount}/${results.length} sucesso)`,
            results 
        });

    } catch (error: any) {
        console.error('❌ Erro crítico na rota /api/steam/send-teams:', error.message);
        return NextResponse.json({ error: 'Erro ao processar envio de mensagens' }, { status: 500 });
    }
}
