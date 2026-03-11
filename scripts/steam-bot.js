const SteamUser = require('steam-user');
const CS2 = require('node-cs2');
const SteamTotp = require('steam-totp');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.STEAM_BOT_PORT || 3005;

const user = new SteamUser();
const cs2 = new CS2(user);

const STEAM_USERNAME = process.env.STEAM_BOT_USERNAME;
const STEAM_PASSWORD = process.env.STEAM_BOT_PASSWORD;
const SHARED_SECRET = process.env.STEAM_BOT_SHARED_SECRET;

if (!STEAM_USERNAME || !STEAM_PASSWORD) {
    console.error('❌ ERRO: STEAM_BOT_USERNAME e STEAM_BOT_PASSWORD não configurados no .env');
    process.exit(1);
}

console.log('🚀 Iniciando Bot da Steam...');

user.logOn({
    accountName: STEAM_USERNAME,
    password: STEAM_PASSWORD,
    twoFactorCode: SHARED_SECRET ? SteamTotp.getAuthCode(SHARED_SECRET) : undefined
});

user.on('loggedOn', () => {
    console.log('✅ Logado na Steam com sucesso!');
    user.setPersona(SteamUser.EPersonaState.Online);
    user.gamesPlayed([730]); // CS2 appid
});

user.on('error', (err) => {
    console.error('❌ Erro de login na Steam:', err.message);
});

cs2.on('connectedToGC', () => {
    console.log('🎮 Conectado ao Game Coordinator do CS2!');
});

cs2.on('disconnectedFromGC', (reason) => {
    console.warn('⚠️ Desconectado do GC:', reason);
});

// Endpoint de status
app.get('/pulse', (req, res) => {
    res.json({
        online: true,
        steam: user.steamID ? 'Online' : 'Offline',
        gc: cs2.haveGCCheckedIn ? 'Online' : 'Offline'
    });
});

// API para o site solicitar detalhes de partida
app.get('/match/:sharingCode', (req, res) => {
    const { sharingCode } = req.params;

    if (!sharingCode) {
        return res.status(400).json({ error: 'Código de compartilhamento ausente' });
    }

    console.log(`🔍 Buscando detalhes da partida: ${sharingCode}`);

    if (!cs2.haveGCCheckedIn) {
        return res.status(503).json({ error: 'Bot ainda não está conectado ao GC' });
    }

    cs2.requestMatchDetails(sharingCode, (match, err) => {
        if (err || !match) {
            console.error(`❌ Erro ao buscar partida ${sharingCode}:`, err);
            return res.status(500).json({ error: 'Erro ao buscar detalhes no GC' });
        }

        console.log(`✅ Partida ${sharingCode} encontrada! ID: ${match.matchid}`);
        if (match.round_stats && match.round_stats.length > 0) {
            console.log(`[DEBUG] Found ${match.round_stats.length} round stats.`);
        }

        // Log deep structure for development
        // console.log('DEBUG MATCH:', JSON.stringify(match, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

        // Mapeamento básico de IDs para nomes de mapas
        const mapNames = {
            'de_ancient': 'Ancient',
            'de_anubis': 'Anubis',
            'de_inferno': 'Inferno',
            'de_mirage': 'Mirage',
            'de_nuke': 'Nuke',
            'de_overpass': 'Overpass',
            'de_vertigo': 'Vertigo',
            'de_dust2': 'Dust 2'
        };

        // Extract stats from match object (simplificado conforme a estrutura do node-cs2)
        // Nota: O node-cs2 retorna um objeto que pode variar dependendo da versão do protobuf
        // Tentamos extrair o máximo possível.

        let kills = 0;
        let deaths = 0;
        let assists = 0;
        let score = '0-0';
        let result = 'Loss';

        // Se houver estatísticas de round, podemos tentar inferir kills/placar
        // Mas o mais comum é vir em match.match_details ou algo similar
        // Para CS2 via GC, as infos detalhadas às vezes estão em sub-objetos.

        const resData = {
            match_id: match.matchid?.toString(),
            match_time: match.matchtime,
            map_name: mapNames[match.map_name] || match.map_name || 'Desconhecido',
            kills: kills,
            deaths: deaths,
            assists: assists,
            score: score,
            result: result,
            duration: '40 min',
            raw_time: match.matchtime ? new Date(match.matchtime * 1000).toISOString() : null
        };

        res.json(resData);
    });
});

app.listen(port, () => {
    console.log(`🌐 Bot API rodando em http://localhost:${port}`);
});
