
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const names = [
        "Kevinho | Os Profissionais",
        "Kevinho | The Professionals",
        "Agent | Kevinho | The Professionals"
    ];

    console.log("Searching for Kevinho prices...");
    const prices = await prisma.itemPriceBase.findMany({
        where: {
            marketHashName: { in: names }
        }
    });

    if (prices.length === 0) {
        console.log("No prices found for these names.");
        // Try partial match
        const partial = await prisma.itemPriceBase.findMany({
            where: {
                marketHashName: { contains: 'Kevinho' }
            }
        });
        console.log("Partial matches:");
        partial.forEach(p => console.log(` - [${p.price}] ${p.marketHashName} (${p.currency})` ));
    } else {
        prices.forEach(p => console.log(` - [${p.price}] ${p.marketHashName} (${p.currency})` ));
    }
}

main().finally(() => prisma.$disconnect());
