
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function listMaps() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    try {
        console.log("Listando mapas em game/csgo/maps...");
        const response = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/list?directory=game/csgo/maps`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            }
        });
        
        const files = response.data.data;
        const maps = files
            .filter(f => f.attributes.name.endsWith('.vpk'))
            .map(f => f.attributes.name);
        
        console.log("Mapas encontrados:", JSON.stringify(maps, null, 2));
    } catch (e) {
        console.error("Erro ao listar mapas:", e.response ? e.response.status : e.message);
    }
}

listMaps();
