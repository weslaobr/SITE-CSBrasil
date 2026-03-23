
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function getSteamPrice(hashName: string) {
    try {
        const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=1&market_hash_name=${encodeURIComponent(hashName)}`;
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (res.data?.success && res.data.lowest_price) {
            let pStr = res.data.lowest_price.replace('$', '').replace(',', '').trim();
            return parseFloat(pStr);
        }
    } catch (e) {
        console.error(`Error for ${hashName}:`, e.message);
    }
    return null;
}

async function main() {
    const agents = [
        "Little Kev | The Professionals",
        "Sir Bloody Miami Darryl | The Professionals",
        "Sir Bloody Silent Darryl | The Professionals",
        "Sir Bloody Skullhead Darryl | The Professionals",
        "Sir Bloody Loudmouth Darryl | The Professionals",
        "Sir Bloody Darryl Royale | The Professionals",
        "Safecracker Voltzmann | The Professionals",
        "Number K | The Professionals",
        "Getaway Sally | The Professionals"
    ];

    console.log("Repairing Agent prices...");
    for (const name of agents) {
        const price = await getSteamPrice(name);
        if (price) {
            await prisma.itemPriceBase.upsert({
                where: { marketHashName: name },
                update: { price, lastUpdate: new Date(), source: 'steam_manual_repair' },
                create: { marketHashName: name, price, currency: 'USD', source: 'steam_manual_repair' }
            });
            console.log(` ✅ [REPAIRED] ${name}: $${price}`);
        } else {
            console.log(` ❌ [FAILED] ${name}`);
        }
        await new Promise(r => setTimeout(r, 2000)); // Rate limit safety
    }
}

main().finally(() => prisma.$disconnect());
