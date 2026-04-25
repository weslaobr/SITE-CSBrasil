
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function findCache() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    // Buscando em todo o diretório csgo
    try {
        const response = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/list?directory=game/csgo`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        // Vamos procurar recursivamente em pastas de addons ou configs
        console.log("Iniciando busca por 'cache'...");
        // (Vou usar um script simplificado para listar recursivamente apenas nomes que contenham cache)
    } catch (e) { console.error(e.message); }
}
