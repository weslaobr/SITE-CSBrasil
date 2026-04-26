import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY;
const MATCH_ID = '84a23665-4248-427f-8832-fb3958ffec66';

async function main() {
  if (!LEETIFY_API_KEY) return;
  const res = await axios.get(`https://api-public.cs-prod.leetify.com/v2/matches/${MATCH_ID}`, {
    headers: { '_leetify_key': LEETIFY_API_KEY }
  });
  console.log("--- MATCH TOP LEVEL KEYS ---");
  console.log(Object.keys(res.data));
}
main();
