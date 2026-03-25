const https = require('https');
const steamId = '76561198181967565';
const key = '4549d73d-8a0d-40ff-9051-a3166c518dae';
const url = 'https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=' + steamId;
const req = https.get(url, { headers: { '_leetify_key': key } }, function(res) {
  let data = '';
  res.on('data', function(chunk) { data += chunk; });
  res.on('end', function() {
    try {
      const json = JSON.parse(data);
      console.log('STATUS HTTP:', res.statusCode);
      console.log('CAMPOS RAIZ:', Object.keys(json).join(', '));
      console.log('recent_matches count:', json.recent_matches ? json.recent_matches.length : 'undefined');
      console.log('recentMatches count:', json.recentMatches ? json.recentMatches.length : 'undefined');
      if (json.recent_matches && json.recent_matches.length > 0) {
        console.log('\n--- CHAVES DO PRIMEIRO MATCH ---');
        console.log(Object.keys(json.recent_matches[0]).join(', '));
        console.log('\n--- DADOS ---');
        console.log(JSON.stringify(json.recent_matches[0], null, 2).substring(0, 1000));
      }
    } catch(e) { console.log('RAW:', data.substring(0, 500)); }
  });
});
req.on('error', function(e) { console.error('ERRO:', e.message); });
