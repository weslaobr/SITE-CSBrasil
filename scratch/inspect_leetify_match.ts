import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY;
const MATCH_ID = '84a23665-4248-427f-8832-fb3958ffec66';

async function main() {
  if (!LEETIFY_API_KEY) {
    console.error("Missing LEETIFY_API_KEY");
    return;
  }

  try {
    const res = await axios.get(`https://api-public.cs-prod.leetify.com/v2/matches/${MATCH_ID}`, {
      headers: { '_leetify_key': LEETIFY_API_KEY }
    });
    
    const data = res.data;
    if (data.stats && data.stats.length > 0) {
      console.log("--- PLAYER STATS KEYS ---");
      console.log(Object.keys(data.stats[0]));
      // Search for 'clutch' in keys
      const clutchKeys = Object.keys(data.stats[0]).filter(k => k.toLowerCase().includes('clutch'));
      console.log("Clutch related keys:", clutchKeys);
      
      console.log("Sample Stat Object (partial):");
      const sample = { ...data.stats[0] };
      // Remove some big fields to keep it readable
      delete sample.rounds;
      console.log(JSON.stringify(sample, null, 2));
    }
  } catch (e) {
    console.error(e.message);
  }
}

main();
