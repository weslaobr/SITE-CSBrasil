import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkLeetify() {
    const steamId = '76561198024691636';
    const apiKey = '4549d73d-8a0d-40ff-9051-a3166c518dae';

    try {
        const response = await axios.get(`https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=${steamId}`, {
            headers: {
                '_leetify_key': apiKey
            }
        });

        const data = response.data;
        if (data.recent_matches && data.recent_matches.length > 0) {
            console.log("Recent Matches Count:", data.recent_matches.length);
            console.log("First Match Shape:", JSON.stringify(data.recent_matches[0], null, 2));
        } else {
            console.log("No recent matches found in Leetify", Object.keys(data));
        }
    } catch (e: any) {
        console.error("Leetify Error:", e.message);
    }
}

checkLeetify();
