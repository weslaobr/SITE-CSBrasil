
import { NextResponse } from 'next/server';
import WebSocket from 'ws';

// Use a global variable to persist logs between requests (simple cache)
let logBuffer: string[] = [];
let lastFetch = 0;

export async function GET() {
    const now = Date.now();
    
    // To avoid creating too many connections, we'll only refresh if last fetch was > 2s ago
    if (now - lastFetch > 2000) {
        lastFetch = now;
        try {
            // 1. Get WS Credentials from Pterodactyl
            const authRes = await fetch(`${process.env.PTERODACTYL_PANEL_URL}/api/client/servers/${process.env.PTERODACTYL_SERVER_ID}/websocket`, {
                headers: { 'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}` }
            });
            const { data } = await authRes.json();

            // 2. Connect via WS in the backend (No browser blocks here!)
            const ws = new WebSocket(data.socket);
            
            await new Promise((resolve) => {
                ws.on('open', () => {
                    ws.send(JSON.stringify({ event: 'auth', args: [data.token] }));
                });

                ws.on('message', (buf) => {
                    const msg = JSON.parse(buf.toString());
                    if (msg.event === 'console output') {
                        logBuffer.push(msg.args[0]);
                        if (logBuffer.length > 200) logBuffer.shift();
                    }
                });

                // Wait 1.5s to gather some logs then close
                setTimeout(() => {
                    ws.close();
                    resolve(true);
                }, 1500);
            });
        } catch (e) {
            console.error("Erro no Túnel de Logs:", e);
        }
    }

    return NextResponse.json(logBuffer);
}
