const axios = require('axios');
require('dotenv').config();

const CS2SPACE_API_KEY = process.env.CS2SPACE_API_KEY;
const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY;
const steamId = '76561198771796413';

async function checkCS2Space() {
  console.log('--- CS2.space ---');
  try {
    const res = await axios.get('https://cs2.space/api/lookup', {
      params: { key: CS2SPACE_API_KEY, id: steamId }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('CS2Space Error:', e.message);
  }
}

async function checkLeetify() {
  console.log('\n--- Leetify ---');
  try {
    const res = await axios.get(`https://api-public.cs-prod.leetify.com/api/player/${steamId}`, {
      headers: { '_leetify_key': LEETIFY_API_KEY }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('Leetify Error:', e.message);
    if (e.response) console.log('Status:', e.response.status, e.response.data);
  }
}

async function main() {
  await checkCS2Space();
  await checkLeetify();
}

main();
