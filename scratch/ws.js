const WebSocket = require('ws');

const API_KEY = "ptlc_x18tO5bKZCcBMBLBZL3pAxLUB5bSyjpyrtLeidHUXpc";
const SERVER_ID = "09821a19-3411-4b35-9af5-2aca06a0490a";
const BASE_URL = "https://painel3.firegamesnetwork.com";

async function main() {
    const res = await fetch(`${BASE_URL}/api/client/servers/${SERVER_ID}/websocket`, {
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Accept": "application/json"
        }
    });
    
    if (!res.ok) return;
    
    const creds = await res.json();
    const ws = new WebSocket(creds.data.socket, { origin: BASE_URL });
    
    ws.on('open', () => {
        ws.send(JSON.stringify({ event: 'auth', args: [creds.data.token] }));
    });
    
    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.event === 'auth success') {
            ws.send(JSON.stringify({ event: 'send command', args: ['exec arena.cfg'] }));
            ws.send(JSON.stringify({ event: 'send command', args: ['mp_restartgame 1'] }));
            
            setTimeout(() => {
                ws.close();
                process.exit(0);
            }, 5000);
        } else if (msg.event === 'console output') {
            console.log(msg.args[0]);
        }
    });
}

main();
