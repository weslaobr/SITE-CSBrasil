import axios from 'axios';

// Cache simples em memória para evitar rate limit da Steam
// Em produção (Vercel), esse cache é efêmero por instância, mas ajuda em rajadas de requests
const priceCache: Record<string, { price: number, timestamp: number }> = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Função mock para manter compatibilidade com chamadas antigas que esperavam o objeto completo
 */
export const fetchPrices = async (): Promise<Record<string, number>> => {
    return {}; 
};

/**
 * Busca o preço de um item individual diretamente no Steam Community Market
 * Moeda: 7 (BRL - Real Brasileiro)
 */
export const getItemPrice = async (marketHashName: string): Promise<number | null> => {
    // 1. Verificar Cache
    const cached = priceCache[marketHashName];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.price;
    }

    // 2. Buscar da Steam
    try {
        // Adicionamos um pequeno delay aleatório para evitar detecção de bot em massa
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

        const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=7&market_hash_name=${encodeURIComponent(marketHashName)}`;
        
        const response = await axios.get(url, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 10000 
        });

        if (response.data && response.data.success && response.data.lowest_price) {
            // Limpa a string da moeda: "R$ 40,25" ou "40,25€" dependendo da config, mas aqui forçamos BRL
            // Remove tudo que não é número, vírgula ou ponto
            let priceStr = response.data.lowest_price;
            
            // Tratamento específico para o formato brasileiro da Steam "R$ 1.234,56"
            priceStr = priceStr.replace('R$', '').trim();
            priceStr = priceStr.replace(/\./g, ''); // Remove separador de milhar
            priceStr = priceStr.replace(',', '.');  // Troca vírgula decimal por ponto
            
            const price = parseFloat(priceStr);
            
            if (!isNaN(price)) {
                priceCache[marketHashName] = { price, timestamp: Date.now() };
                return price;
            }
        }
        
        return null;
    } catch (error: any) {
        // Se der erro 429 (Too Many Requests), logamos mas não travamos
        if (error.response?.status === 429) {
            console.warn(`[PriceService] Rate limit atingido na Steam para "${marketHashName}"`);
        } else {
            console.error(`[PriceService] Erro ao buscar preço de "${marketHashName}":`, error.message);
        }
        return null;
    }
};
