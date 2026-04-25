
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function listCSSharpPlugins() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    const path = 'game/csgo/addons/counterstrikesharp/plugins';
    try {
        const res = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/list?directory=${encodeURIComponent(path)}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        console.log(`Plugins em ${path}:`, res.data.data.map(f => f.attributes.name));
    } catch (e) { console.log("Pasta não encontrada."); }
}
listCSSharpPlugins();
