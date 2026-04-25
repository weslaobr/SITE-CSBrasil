
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function readMatchZyMaps() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    const files = [
        'game/csgo/MatchZy/maplist.txt',
        'game/csgo/MatchZy/mapcycle.txt',
        'game/csgo/cfg/MatchZy/maplist.txt'
    ];

    for (const file of files) {
        try {
            console.log(`Tentando ler ${file}...`);
            const response = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/contents?file=${encodeURIComponent(file)}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json',
                }
            });
            console.log(`Conteúdo de ${file}:`);
            console.log(response.data);
        } catch (e) {
            console.log(`Arquivo ${file} não encontrado.`);
        }
    }
}

readMatchZyMaps();
