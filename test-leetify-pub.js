const https = require('https');
const steamId = '76561198181967565';
const key = '4549d73d-8a0d-40ff-9051-a3166c518dae';

// Vamos tentar a rota pública que não precisa de chave, que retorna JSON com dados do Leetify public profile
const url = 'https://api.leetify.com/api/profile/' + steamId;
const req = https.get(url, function(res) {
  let data = '';
  res.on('data', function(chunk) { data += chunk; });
  res.on('end', function() {
    try {
      const json = JSON.parse(data);
      console.log('STATUS:', res.statusCode);
      console.log('CHAVES ROOT:', Object.keys(json).join(', '));
      
      if (json.recent_match_stats) {
          console.log('\n--- TEM RECENT MATCH STATS (' + json.recent_match_stats.length + ' partidas) ---');
          if (json.recent_match_stats.length > 0) {
              console.log(Object.keys(json.recent_match_stats[0]).join(', '));
          }
      }
      
      if (json.games) {
          console.log('\n--- TEM GAMES (' + json.games.length + ' itens) ---');
          if (json.games.length > 0) {
              console.log('Chaves Game:', Object.keys(json.games[0]).join(', '));
          }
      }
    } catch(e) { console.log('ERRO PARSE. RAW:', data.substring(0, 500)); }
  });
});
req.on('error', function(e) { console.error('ERRO DA REQ:', e.message); });
