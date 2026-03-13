import axios from 'axios';
import { prisma } from '@/lib/prisma';

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms

/**
 * Busca todos os preços da Skinport e atualiza o banco de dados em massa.
 * Esta é a forma mais eficiente de ter "valores de referência" sem sofrer rate limit da Steam.
 */
/**
 * Busca todos os preços da CSGOTrader (usado pela extensão oficial) e atualiza o banco.
 * Esta é a forma mais eficiente de ter "valores de referência" oficiais.
 */
export const updatePricesFromCSGOTrader = async (): Promise<{ success: boolean; count: number }> => {
    try {
        console.log("[PriceService] Iniciando atualização via CSGOTrader...");
        const url = 'https://prices.csgotrader.app/latest/prices_v6.json';
        
        const response = await axios.get(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000 
        });
        
        const data = response.data;
        if (!data || typeof data !== 'object') {
            throw new Error("Resposta da CSGOTrader inválida");
        }

        const marketNames = Object.keys(data);
        console.log(`[PriceService] Recebidos ${marketNames.length} itens da CSGOTrader.`);

        // Processar em lotes
        const batchSize = 100;
        let updatedCount = 0;

        for (let i = 0; i < marketNames.length; i += batchSize) {
            const batchNames = marketNames.slice(i, i + batchSize);
            
            await Promise.all(batchNames.map(name => {
                const priceData = data[name];
                // A CSGOTrader retorna um objeto ou valor direto. Vamos pegar o 'lowest_price' ou o valor numérico.
                const price = typeof priceData === 'object' ? (priceData.starting_at || priceData.average || 0) : (priceData || 0);
                
                if (price <= 0) return Promise.resolve();

                return prisma.itemPriceBase.upsert({
                    where: { marketHashName: name },
                    update: { 
                        price: price, 
                        lastUpdate: new Date(),
                        source: 'csgotrader'
                    },
                    create: { 
                        marketHashName: name, 
                        price: price, 
                        currency: 'BRL',
                        source: 'csgotrader'
                    }
                });
            }));
            
            updatedCount += batchNames.length;
            if (i % 5000 === 0) console.log(`[PriceService] Processados ${i} itens...`);
        }

        console.log(`[PriceService] Atualização concluída! ${updatedCount} preços salvos.`);
        return { success: true, count: updatedCount };
    } catch (error: any) {
        console.error("[PriceService] Erro ao atualizar via CSGOTrader:", error.message);
        return { success: false, count: 0 };
    }
};

/**
 * Interface unificada para atualização (tenta CSGOTrader primeiro)
 */
export const updatePricesFromSkinport = async (): Promise<{ success: boolean; count: number }> => {
    return updatePricesFromCSGOTrader();
};

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
                await prisma.itemPriceBase.upsert({
                    where: { marketHashName },
                    update: { price, lastUpdate: new Date(), source: 'steam_community' },
                    create: { marketHashName, price, currency: 'BRL', source: 'steam_community' }
                });
                return price;
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
            priceMap.set(item.marketHashName, item.price);
        }
    } catch (error) {
        console.error("[PriceService] Erro na busca em lote:", error);
    }
    return priceMap;
};
