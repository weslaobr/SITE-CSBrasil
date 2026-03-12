const { PrismaClient } = require('@prisma/client');

async function test() {
    const prisma = new PrismaClient();
    try {
        console.log("Checking models...");
        const hasModel = 'userInventoryItem' in prisma;
        console.log("Has UserInventoryItem model:", hasModel);
        
        const models = Object.keys(prisma).filter(m => !m.startsWith('_') && !m.startsWith('$'));
        console.log("Available models:", models);
    } catch (e) {
        console.error("Test failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
