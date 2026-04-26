import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY;
const STEAM_ID = '76561198885434646'; // Example steamid

async function main() {
  if (!LEETIFY_API_KEY) return;
  const res = await axios.get(`https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=${STEAM_ID}`, {
    headers: { '_leetify_key': LEETIFY_API_KEY }
  });
  if (res.data.recentMatches && res.data.recentMatches.length > 0) {
    console.log("--- RECENT MATCH KEYS ---");
    console.log(Object.keys(res.data.recentMatches[0]));
    const clutchKeys = Object.keys(res.data.recentMatches[0]).filter(k => k.toLowerCase().includes('clutch'));
    console.log("Clutch related keys in Profile Matches:", clutchKeys);
  }
}
main();
