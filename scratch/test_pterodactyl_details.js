
const apiKey = "ptlc_x18tO5bKZCcBMBLBZL3pAxLUB5bSyjpyrtLeidHUXpc";
const serverId = "09821a19-3411-4b35-9af5-2aca06a0490a";
const panelUrl = "https://painel3.firegamesnetwork.com";

async function test() {
    try {
        console.log("Testing Pterodactyl API - Server Details...");
        const res = await fetch(`${panelUrl}/api/client/servers/${serverId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        });
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Server Data:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
