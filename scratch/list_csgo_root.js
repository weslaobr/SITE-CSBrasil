
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function listCsgoRoot() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    try {
        const response = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/list?directory=game/csgo`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            }
        });
        
        console.log("Pastas em game/csgo:", JSON.stringify(response.data.data.map(i => i.attributes.name), null, 2));
    } catch (e) {
        console.error("Erro:", e.message);
    }
}

listCsgoRoot();
