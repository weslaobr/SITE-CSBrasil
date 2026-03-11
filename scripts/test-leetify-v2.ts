import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkLeetifyMatchV2() {
    const matchId = 'b02b168c-3a70-4ce3-a99e-f116216875d3';
    const apiKey = '4549d73d-8a0d-40ff-9051-a3166c518dae';

    try {
        const response = await axios.get(`https://api-public.cs-prod.leetify.com/api/v2/games/${matchId}`, {
            headers: {
                '_leetify_key': apiKey
            }
        });

        console.log("Success! Data keys:", Object.keys(response.data));
    } catch (e: any) {
        console.error("Leetify V2 Error:", e.message, e.response?.data);
    }
}

checkLeetifyMatchV2();
