
import { NextResponse } from 'next/server';
import WebSocket from 'ws';

// Persist logs in memory for 15s cache
let cachedLogs: string[] = [];
let lastFetch = 0;

export async function GET() {
    const now = Date.now();
    
    // Refresh every 5s
    if (now - lastFetch > 5000) {
        lastFetch = now;
        const newLogs: string[] = [];
        
        try {
            const authRes = await fetch(`${process.env.PTERODACTYL_PANEL_URL}/api/client/servers/${process.env.PTERODACTYL_SERVER_ID}/websocket`, {
                headers: { 'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}` }
            });
            const { data } = await authRes.json();

            const ws = new WebSocket(data.socket);
            
            await new Promise((resolve) => {
                ws.on('open', () => {
                    ws.send(JSON.stringify({ event: 'auth', args: [data.token] }));
                    ws.send(JSON.stringify({ event: 'send command', args: ['status'] }));
                });

                ws.on('message', (buf) => {
                    try {
                        const msg = JSON.parse(buf.toString());
                        if (msg.event === 'console output') {
                            newLogs.push(msg.args[0]);
                        }
                    } catch (e) {}
                });

                // Stay for 3s then return only NEW logs
                setTimeout(() => {
                    ws.close();
                    if (newLogs.length > 0) cachedLogs = newLogs;
                    resolve(true);
                }, 3000);
            });
        } catch (e) {
            console.error("Erro no Túnel:", e);
        }
    }

    return NextResponse.json(cachedLogs);
}
