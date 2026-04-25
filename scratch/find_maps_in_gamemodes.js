
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function findMapsInGameModes() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    const path = 'game/csgo/gamemodes_server.txt';
    try {
        const res = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/contents?file=${encodeURIComponent(path)}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const lines = res.data.split('\n');
        for (let line of lines) {
            if (line.toLowerCase().includes('cache') || line.toLowerCase().includes('cbble')) {
                console.log(line.trim());
            }
        }
    } catch (e) { console.log("Erro ao ler."); }
}
findMapsInGameModes();
