const axios = require('axios');
require('dotenv').config();

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY;
const STEAM_ID = "76561198024691636";

async function testLeetify() {
    console.log("Testing Leetify for ID:", STEAM_ID);
    try {
        const response = await axios.get(`https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=${STEAM_ID}`, {
            headers: {
                '_leetify_key': LEETIFY_API_KEY
            }
        });
        console.log("Response ranks:", JSON.stringify(response.data.ranks, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.log("Data:", e.response.data);
    }
}

testLeetify();
