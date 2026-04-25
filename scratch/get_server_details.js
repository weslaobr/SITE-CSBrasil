
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function getServerDetails() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    try {
        const res = await axios.get(`${panelUrl}/api/client/servers/${serverId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        console.log("Allocations:", JSON.stringify(res.data.attributes.relationships.allocations.data, null, 2));
    } catch (e) { console.log("Erro ao buscar detalhes."); }
}
getServerDetails();
