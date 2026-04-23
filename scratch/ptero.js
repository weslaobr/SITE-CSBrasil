const fs = require('fs');

const API_KEY = "ptlc_x18tO5bKZCcBMBLBZL3pAxLUB5bSyjpyrtLeidHUXpc";
const SERVER_ID = "09821a19-3411-4b35-9af5-2aca06a0490a";
const BASE_URL = "https://painel3.firegamesnetwork.com";

const headers = {
    "Authorization": `Bearer ${API_KEY}`,
    "Accept": "application/json"
};

async function listFiles(directory = "%2F") {
    const url = `${BASE_URL}/api/client/servers/${SERVER_ID}/files/list?directory=${directory}`;
    const res = await fetch(url, { headers });
    if (res.ok) {
        const data = await res.json();
        for (const item of data.data || []) {
            const attrs = item.attributes;
            console.log(`[${attrs.is_file === false ? 'DIR' : 'FILE'}] ${attrs.name}`);
        }
    } else {
        console.log(`Error ${res.status}: ${await res.text()}`);
    }
}

async function readFile(filepath) {
    const url = `${BASE_URL}/api/client/servers/${SERVER_ID}/files/contents?file=${filepath}`;
    const res = await fetch(url, { headers });
    if (res.ok) {
        console.log(await res.text());
    } else {
        console.log(`Error ${res.status}: ${await res.text()}`);
    }
}

const args = process.argv.slice(2);
if (args.length > 0) {
    if (args[0] === "list" && args[1]) listFiles(args[1]);
    else if (args[0] === "read" && args[1]) readFile(args[1]);
    else listFiles();
} else {
    listFiles();
}
