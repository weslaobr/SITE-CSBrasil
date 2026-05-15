const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

async function getRconPass() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            port: parseInt(process.env.FTP_PORT || '21'),
            secure: false
        });

        console.log("Connected to FTP");
        
        // Try to find server.cfg
        const searchPaths = [
            "game/csgo/cfg/server.cfg",
            "game/csgo/cfg/gamemode_competitive_server.cfg",
            "server.cfg"
        ];

        for (const ftpPath of searchPaths) {
            try {
                console.log(`Checking ${ftpPath}...`);
                const { PassThrough } = require('stream');
                const passThrough = new PassThrough();
                let content = "";
                passThrough.on('data', chunk => content += chunk.toString());
                
                await client.downloadToStream(passThrough, ftpPath);
                console.log(`Found ${ftpPath}!`);
                
                const match = content.match(/rcon_password\s+"?([^"\s]+)"?/i);
                if (match) {
                    console.log(`RCON Password found: ${match[1]}`);
                    return match[1];
                }
            } catch (e) {
                // Not found, try next
            }
        }
        console.log("RCON Password not found in common files.");
    } catch (e) {
        console.error("FTP Error:", e);
    } finally {
        client.close();
    }
}

getRconPass();
