
// Script para descobrir os campos reais da API do Leetify v2 para uma partida específica
// Executa com: node scripts/probe-leetify-fields.js

const https = require('https');
require('dotenv').config();

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY || '4549d73d-8a0d-40ff-9051-a3166c518dae';

// Usar a partida de teste conhecida
const matchId = 'b02b168c-3a70-4ce3-a99e-f116216875d3';
const url = `https://api-public.cs-prod.leetify.com/v2/matches/${matchId}`;

console.log('Buscando partida:', matchId);
console.log('URL:', url);

const req = https.get(url, { headers: { '_leetify_key': LEETIFY_API_KEY } }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        let j;
        try { j = JSON.parse(d); } catch(e) { console.log('Resposta RAW:', d.substring(0, 500)); return; }

        console.log('\n=== STATUS HTTP:', res.statusCode);
        console.log('=== CAMPOS RAIZ DO MATCH:', Object.keys(j).join(', '));

        const stats = j.stats || j.player_stats || j.playerStats;
        if (stats) {
            const arr = Array.isArray(stats) ? stats : Object.values(stats);
            const firstP = arr[0];
            console.log('\n=== TODOS OS CAMPOS DO JOGADOR ===');
            console.log(JSON.stringify(Object.keys(firstP), null, 2));
            
            console.log('\n=== VALORES DOS CAMPOS DE UTILIDADE E CONFRONTO ===');
            const look = [
                'utility_damage','util_damage','utilityDamage',
                'flash_assists','flash_assist_count','flashbang_assist_count','flashAssists',
                'blind_time','blindTime','enemies_flashed_duration','enemiesFlashedDuration',
                'he_thrown','heThrown','grenades_thrown',
                'flash_thrown','flashThrown','flashbangs_thrown',
                'smokes_thrown','smokesThrown','smoke_grenades_thrown',
                'molotovs_thrown','molotovThrown','incendiaries_thrown',
                'fk_count','fd_count','first_kill_count','first_death_count','firstKills','firstDeaths',
                'triple_kills','tripleKills','3k_count','three_kill_count',
                'quad_kills','quadKills','4k_count','four_kill_count',
                'penta_kills','pentaKills','5k_count','five_kill_count','ace_kills',
                'clutch_count','clutches_won','clutchesWon','clutch_wins',
                'trade_count','tradeKills','trades','trade_kills','trading_kills',
                'kast','kast_percent','kast_percentage','kastControl',
                'rating','leetify_rating','leetifyRating','hltv_rating','hltvRating2',
                'adr','dpr','average_damage_per_round',
                'kills','deaths','assists','total_kills','total_deaths','total_assists',
                'accuracy_head','hs_percent','hs_percentage','headshot_percentage',
                'name','nickname','steam64_id','steam64Id','player_id',
            ];
            look.forEach(f => {
                if (firstP[f] !== undefined) {
                    console.log(`  ${f} = ${JSON.stringify(firstP[f])}`);
                }
            });
        } else {
            console.log('\n sem campo stats/player_stats. Full response:');
            console.log(JSON.stringify(j, null, 2).substring(0, 2000));
        }
    });
});
req.on('error', e => console.log('ERRO:', e.message));
