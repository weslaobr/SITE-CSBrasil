import axios from 'axios';

const CSGO_TRADER_PRICES_URL = 'https://prices.csgotrader.app/latest/prices_v6.json';

interface PriceData {
    [key: string]: number;
}

let cachedPrices: PriceData | null = null;
let lastFetchTime: number = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 horas em milissegundos

export const fetchPrices = async (): Promise<PriceData> => {
    const now = Date.now();

    if (cachedPrices && (now - lastFetchTime < CACHE_TTL)) {
        return cachedPrices;
    }

    try {
        console.log('Fetching latest prices from CSGOTrader...');
        const response = await axios.get(CSGO_TRADER_PRICES_URL);
        
        if (response.data) {
            cachedPrices = response.data;
            lastFetchTime = now;
            console.log('Prices cached successfully.');
            return cachedPrices as PriceData;
        }
        
        throw new Error('Empty response from CSGOTrader');
    } catch (error: any) {
        console.error('Error fetching prices from CSGOTrader:', error.message);
        // Retorna o cache antigo se houver, ou um objeto vazio
        return cachedPrices || {};
    }
};

export const getItemPrice = async (marketHashName: string): Promise<number | null> => {
    const prices = await fetchPrices();
    return prices[marketHashName] || null;
};
