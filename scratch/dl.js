const fs = require('fs');

const API_KEY = "ptlc_x18tO5bKZCcBMBLBZL3pAxLUB5bSyjpyrtLeidHUXpc";
const SERVER_ID = "09821a19-3411-4b35-9af5-2aca06a0490a";
const BASE_URL = "https://painel3.firegamesnetwork.com";

const headers = {
    "Authorization": `Bearer ${API_KEY}`,
    "Accept": "application/json"
};

async function downloadFile() {
    const url = `${BASE_URL}/api/client/servers/${SERVER_ID}/files/download?file=%2Fgame%2Fcsgo%2Faddons%2Fcounterstrikesharp%2Fplugins%2FGameModeManager%2FGameModeManager.dll`;
    const res = await fetch(url, { headers });
    if (res.ok) {
        const data = await res.json();
        const downloadUrl = data.attributes.url;
        const dllRes = await fetch(downloadUrl);
        const buffer = await dllRes.arrayBuffer();
        fs.writeFileSync('scratch/GameModeManager.dll', Buffer.from(buffer));
        console.log("Downloaded successfully.");
    } else {
        console.log(`Error ${res.status}: ${await res.text()}`);
    }
}

downloadFile();
