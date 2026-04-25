
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function deepSearch(dir) {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    try {
        const response = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/list?directory=${encodeURIComponent(dir)}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            }
        });
        
        const items = response.data.data;
        for (const item of items) {
            const name = item.attributes.name;
            if (item.attributes.is_file) {
                if (name.toLowerCase().includes('cbble') || name.toLowerCase().includes('cobble')) {
                    console.log(`ACHEI! Caminho: ${dir}/${name}`);
                }
            } else {
                // If it's a directory, search inside (limit depth to avoid infinite loops)
                if (dir.split('/').length < 6) {
                    await deepSearch(`${dir}/${name}`);
                }
            }
        }
    } catch (e) {
        // Skip errors
    }
}

console.log("Iniciando busca profunda...");
deepSearch('game/csgo/maps');
