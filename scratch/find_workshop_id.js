
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function findWorkshopCbble() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    try {
        console.log("Listando subpastas em game/csgo/workshop/maps...");
        const response = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/list?directory=game/csgo/workshop/maps`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            }
        });
        
        const folders = response.data.data;
        console.log("Pastas encontradas:", JSON.stringify(folders.map(f => f.attributes.name), null, 2));
    } catch (e) {
        console.error("Erro ou pasta não existe.");
    }
}

findWorkshopCbble();
