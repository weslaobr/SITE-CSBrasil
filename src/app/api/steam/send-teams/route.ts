import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const STEAM_BOT_PORT = process.env.STEAM_BOT_PORT || '8080';
const STEAM_BOT_URL = process.env.STEAM_BOT_URL || process.env.NEXT_PUBLIC_BOT_API_URL || `http://localhost:${STEAM_BOT_PORT}`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { teamA, teamB, avgA, avgB, mapName, pickMethod } = body;

        if (!teamA || !teamB) {
            return NextResponse.json({ error: 'Dados dos times ausentes' }, { status: 400 });
        }

        const message = `
🎮 PARTIDA GERADA - TropaCS 🎮

🗺️ MAPA: ${mapName || "A definir"} (${pickMethod || "Manual"})

🟡 TIME TR: ${teamA.map((p: any) => p.nickname).join(', ')}
🔵 TIME CT: ${teamB.map((p: any) => p.nickname).join(', ')}

🤖 Adicione o bot para receber o time no privado:
https://steamcommunity.com/id/tropacs

🎭 Skins personalizadas:
https://inventory.cstrike.app/
`.trim();

        const allPlayers = [...teamA, ...teamB];
        const results = [];

        // Verificar se STEAM_BOT_URL é válido
        if (!STEAM_BOT_URL || STEAM_BOT_URL === 'undefined') {
            console.error('❌ [API Steam] STEAM_BOT_URL não configurado corretamente!');
            return NextResponse.json({ 
                error: 'Serviço de Bot Steam não configurado (URL ausente)' 
            }, { status: 500 });
        }

        console.log(`📡 [API Steam] Iniciando envio para ${allPlayers.length} jogadores em: ${STEAM_BOT_URL}`);

        // Enviar para todos os jogadores que possuem SteamId e não são "guests"
        for (const player of allPlayers) {
            if (player.steamId && !String(player.steamId).startsWith('guest_')) {
                try {
                    // Pequeno delay para não sobrecarregar o bot ou ser bloqueado pela Steam
                    await new Promise(resolve => setTimeout(resolve, 300));

                    console.log(`➡️ Enviando para: ${player.nickname} (ID: ${player.steamId})`);
                    
                    const botRes = await axios.post(`${STEAM_BOT_URL}/send-message`, {
                        steamId: player.steamId,
                        message: message
                    }, {
                        timeout: 5000 // 5 segundos de timeout para cada envio
                    });

                    results.push({ nickname: player.nickname, success: true, data: botRes.data });
                    console.log(`✅ Sucesso para ${player.nickname}`);
                } catch (err: any) {
                    const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message;
                    const relationship = err.response?.data?.relationship;
                    
                    console.error(`❌ Erro para ${player.nickname}:`, errorMsg);
                    
                    results.push({ 
                        nickname: player.nickname, 
                        success: false, 
                        error: errorMsg,
                        relationship: relationship,
                        status: err.response?.status
                    });
                }
            } else {
                console.log(`⏩ Pulando ${player.nickname} (Convidado ou sem SteamID)`);
            }
        }

        const successCount = results.filter(r => r.success).length;
        const totalAttempts = results.length;
        
        if (successCount === 0 && totalAttempts > 0) {
            return NextResponse.json({ 
                success: false, 
                message: 'Nenhuma mensagem pôde ser enviada. Verifique se o bot está online e logado.',
                results 
            }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: `Processamento concluído (${successCount}/${totalAttempts} enviadas)`,
            results 
        });

    } catch (error: any) {
        console.error('❌ Erro crítico na rota /api/steam/send-teams:', error.message);
        return NextResponse.json({ 
            error: 'Erro interno ao processar envio',
            details: error.message 
        }, { status: 500 });
    }
}
