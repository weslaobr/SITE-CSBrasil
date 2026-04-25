
import { NextResponse } from 'next/server';
import WebSocket from 'ws';

// Global cache to avoid rate limiting
let cachedLogs: string[] = [];
let lastFetchTime = 0;
let isFetching = false;

export async function GET() {
    const now = Date.now();
    
    // If we have a recent cache (last 15s), return it immediately
    if (cachedLogs.length > 0 && (now - lastFetchTime) < 15000) {
        return NextResponse.json(cachedLogs);
    }

    // Prevent multiple simultaneous fetches
    if (isFetching) {
        return NextResponse.json(cachedLogs);
    }

    isFetching = true;
    try {
        const authRes = await fetch(`${process.env.PTERODACTYL_PANEL_URL}/api/client/servers/${process.env.PTERODACTYL_SERVER_ID}/websocket`, {
            headers: { 'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}` }
        });
        
        if (!authRes.ok) throw new Error("Pterodactyl Auth Failed");
        
        const { data } = await authRes.json();
        const ws = new WebSocket(data.socket);
        
        await new Promise((resolve) => {
            ws.on('open', () => {
                ws.send(JSON.stringify({ event: 'auth', args: [data.token] }));
            });

            ws.on('message', (buf) => {
                const msg = JSON.parse(buf.toString());
                if (msg.event === 'console output') {
                    cachedLogs.push(msg.args[0]);
                    if (cachedLogs.length > 100) cachedLogs.shift();
                }
            });

            // Wait 2s to collect logs
            setTimeout(() => {
                ws.close();
                lastFetchTime = Date.now();
                resolve(true);
            }, 2000);
        });
    } catch (e) {
        console.error("Erro no Túnel de Logs:", e);
    } finally {
        isFetching = false;
    }

    return NextResponse.json(cachedLogs);
}
