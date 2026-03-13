import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import axios from "axios";

const CACHE_TTL = 3 * 24 * 60 * 60 * 1000; // 3 dias

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { marketHashName } = await req.json();
        if (!marketHashName) {
            return NextResponse.json({ error: "marketHashName is required" }, { status: 400 });
        }

        // 1. Checar banco primeiro
        const cached = await prisma.itemPriceBase.findUnique({
            where: { marketHashName }
        });

        if (cached && (Date.now() - cached.lastUpdate.getTime() < CACHE_TTL)) {
            return NextResponse.json({ price: cached.price, source: cached.source, cached: true });
        }

        // 2. Buscar da Steam (com delay mínimo no server-side)
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
        
        const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=7&market_hash_name=${encodeURIComponent(marketHashName)}`;
        
        const response = await axios.get(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            },
            timeout: 8000
        });

        if (response.data?.success && response.data.lowest_price) {
            let priceStr: string = response.data.lowest_price;
            priceStr = priceStr.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
            const price = parseFloat(priceStr);

            if (!isNaN(price) && price > 0) {
                await prisma.itemPriceBase.upsert({
                    where: { marketHashName },
                    update: { price, lastUpdate: new Date(), source: 'steam_community' },
                    create: { marketHashName, price, currency: 'BRL', source: 'steam_community' }
                });
                return NextResponse.json({ price, source: 'steam_community', cached: false });
            }
        }

        // Se Steam não retornou nada e tínhamos dado obsoleto, retorna ele
        if (cached) {
            return NextResponse.json({ price: cached.price, source: cached.source, cached: true, stale: true });
        }

        return NextResponse.json({ price: null });
    } catch (error: any) {
        // Rate limit — retorna dado do banco se existir
        if (error.response?.status === 429) {
            const fallback = await prisma.itemPriceBase.findUnique({
                where: { marketHashName: (await req.json().catch(() => ({}))).marketHashName || '' }
            }).catch(() => null);
            if (fallback) {
                return NextResponse.json({ price: fallback.price, source: fallback.source, cached: true, stale: true });
            }
            return NextResponse.json({ price: null, rateLimited: true }, { status: 429 });
        }
        return NextResponse.json({ price: null });
    }
}
