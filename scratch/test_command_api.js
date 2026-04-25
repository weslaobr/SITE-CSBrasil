
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function testCommand() {
    const command = 'maps *';
    console.log(`Testando envio de comando: ${command}`);
    
    const apiKey = process.env.PTERODACTYL_API_KEY;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    try {
        const response = await axios.post(`${panelUrl}/api/client/servers/${serverId}/command`, 
            { command },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            }
        );
        console.log("Resposta do Pterodactyl:", response.status);
    } catch (e) {
        console.error("Erro no teste:", e.message);
    }
}

testCommand();
