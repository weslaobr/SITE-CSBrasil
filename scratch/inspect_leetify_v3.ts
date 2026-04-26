import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY;
const MATCH_ID = '84a23665-4248-427f-8832-fb3958ffec66';

async function main() {
  if (!LEETIFY_API_KEY) return;
  try {
    const res = await axios.get(`https://api-public.cs-prod.leetify.com/v3/matches/${MATCH_ID}`, {
      headers: { '_leetify_key': LEETIFY_API_KEY }
    });
    console.log("--- V3 MATCH TOP LEVEL KEYS ---");
    console.log(Object.keys(res.data));
    if (res.data.playerStats && res.data.playerStats.length > 0) {
        const clutchKeys = Object.keys(res.data.playerStats[0]).filter(k => k.toLowerCase().includes('clutch'));
        console.log("Clutch related keys in V3:", clutchKeys);
    }
  } catch (e) {
    console.error("V3 failed:", e.message);
  }
}
main();
