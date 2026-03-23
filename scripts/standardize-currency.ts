
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Standardizing all ItemPriceBase entries to USD...");
    const result = await prisma.itemPriceBase.updateMany({
        where: { currency: 'BRL' },
        data: { currency: 'USD' }
    });
    console.log(`Updated ${result.count} items from BRL to USD.`);
    
    // Specifically fix Little Kev just in case
    await prisma.itemPriceBase.update({
        where: { marketHashName: "Little Kev | The Professionals" },
        data: { price: 71.38, currency: 'USD' }
    });
    console.log("Verified Little Kev is now $71.38 USD.");
}

main().finally(() => prisma.$disconnect());
