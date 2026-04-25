
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function deepList(dir, depth = 0) {
    if (depth > 3) return;
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    try {
        const response = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/list?directory=${encodeURIComponent(dir)}`, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
        });
        
        const items = response.data.data;
        for (const item of items) {
            const name = item.attributes.name;
            const fullPath = `${dir}/${name}`;
            if (item.attributes.is_file) {
                if (name.toLowerCase().includes('cache') || name.toLowerCase().includes('cbble') || name.toLowerCase().includes('united')) {
                    console.log(`ENCONTRADO: ${fullPath}`);
                }
            } else {
                await deepList(fullPath, depth + 1);
            }
        }
    } catch (e) {}
}

console.log("Iniciando busca profunda...");
deepList('game/csgo/maps');
deepList('game/csgo/workshop');
