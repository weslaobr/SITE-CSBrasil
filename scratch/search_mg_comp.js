
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function searchInGameModes() {
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    const path = 'game/csgo/gamemodes_server.txt';
    try {
        const res = await axios.get(`${panelUrl}/api/client/servers/${serverId}/files/contents?file=${encodeURIComponent(path)}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const lines = res.data.split('\n');
        let foundComp = false;
        let braceCount = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('"mg_comp"')) {
                foundComp = true;
                console.log("Grupo mg_comp encontrado na linha " + (i+1));
            }
            if (foundComp) {
                console.log(lines[i]);
                if (lines[i].includes('{')) braceCount++;
                if (lines[i].includes('}')) braceCount--;
                if (braceCount === 0 && lines[i].includes('}')) break;
                if (i > lines.length) break; // safety
            }
        }
    } catch (e) { console.log("Erro ao ler."); }
}
searchInGameModes();
