const SteamUser = require('steam-user');
const CS2 = require('node-cs2');
const SteamTotp = require('steam-totp');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.STEAM_BOT_PORT || 3005;

// Middleware para CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

const user = new SteamUser();
const cs2 = new CS2(user);

const STEAM_USERNAME = process.env.STEAM_BOT_USERNAME;
const STEAM_PASSWORD = process.env.STEAM_BOT_PASSWORD;
const SHARED_SECRET = process.env.STEAM_BOT_SHARED_SECRET;

if (!STEAM_USERNAME || !STEAM_PASSWORD) {
    console.error('❌ ERRO: STEAM_BOT_USERNAME e STEAM_BOT_PASSWORD não configurados no .env');
    process.exit(1);
}

let reconnectTimeout = null;
let retryCount = 0;
const MAX_RETRIES = 5;

function login() {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    console.log('🚀 Iniciando/Reiniciando Bot da Steam...');
    user.logOn({
        accountName: STEAM_USERNAME,
        password: STEAM_PASSWORD,
        twoFactorCode: SHARED_SECRET ? SteamTotp.getAuthCode(SHARED_SECRET) : undefined
    });
}

login();

user.on('loggedOn', () => {
    console.log('✅ Logado na Steam com sucesso!');
    retryCount = 0; // Reset retry count upon success
    user.setPersona(SteamUser.EPersonaState.Online);
    user.gamesPlayed([730]); // CS2 appid
});

user.on('error', (err) => {
    console.error('❌ Erro de login na Steam:', err.message);
    
    // Se for erro de login em outro lugar, esperamos um pouco antes de tentar novamente
    // para evitar "guerra de login" com o usuário se ele estiver jogando.
    if (err.message === 'LoggedInElsewhere' || err.eresult === 6) {
        console.warn('⚠️ O bot foi desconectado porque a conta foi logada em outro lugar (ex: você abriu a Steam/CS2 no PC).');
        handleReconnect(30000); // Espera 30 segundos antes de tentar de novo
    } else if (err.message === 'RateLimitExceeded' || err.eresult === 84) {
        console.warn('⚠️ Limite de taxa excedido. Aguardando para tentar novamente...');
        handleReconnect(60000); // 60 segundos
    }
});

user.on('disconnected', (eresult, msg) => {
    console.warn(`⚠️ Bot desconectado da Steam (EResult: ${eresult}, Mensagem: ${msg})`);
    
    // Se o motivo for LoggedInElsewhere, lidamos com isso
    if (eresult === 6) {
        console.warn('⚠️ Motivo: Logado em outro lugar. Tentando reconectar em breve...');
        handleReconnect(30000);
    } else {
        handleReconnect(5000); // Reconexão padrão rápida
    }
});

function handleReconnect(delay) {
    if (retryCount >= MAX_RETRIES) {
        console.error('❌ Limite máximo de tentativas de reconexão atingido. Verifique se a conta está sendo usada em outro lugar.');
        return;
    }

    if (!reconnectTimeout) {
        retryCount++;
        console.log(`🔄 Tentando reconectar em ${delay / 1000} segundos... (Tentativa ${retryCount}/${MAX_RETRIES})`);
        reconnectTimeout = setTimeout(() => {
            login();
        }, delay);
    }
}

cs2.on('connectedToGC', () => {
    console.log('🎮 Conectado ao Game Coordinator do CS2!');
    retryCount = 0; // Se conectou ao GC, resetamos retries também
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

        // Extrair estatísticas reais do objeto da Valve
        // Em CS2 via GC, o placar final costuma estar no último round_stats
        const lastRound = match.round_stats && match.round_stats.length > 0 
            ? match.round_stats[match.round_stats.length - 1] 
            : null;
            
        const score = lastRound && lastRound.team_scores 
            ? `${lastRound.team_scores[0]}-${lastRound.team_scores[1]}` 
            : 'N/A';
        
        // Tentar encontrar o link da demo (ESSENCIAL para o seu analisador Python)
        let demoUrl = null;
        if (match.round_stats && match.round_stats.length > 0) {
            // O link da demo geralmente vem no campo 'map' ou 'reservation' do primeiro round_stats
            demoUrl = match.round_stats[0].map || match.round_stats[0].reservation?.url || null;
        }

        const resData = {
            success: true,
            match_id: match.matchid?.toString(),
            match_time: match.matchtime,
            map_name: mapNames[match.map_name] || match.map_name || 'Desconhecido',
            score: score,
            demo_url: demoUrl, // Link real para o Python baixar (.dem.bz2)
            duration: '40-50 min',
            raw_time: match.matchtime ? new Date(match.matchtime * 1000).toISOString() : null,
            // Info bruta para debug se necessário
            stats_found: !!lastRound
        };

        res.json(resData);
    });
});

// API para buscar detalhes da skin (Float, Seed, Stickers) via URL de Inspeção
app.get('/item-details', (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL de inspeção ausente' });
    }

    console.log(`💎 Inspecionando item: ${url.substring(0, 50)}...`);

    if (!cs2.haveGCCheckedIn) {
        return res.status(503).json({ error: 'Bot ainda não está conectado ao GC' });
    }

    // O node-cs2/globaloffensive geralmente oferece o método de inspeção.
    // A estrutura da URL é steam://rungame/730/76561202255233023/+csgo_download_match%20S...
    // Na verdade para itens é steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S...
    
    // O método inspectItem aceita a URL diretamente ou os parâmetros s, a, d, m
    cs2.inspectItem(url, (item, err) => {
        if (err || !item) {
            console.error(`❌ Erro ao inspecionar item:`, err);
            return res.status(500).json({ error: 'Erro ao inspecionar item no GC' });
        }

        console.log(`✅ Item inspecionado com sucesso! Float: ${item.paint_wear}`);

        // Mapear stickers
        const stickers = (item.stickers || []).map(s => ({
            slot: s.slot,
            sticker_id: s.sticker_id,
            wear: s.wear,
            scale: s.scale,
            rotation: s.rotation,
            tint_id: s.tint_id,
            // Poderíamos adicionar um mapeamento de ID para Imagem aqui se tivéssemos a base
        }));

        res.json({
            float: item.paint_wear,
            paint_seed: item.paint_seed,
            paint_index: item.paint_index,
            stickers: stickers,
            defindex: item.defindex,
            quality: item.quality,
            rarity: item.rarity,
            origin: item.origin,
            full_item: item // Opcional: retornar tudo para debug
        });
    });
});

app.listen(port, () => {
    console.log(`🌐 Bot API rodando em http://localhost:${port}`);
});
