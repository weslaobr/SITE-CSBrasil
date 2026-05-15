const ftp = require('basic-ftp');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listLogs() {
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
        
        console.log("Listing logs:");
        const list = await client.list("/logs");
        list.forEach(f => console.log(`${f.name} (${f.size} bytes)`));
        
    } catch (e) {
        console.error("FTP Error:", e);
    } finally {
        client.close();
    }
}

listLogs();
