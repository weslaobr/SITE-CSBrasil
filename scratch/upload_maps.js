const fs = require('fs');
const path = require('path');

const API_KEY = "ptlc_x18tO5bKZCcBMBLBZL3pAxLUB5bSyjpyrtLeidHUXpc";
const SERVER_ID = "09821a19-3411-4b35-9af5-2aca06a0490a";
const BASE_URL = "https://painel3.firegamesnetwork.com";

const headers = {
    "Authorization": `Bearer ${API_KEY}`,
    "Accept": "application/json"
};

async function main() {
    // Try GET on upload endpoint
    console.log("=== Getting upload URL (GET) ===");
    const uploadUrl = `${BASE_URL}/api/client/servers/${SERVER_ID}/files/upload`;
    const uploadRes = await fetch(uploadUrl, { method: 'GET', headers });
    console.log(`Status: ${uploadRes.status}`);
    if (uploadRes.ok) {
        const data = await uploadRes.json();
        console.log(JSON.stringify(data, null, 2));
        const signedUrl = data.attributes?.url;
        if (signedUrl) {
            // Upload file
            const localPath = path.join(__dirname, '..', 'cfg', 'GGMCmaps.json');
            const fileBuffer = fs.readFileSync(localPath);
            const form = new FormData();
            const blob = new Blob([fileBuffer], { type: 'application/json' });
            form.append('files', blob, 'GGMCmaps.json');
            const fileUploadRes = await fetch(signedUrl, { method: 'POST', body: form });
            console.log(`Upload status: ${fileUploadRes.status}`);
            if (fileUploadRes.ok || fileUploadRes.status === 204) {
                console.log("Upload successful!");
            } else {
                console.log(`Upload error: ${await fileUploadRes.text()}`);
            }
        }
    } else {
        console.log(await uploadRes.text());
    }
}

main().catch(console.error);
