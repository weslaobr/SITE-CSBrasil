
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function testCommand() {
    const command = 'say Teste de Comando via API';
    console.log(`Testando envio de comando: ${command}`);
    
    // Simulating the API logic
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
        console.log("Resposta do Pterodactyl:", response.status, response.data || "Sem corpo");
    } catch (e) {
        console.error("Erro no teste:", e.response ? e.response.status : e.message, e.response ? e.response.data : "");
    }
}

testCommand();
