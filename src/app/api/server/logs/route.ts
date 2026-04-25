
import { NextResponse } from 'next/server';
import WebSocket from 'ws';

// Persist logs in memory
let logBuffer: string[] = [];
let lastFetch = 0;

export async function GET() {
    const now = Date.now();
    
    // Refresh buffer if more than 5s passed
    if (now - lastFetch > 5000) {
        lastFetch = now;
        try {
            const authRes = await fetch(`${process.env.PTERODACTYL_PANEL_URL}/api/client/servers/${process.env.PTERODACTYL_SERVER_ID}/websocket`, {
                headers: { 'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}` }
            });
            const { data } = await authRes.json();

            const ws = new WebSocket(data.socket);
            
            await new Promise((resolve) => {
                ws.on('open', () => {
                    ws.send(JSON.stringify({ event: 'auth', args: [data.token] }));
                    // Request status as soon as we connect to ensure it appears in THIS tunnel session
                    ws.send(JSON.stringify({ event: 'send command', args: ['status'] }));
                });

                ws.on('message', (buf) => {
                    const msg = JSON.parse(buf.toString());
                    if (msg.event === 'console output') {
                        const line = msg.args[0];
                        logBuffer.push(line);
                        if (logBuffer.length > 300) logBuffer.shift();
                    }
                });

                // Stay connected for 4 seconds to catch the 'status' output
                setTimeout(() => {
                    ws.close();
                    resolve(true);
                }, 4000);
            });
        } catch (e) {}
    }

    return NextResponse.json(logBuffer);
}
