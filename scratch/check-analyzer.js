const axios = require('axios');

async function checkAnalyzer() {
  const matchId = 'demo_8885ba7d89d63f48';
  const url = `https://tropacsdemos.discloud.app/api/match/${matchId}/stats`;
  
  console.log(`Checking analyzer API: ${url}`);
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const data = res.data;
    
    if (data.players && data.players.length > 0) {
      console.log(`Found ${data.players.length} players`);
      data.players.forEach(p => {
        console.log(`Player ${p.steamid64}: KAST=${p.kast}, KEYS=${Object.keys(p).join(', ')}`);
      });
    } else {
      console.log('No players found in analyzer response');
    }
  } catch (err) {
    console.error('Error calling analyzer API:', err.message);
  }
}

checkAnalyzer();
