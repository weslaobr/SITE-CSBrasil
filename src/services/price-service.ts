import axios from 'axios';
import { prisma } from '@/lib/prisma';

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms
const USD_BRL_RATE = Number(process.env.USD_BRL_RATE) || 6.15; // Taxa de conversão USD -> BRL

/**
 * Busca preços em massa da market.csgo.com (fonte pública confiável).
 * Retorna preços em USD. ~24k itens.
 */
export const updatePricesFromMarketCSGO = async (force = false): Promise<{ success: boolean; count: number }> => {
    try {
        if (!force) {
            // Verificar se houve atualização recente (últimas 24h)
            const recentUpdate = await prisma.itemPriceBase.findFirst({
                where: {
                    lastUpdate: {
                        gt: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            });

            if (recentUpdate) {
                console.log("[PriceService] Preços já atualizados nas últimas 24h. Pulando atualização automática.");
                return { success: true, count: 0 };
            }
        }

        console.log("[PriceService] Iniciando atualização via market.csgo.com...");
        const url = 'https://market.csgo.com/api/v2/prices/USD.json';

        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CS2PriceBot/1.0)' },
            timeout: 30000
        });

        const items: Array<{ market_hash_name: string; price: string; volume: string }> = response.data?.items;
        if (!Array.isArray(items)) throw new Error("Resposta inválida: items não é array");

        console.log(`[PriceService] Recebidos ${items.length} itens da market.csgo.com.`);

        const batchSize = 100;
        let updatedCount = 0;

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            await Promise.all(batch.map(item => {
                const rawPrice = parseFloat(item.price);
                if (!item.market_hash_name || isNaN(rawPrice) || rawPrice <= 0) return Promise.resolve();

                let priceUSD = rawPrice;
                
                // DATA SANITY CHECK: Detect and fix common API anomalies
                // Some Sticker/Graffiti prices in market.csgo.com come inflated by 1000x or 10000x
                const isSticker = item.market_hash_name.includes('Sticker');
                const isGraffiti = item.market_hash_name.includes('Graffiti');
                
                if ((isSticker || isGraffiti) && priceUSD > 1000) {
                    priceUSD = priceUSD / 10000; // Likely a decimal point error in API
                } else if (priceUSD > 50000) {
                    return Promise.resolve();
                }

                return prisma.itemPriceBase.upsert({
                    where: { marketHashName: item.market_hash_name },
                    update: { price: priceUSD, lastUpdate: new Date(), source: 'market_csgo' },
                    create: { marketHashName: item.market_hash_name, price: priceUSD, currency: 'USD', source: 'market_csgo' }
                });
            }));
            updatedCount += batch.length;
            if (i % 5000 === 0 && i > 0) console.log(`[PriceService] Processados ${i}/${items.length}...`);
        }

        console.log(`[PriceService] Concluído! ${updatedCount} preços salvos.`);
        return { success: true, count: updatedCount };
    } catch (error: any) {
        console.error("[PriceService] Erro ao buscar de market.csgo.com:", error.message);
        return { success: false, count: 0 };
    }
};

// Aliases para compatibilidade
export const updatePricesFromSkinport = (force = false) => updatePricesFromMarketCSGO(force);
export const updatePricesFromCSGOTrader = (force = false) => updatePricesFromMarketCSGO(force);

/**
 * Busca o preço de um item individual
 */
export const getItemPrice = async (marketHashName: string): Promise<number | null> => {
    try {
        // 1. Verificar Tabela de Preços do Banco
        const dbPrice = await prisma.itemPriceBase.findUnique({
            where: { marketHashName }
        });

        // 2. Se o preço existe e for menor que o Tempo Máximo de Cache, retorne o preço do banco
        if (dbPrice && (Date.now() - dbPrice.lastUpdate.getTime() < CACHE_TTL)) {
            return dbPrice.price;
        }

        // 3. Se não temos ou está expirado, tentamos buscar da Steam como fallback individual
        // (Mas o ideal é que o updatePricesFromSkinport supra a maioria)
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay conservador

        const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=7&market_hash_name=${encodeURIComponent(marketHashName)}`;
        
        const response = await axios.get(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000 
        });

        if (response.data?.success && response.data.lowest_price) {
            let priceStr = response.data.lowest_price;
            priceStr = priceStr.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
            const price = parseFloat(priceStr);
            
            if (!isNaN(price)) {
                // Steam retornou BRL (currency=7). Converter para USD para o Banco.
                const priceInUSD = parseFloat((price / USD_BRL_RATE).toFixed(2));
                
                await prisma.itemPriceBase.upsert({
                    where: { marketHashName },
                    update: { price: priceInUSD, lastUpdate: new Date(), source: 'steam_community' },
                    create: { marketHashName, price: priceInUSD, currency: 'USD', source: 'steam_community' }
                });
                return priceInUSD;
            }
        }
        
    } catch (error: any) {
        // Silencioso se for individual pra não poluir log
    }
    
    // Fallback para dado obsoleto
    try {
        const fallbackPrice = await prisma.itemPriceBase.findUnique({ where: { marketHashName } });
        if (fallbackPrice) return fallbackPrice.price;
    } catch (e) {}

    return null;
};

/**
 * Busca múltiplos preços em lote na tabela ItemPriceBase.
 */
export const getMultiplePrices = async (marketHashNames: string[]): Promise<Map<string, number | null>> => {
    const priceMap = new Map<string, number | null>();
    try {
        const uniqueNames = [...new Set(marketHashNames)];
        const dbPrices = await prisma.itemPriceBase.findMany({
            where: { marketHashName: { in: uniqueNames } }
        });

        for (const item of dbPrices) {
            // O Banco agora é padronizado em USD.
            // Se houver algum item antigo em BRL, converter para USD (opcional, mas seguro)
            let finalPrice = item.price;
            if (item.currency === 'BRL') {
                finalPrice = parseFloat((item.price / USD_BRL_RATE).toFixed(2));
            }
            priceMap.set(item.marketHashName, finalPrice);
        }
    } catch (error) {
        console.error("[PriceService] Erro na busca em lote:", error);
    }
    return priceMap;
};
