import axios from 'axios';
import { prisma } from '@/lib/prisma'; // Corrigido a importacao do prisma para poder fazer a comunicação com o Banco

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms. Demora pra atualizar, poupa requisições à Steam

/**
 * Função mock para manter compatibilidade com chamadas antigas que esperavam o objeto completo
 */
export const fetchPrices = async (): Promise<Record<string, number>> => {
    return {}; 
};

/**
 * Busca o preço de um item individual
 * Primeiro verifica a tabela ItemPriceBase. Se o dado existir e for recente, retorna ele.
 * Caso contrário, busca na Steam, salva no Banco e retorna o valor.
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

        // 3. Caso não exista no banco ou passou do TTL, buscar da Steam
        // Adicionamos um pequeno delay aleatório para evitar detecção de bot em massa
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

        const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=7&market_hash_name=${encodeURIComponent(marketHashName)}`;
        
        const response = await axios.get(url, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 10000 
        });

        if (response.data && response.data.success && response.data.lowest_price) {
            let priceStr = response.data.lowest_price;
            priceStr = priceStr.replace('R$', '').trim();
            priceStr = priceStr.replace(/\./g, ''); // Remove separador de milhar
            priceStr = priceStr.replace(',', '.');  // Troca vírgula decimal por ponto
            
            const price = parseFloat(priceStr);
            
            if (!isNaN(price)) {
                // 4. Salvar ou atualizar no Banco
                await prisma.itemPriceBase.upsert({
                    where: { marketHashName },
                    update: { price, lastUpdate: new Date(), source: 'steam_community' },
                    create: { marketHashName, price, currency: 'BRL', source: 'steam_community' }
                });

                return price;
            }
        }
        
    } catch (error: any) {
        // Se der erro 429 (Too Many Requests), logamos mas não travamos
        if (error.response?.status === 429) {
            console.warn(`[PriceService] Rate limit atingido na Steam para "${marketHashName}"`);
        } else {
            console.error(`[PriceService] Erro ao buscar preço de "${marketHashName}":`, error.message);
        }
    }
    
    // Se falhou requisição para a Steam, mas tínhamos dado obsoleto no banco, ainda assim retorna o dado desatualizado pra não ficar N/A
    try {
        const fallbackPrice = await prisma.itemPriceBase.findUnique({
            where: { marketHashName }
        });
        if (fallbackPrice) return fallbackPrice.price;
    } catch (e) {
        // Ignorar
    }

    return null;
};

/**
 * Busca múltiplos preços em lote na tabela ItemPriceBase.
 * Ajuda a reduzir o número de conexões ao banco e acelera o carregamento do inventário.
 */
export const getMultiplePrices = async (marketHashNames: string[]): Promise<Map<string, number | null>> => {
    const priceMap = new Map<string, number | null>();
    
    try {
        const uniqueNames = [...new Set(marketHashNames)];
        
        // Busca do banco todos os que já temos e não estão expirados
        const dbPrices = await prisma.itemPriceBase.findMany({
            where: {
                marketHashName: { in: uniqueNames }
            }
        });

        for (const item of dbPrices) {
            // Só reutilizamos se estiver dentro do TTL
            if (Date.now() - item.lastUpdate.getTime() < CACHE_TTL) {
                priceMap.set(item.marketHashName, item.price);
            }
        }

        return priceMap;
    } catch (error) {
        console.error("[PriceService] Erro na busca em lote:", error);
        return priceMap;
    }
};
