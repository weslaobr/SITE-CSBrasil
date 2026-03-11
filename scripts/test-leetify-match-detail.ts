import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkLeetifyMatch() {
    const matchId = 'b02b168c-3a70-4ce3-a99e-f116216875d3';
    const apiKey = '4549d73d-8a0d-40ff-9051-a3166c518dae';

    try {
        const response = await axios.get(`https://api-public.cs-prod.leetify.com/v3/matches/${matchId}`, {
            headers: {
                '_leetify_key': apiKey
            }
        });

        const data = response.data;
        console.log("Match Details Keys:", Object.keys(data));
        if (data.playerStats) {
            console.log("Players count:", Object.keys(data.playerStats).length);
            console.log("First Player:", Object.values(data.playerStats)[0]);
        }
    } catch (e: any) {
        console.error("Leetify Error:", e.message);
    }
}

checkLeetifyMatch();
