
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function readGameModesServer() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    const path = 'game/csgo/gamemodes_server.txt';
    try {
        const res = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/contents?file=${encodeURIComponent(path)}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        console.log(res.data);
    } catch (e) { console.log("Arquivo não encontrado."); }
}
readGameModesServer();
