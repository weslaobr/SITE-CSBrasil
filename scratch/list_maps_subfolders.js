
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function listMapsFolders() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    try {
        const response = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/list?directory=game/csgo/maps`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            }
        });
        
        const folders = response.data.data.filter(i => !i.attributes.is_file);
        console.log("Subpastas encontradas em maps:", JSON.stringify(folders.map(f => f.attributes.name), null, 2));
    } catch (e) {
        console.error("Erro:", e.message);
    }
}

listMapsFolders();
