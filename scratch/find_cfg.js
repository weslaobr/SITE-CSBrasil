const ftp = require('basic-ftp');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function findCfg() {
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
        
        const list = await client.list("/");
        const dirs = list.filter(f => f.type === 2);
        console.log("Directories in root:");
        dirs.forEach(f => console.log(`- ${f.name}`));
        
        const cfgDir = dirs.find(d => d.name.toLowerCase() === 'cfg');
        if (cfgDir) {
            console.log("Found 'cfg' in root.");
        } else {
            console.log("'cfg' not found in root.");
        }
        
    } catch (e) {
        console.error("FTP Error:", e);
    } finally {
        client.close();
    }
}

findCfg();
