
const apiKey = "ptlc_x18tO5bKZCcBMBLBZL3pAxLUB5bSyjpyrtLeidHUXpc";
const serverId = "09821a19-3411-4b35-9af5-2aca06a0490a";
const panelUrl = "https://painel3.firegamesnetwork.com";
const fs = require('fs');

async function test() {
    try {
        const res = await fetch(`${panelUrl}/api/client/servers/${serverId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        });
        const data = await res.json();
        fs.writeFileSync('scratch/server_info.json', JSON.stringify(data, null, 2));
        console.log("IP:", data.attributes.relationships.allocations.data[0].attributes.ip);
        console.log("Port:", data.attributes.relationships.allocations.data[0].attributes.port);
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
