
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function findCbbleWorkshop() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    try {
        console.log("Listando game/csgo/workshop...");
        const response = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/list?directory=game/csgo/workshop`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            }
        });
        
        console.log("Conteúdo de workshop:", JSON.stringify(response.data.data.map(i => i.attributes.name), null, 2));
    } catch (e) {
        console.error("Erro ao listar workshop:", e.message);
    }
}

findCbbleWorkshop();
