
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function findMatchZyConfig() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    const paths = [
        'game/csgo/addons/counterstrikesharp/configs/plugins/MatchZy',
        'game/csgo/cfg/MatchZy'
    ];

    for (const path of paths) {
        try {
            console.log(`Listando arquivos em ${path}...`);
            const res = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/list?directory=${encodeURIComponent(path)}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            console.log(`Arquivos em ${path}:`, res.data.data.map(f => f.attributes.name));
        } catch (e) {}
    }
}
findMatchZyConfig();
