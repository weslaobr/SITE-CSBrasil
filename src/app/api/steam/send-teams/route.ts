import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const STEAM_BOT_PORT = process.env.STEAM_BOT_PORT || '3005';
// STEAM_BOT_URL deve apontar para o bot local (ex: http://localhost:3005) ou uma URL pública se hospedado
const STEAM_BOT_URL = process.env.STEAM_BOT_URL || process.env.NEXT_PUBLIC_BOT_API_URL || `http://localhost:${STEAM_BOT_PORT}`;

// Necessário para evitar timeout do Next.js em requisições longas (10 jogadores * delay)
export const maxDuration = 60; // segundos

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { teamA, teamB, avgA, avgB, mapName, pickMethod, balanceMode } = body;

        if (!teamA || !teamB) {
            return NextResponse.json({ error: 'Dados dos times ausentes' }, { status: 400 });
        }

        const ratingLabel = balanceMode === "resenha" ? "★" : "SR";
        const getPScore = (p: any) => balanceMode === "resenha" 
            ? (p.tempResenhaRating !== undefined ? p.tempResenhaRating : (p.resenhaRating || 5)).toFixed(1)
            : (p.tempRating !== undefined ? p.tempRating : p.rating);

        const message = `
🎮 PARTIDA GERADA - TropaCS 🎮

🗺️ MAPA: ${mapName || "A definir"}
🎲 MÉTODO: ${pickMethod || "Manual"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 TIME TR: (Média: ${avgA} ${ratingLabel})
${teamA.map((p: any) => `• ${p.nickname.padEnd(14)} [${getPScore(p)}]`).join('\n')}

🔵 TIME CT: (Média: ${avgB} ${ratingLabel})
${teamB.map((p: any) => `• ${p.nickname.padEnd(14)} [${getPScore(p)}]`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 ADICIONE O BOT PARA RECEBER TIMES:
https://steamcommunity.com/id/tropacs

🎭 SKINS PERSONALIZADAS:
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
                        timeout: 10000 // 10 segundos de timeout para cada envio
                    });

                    results.push({ nickname: player.nickname, success: true, data: botRes.data });
                    console.log(`✅ Sucesso para ${player.nickname}`);
                } catch (err: any) {
                    const status = err.response?.status;
                    const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message;
                    const relationship = err.response?.data?.relationship;
                    
                    // Se o bot está offline (ECONNREFUSED), para o loop inteiro - não adianta tentar os outros
                    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
                        console.error(`🔴 Bot Steam inacessível em ${STEAM_BOT_URL}:`, err.message);
                        results.push({ nickname: player.nickname, success: false, error: 'Bot Steam offline ou inacessível', botOffline: true });
                        // Adiciona todos os jogadores restantes como falha e encerra
                        for (const remaining of allPlayers.slice(allPlayers.indexOf(player) + 1)) {
                            if (remaining.steamId && !String(remaining.steamId).startsWith('guest_')) {
                                results.push({ nickname: remaining.nickname, success: false, error: 'Bot Steam offline', botOffline: true });
                            }
                        }
                        break;
                    }

                    console.error(`❌ Erro para ${player.nickname} (HTTP ${status}):`, errorMsg);
                    
                    results.push({ 
                        nickname: player.nickname, 
                        success: false, 
                        error: errorMsg,
                        relationship: relationship,
                        status: status
                    });
                }
            } else {
                console.log(`⏩ Pulando ${player.nickname} (Convidado ou sem SteamID)`);
            }
        }

        const successCount = results.filter(r => r.success).length;
        const totalAttempts = results.length;
        
        const botOffline = results.some((r: any) => r.botOffline);
        
        if (botOffline) {
            return NextResponse.json({ 
                success: false, 
                message: `❌ Bot Steam offline! Execute "npm run bot" localmente e tente novamente.\nURL configurada: ${STEAM_BOT_URL}`,
                results 
            }, { status: 503 });
        }

        if (successCount === 0 && totalAttempts > 0) {
            return NextResponse.json({ 
                success: false, 
                message: 'Nenhuma mensagem pôde ser enviada. Verifique se o bot está online e os jogadores são amigos do bot.',
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
