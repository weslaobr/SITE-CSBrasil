import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY;
const steamId = '76561198024691636';

async function debugLeetify() {
    try {
        const response = await axios.get(`https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=${steamId}`, {
            headers: { '_leetify_key': LEETIFY_API_KEY }
        });
        console.log("FULL API RESPONSE:");
        console.log(JSON.stringify(response.data, null, 2));
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

debugLeetify();
