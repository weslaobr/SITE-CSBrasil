
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function findCbble() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    const dirs = ['game/csgo/maps', 'game/csgo/maps/workshop'];

    for (const dir of dirs) {
        try {
            console.log(`Buscando em ${dir}...`);
            const response = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/list?directory=${encodeURIComponent(dir)}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json',
                }
            });
            
            const files = response.data.data;
            const matches = files.filter(f => 
                f.attributes.name.toLowerCase().includes('cbble') || 
                f.attributes.name.toLowerCase().includes('cobble')
            );
            
            if (matches.length > 0) {
                console.log(`Encontrado em ${dir}:`, JSON.stringify(matches, null, 2));
            }
        } catch (e) {
            console.log(`Pasta ${dir} não encontrada ou erro.`);
        }
    }
}

findCbble();
