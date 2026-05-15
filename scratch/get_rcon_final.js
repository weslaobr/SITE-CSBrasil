const ftp = require('basic-ftp');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function getRcon() {
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
        
        const paths = ["/cfg/server.cfg", "/cfg/gamemode_competitive_server.cfg"];
        for (const p of paths) {
            try {
                const { PassThrough } = require('stream');
                const passThrough = new PassThrough();
                let content = "";
                passThrough.on('data', chunk => content += chunk.toString());
                await client.downloadToStream(passThrough, p);
                
                const match = content.match(/rcon_password\s+"?([^"\s]+)"?/i);
                if (match) {
                    console.log(`SUCCESS: RCON Password found in ${p}: ${match[1]}`);
                    return;
                }
            } catch (e) {}
        }
        console.log("RCON Password not found.");
    } catch (e) {
        console.error("FTP Error:", e);
    } finally {
        client.close();
    }
}

getRcon();
