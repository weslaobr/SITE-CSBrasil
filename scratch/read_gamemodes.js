const ftp = require('basic-ftp');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function getGamemodes() {
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
        
        const { PassThrough } = require('stream');
        const passThrough = new PassThrough();
        let content = "";
        passThrough.on('data', chunk => content += chunk.toString());
        await client.downloadTo(passThrough, "/gamemodes_server.txt");
        
        console.log("Content of gamemodes_server.txt:");
        console.log(content);
        
    } catch (e) {
        console.error("FTP Error:", e);
    } finally {
        client.close();
    }
}

getGamemodes();
