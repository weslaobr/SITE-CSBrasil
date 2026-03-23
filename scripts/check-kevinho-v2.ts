
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const name = "Little Kev | The Professionals";
    console.log(`Checking DB for: ${name}`);
    
    const item = await prisma.itemPriceBase.findUnique({
        where: { marketHashName: name }
    });

    if (item) {
        console.log(JSON.stringify(item, null, 2));
    } else {
        console.log("Item not found in DB.");
    }

    // Also check for the Portuguese name just in case
    const ptItem = await prisma.itemPriceBase.findUnique({
        where: { marketHashName: "Kevinho | Os Profissionais" }
    });
    if (ptItem) {
        console.log("Portuguese name entry found:");
        console.log(JSON.stringify(ptItem, null, 2));
    }
}

main().finally(() => prisma.$disconnect());
