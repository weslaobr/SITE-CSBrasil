
const axios = require('axios');
const WebSocket = require('ws');
const dotenv = require('dotenv');
dotenv.config();

async function getLogs() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    try {
        const res = await axios.get(`${panelUrl}/api/client/servers/${serverId}/websocket`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const { data } = res.data;
        const ws = new WebSocket(data.socket);

        ws.on('open', () => {
            ws.send(JSON.stringify({ event: 'auth', args: [data.token] }));
            setTimeout(() => {
                ws.send(JSON.stringify({ event: 'send command', args: ['maps *'] }));
            }, 1000);
        });

        ws.on('message', (buf) => {
            const msg = JSON.parse(buf.toString());
            if (msg.event === 'console output') {
                const line = msg.args[0];
                if (line.toLowerCase().includes('cbble') || line.toLowerCase().includes('cobble') || line.toLowerCase().includes('maps')) {
                    console.log(line);
                }
            }
        });

        setTimeout(() => {
            console.log("Tempo esgotado.");
            ws.close();
            process.exit(0);
        }, 10000);

    } catch (e) {
        console.error("Erro:", e.message);
    }
}

getLogs();
