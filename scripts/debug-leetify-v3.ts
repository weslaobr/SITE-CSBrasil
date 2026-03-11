import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function debugLeetify() {
    const steamId = '76561198024691636';
    const apiKey = '4549d73d-8a0d-40ff-9051-a3166c518dae';

    console.log(`Querying Leetify for ID: ${steamId}`);

    try {
        const res = await axios.get(`https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=${steamId}`, {
            headers: { '_leetify_key': apiKey }
        });

        console.log('Response status:', res.status);
        console.log('Response keys:', Object.keys(res.data));
        console.log('Full JSON Response:');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e: any) {
        if (e.response) {
            console.error('API Error Status:', e.response.status);
            console.error('API Error Data:', e.response.data);
        } else {
            console.error('Network/Request Error:', e.message);
        }
    }
}

debugLeetify();
